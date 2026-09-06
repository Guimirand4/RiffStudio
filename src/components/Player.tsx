import { useState, useRef, useCallback, useEffect } from 'react';
import { TabViewer } from './TabViewer';
import type { TabViewerRef } from './TabViewer';
import { PitchFeedback } from './PitchFeedback';
import { NoteHistory } from './NoteHistory';
import { PracticeControls } from './PracticeControls';
import { InputLevelMeter } from './InputLevelMeter';
import { LoopControls } from './LoopControls';
import { ModeToggle, loadViewMode, saveViewMode } from './ModeToggle';
import type { ViewMode } from './ModeToggle';
import { NoteHighway } from './NoteHighway';
import type { HitFeedback } from './NoteHighway';
import type { BeatStringNote } from '../lib/beatTimeline';
import { getAudioEngine, resetAudioEngine } from '../audio/audioEngine';
import type { DetectedNote } from '../audio/pitchDetector';
import { matchNote } from '../lib/noteMatcher';
import type { Song } from '../lib/songLibrary';
import styles from './Player.module.css';

interface PlayerProps {
  song: Song;
  onBack: () => void;
}

/** Individual note attempt record — used for timing score & session summary. */
export interface NoteResult {
  beatIndex: number;
  expectedNote: string;
  detectedNote: string;
  correct: boolean;
  timingMs: number;   // positive = late, negative = early (relative to onset of expected beat)
}

export interface SessionStats {
  notesAttempted: number;
  notesCorrect: number;
  startTime: number | null;
  avgTimingMs: number;      // average timing deviation (ms)
  noteResults: NoteResult[]; // full history for this session
}

type ListeningState = 'idle' | 'loading' | 'running' | 'error';

/**
 * Player — practice session orchestrator.
 *
 * Matching loop:
 *   noteOnset → matchNote → isMatch? advance cursor (skipping rests, respecting A-B loop)
 *
 * Timing score:
 *   When cursor advances to a new beat, record `expectedTimestamp = now`.
 *   When noteOnset fires, `timingMs = now - expectedTimestamp`.
 *   Positive = late, negative = early.
 *
 * Loop A-B:
 *   Mark A (start) and B (end) beat indices.
 *   When cursor would advance past B, it jumps back to A instead.
 */
export function Player({ song, onBack }: PlayerProps) {
  const tabRef = useRef<TabViewerRef>(null);

  // ── Navigation state ───────────────────────────────────────────────────────
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);
  const [expectedNote, setExpectedNote] = useState<string | null>(null);

  // ── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [timeline, setTimeline] = useState<BeatStringNote[]>([]);
  const timelineRef = useRef<BeatStringNote[]>([]);

  // ── Arcade feedback ────────────────────────────────────────────────────────
  const [lastHit, setLastHit] = useState<HitFeedback | null>(null);
  const hitIdRef = useRef(0);

  // ── Audio state ────────────────────────────────────────────────────────────
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [toleranceCents, setToleranceCents] = useState(50);

  // ── Loop A-B state ─────────────────────────────────────────────────────────
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [loopActive, setLoopActive] = useState(false);

  // ── Session stats ──────────────────────────────────────────────────────────
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    notesAttempted: 0,
    notesCorrect: 0,
    startTime: null,
    avgTimingMs: 0,
    noteResults: [],
  });

  // ── Refs (avoid stale closures in event handlers) ──────────────────────────
  const beatIndexRef = useRef(0);
  const totalBeatsRef = useRef(0);
  const toleranceRef = useRef(toleranceCents);
  const loopARef = useRef<number | null>(null);
  const loopBRef = useRef<number | null>(null);
  const loopActiveRef = useRef(false);
  const isListeningRef = useRef(false);
  const refractoryUntilRef = useRef(0);
  const expectedTimestampRef = useRef<number>(0); // when current beat became "expected"

  const REFRACTORY_MS = 300;

  // Sync refs with state
  useEffect(() => { beatIndexRef.current = currentBeatIndex; }, [currentBeatIndex]);
  useEffect(() => { totalBeatsRef.current = totalBeats; }, [totalBeats]);
  useEffect(() => { toleranceRef.current = toleranceCents; }, [toleranceCents]);
  useEffect(() => { loopARef.current = loopA; }, [loopA]);
  useEffect(() => { loopBRef.current = loopB; }, [loopB]);
  useEffect(() => { loopActiveRef.current = loopActive; }, [loopActive]);

  const engine = getAudioEngine();

  /**
   * Advance cursor to `targetIndex`, skipping rests.
   * If loop A-B is active and we exceed loopB, wrap to loopA.
   */
  const advanceTo = useCallback((targetIndex: number) => {
    let idx = targetIndex;
    const total = totalBeatsRef.current;
    if (total === 0) return;

    const lA = loopARef.current;
    const lB = loopBRef.current;
    const looping = loopActiveRef.current && lA !== null && lB !== null;

    // Loop wrap: if active and we'd go past B, jump back to A
    if (looping && idx > lB!) {
      idx = lA!;
    } else if (idx >= total) {
      // Song end: restart from 0
      idx = 0;
    }

    // Skip rests
    const startIdx = idx;
    while (idx < total && tabRef.current?.getNoteAtBeat(idx) === null) {
      idx++;
      // Loop wrap within the rest-skip logic
      if (looping && idx > lB!) {
        idx = lA!;
      }
      if (idx >= total || idx === startIdx) break; // prevent infinite loop
    }

    const note = tabRef.current?.getNoteAtBeat(idx) ?? null;
    setExpectedNote(note);
    tabRef.current?.goToBeat(idx);
    setCurrentBeatIndex(idx);
    beatIndexRef.current = idx;

    // Record when this beat became "expected" for timing score
    expectedTimestampRef.current = performance.now();
  }, []);

  const handleScoreLoaded = useCallback((beats: number) => {
    setTotalBeats(beats);
    totalBeatsRef.current = beats;
    advanceTo(0);
    // Build the arcade timeline once, right after the score is parsed.
    // tabRef.getTimeline() reads from beatsRef inside TabViewer — always fresh.
    const tl = tabRef.current?.getTimeline(song.bpm) ?? [];
    timelineRef.current = tl;
    setTimeline(tl);
  }, [advanceTo, song.bpm]);

  /** Core matching handler — called on noteOnset events only. */
  const handleNoteOnset = useCallback((e: CustomEvent<DetectedNote>) => {
    if (!isListeningRef.current) return;
    if (performance.now() < refractoryUntilRef.current) return;

    const detected = e.detail;
    const beatIndex = beatIndexRef.current;
    const tolerance = toleranceRef.current;
    const onsetTime = performance.now();

    const expNoteName = tabRef.current?.getNoteAtBeat(beatIndex) ?? null;
    if (!expNoteName) {
      advanceTo(beatIndex + 1);
      return;
    }

    const result = matchNote(
      detected,
      { noteName: expNoteName, beatIndex },
      tolerance,
    );

    // Timing delta: how late/early relative to when the beat was set as expected
    const timingMs = Math.round(onsetTime - expectedTimestampRef.current);

    const noteResult: NoteResult = {
      beatIndex,
      expectedNote: expNoteName,
      detectedNote: detected.noteName,
      correct: result.isMatch,
      timingMs,
    };

    // ── Arcade feedback ──────────────────────────────────────────────────────
    // Get string numbers for the current expected beat (for lane flash in NoteHighway)
    const beatStrings = timelineRef.current[beatIndex]?.notes.map((n) => n.stringNumber) ?? [];
    const label = result.isMatch
      ? timingMs < 80 ? 'Perfect! ✨' : timingMs < 160 ? 'Bom! 👍' : 'OK'
      : 'Errou!';
    void label; // used inside NoteHighway via HitFeedback.strings
    setLastHit({
      id: ++hitIdRef.current,
      correct: result.isMatch,
      timingMs,
      strings: beatStrings,
      matchResult: result,
    });

    setSessionStats((prev) => {
      const newResults = [...prev.noteResults, noteResult];
      const total = newResults.length;
      const correct = newResults.filter(r => r.correct).length;
      // Average timing of correct hits only (wrong notes have meaningless timing)
      const correctHits = newResults.filter(r => r.correct);
      const avgTiming = correctHits.length > 0
        ? Math.round(correctHits.reduce((sum, r) => sum + r.timingMs, 0) / correctHits.length)
        : 0;

      return {
        notesAttempted: total,
        notesCorrect: correct,
        startTime: prev.startTime,
        avgTimingMs: avgTiming,
        noteResults: newResults,
      };
    });

    if (result.isMatch) {
      refractoryUntilRef.current = performance.now() + REFRACTORY_MS;
      advanceTo(beatIndex + 1);
    }
  }, [advanceTo]);

  // ── Audio controls ─────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    setListeningState('loading');
    setAudioError(null);
    try {
      await engine.start();
      window.addEventListener('noteOnset', handleNoteOnset as EventListener);
      isListeningRef.current = true;
      refractoryUntilRef.current = 0;
      expectedTimestampRef.current = performance.now();
      setListeningState('running');
      setSessionStats(prev => ({
        ...prev,
        startTime: prev.startTime ?? Date.now(),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao acessar microfone';
      setAudioError(msg);
      setListeningState('error');
    }
  }, [engine, handleNoteOnset]);

  const stopListening = useCallback(() => {
    window.removeEventListener('noteOnset', handleNoteOnset as EventListener);
    engine.stop();
    isListeningRef.current = false;
    setListeningState('idle');
  }, [engine, handleNoteOnset]);

  const handleToggleListening = useCallback(() => {
    if (listeningState === 'running') {
      stopListening();
    } else {
      startListening();
    }
  }, [listeningState, startListening, stopListening]);

  const handleRestart = useCallback(() => {
    refractoryUntilRef.current = 0;
    advanceTo(0);
    setSessionStats({ notesAttempted: 0, notesCorrect: 0, startTime: Date.now(), avgTimingMs: 0, noteResults: [] });
    setLastHit(null);
    hitIdRef.current = 0;
  }, [advanceTo]);

  // ── Loop A-B handlers ──────────────────────────────────────────────────────
  const handleMarkA = useCallback(() => {
    const idx = beatIndexRef.current;
    setLoopA(idx);
    loopARef.current = idx;
    // Clear B if it's before new A
    if (loopBRef.current !== null && loopBRef.current <= idx) {
      setLoopB(null);
      loopBRef.current = null;
      setLoopActive(false);
      loopActiveRef.current = false;
    }
  }, []);

  const handleMarkB = useCallback(() => {
    const idx = beatIndexRef.current;
    // B must be strictly after A
    if (loopARef.current !== null && idx > loopARef.current) {
      setLoopB(idx);
      loopBRef.current = idx;
    }
  }, []);

  const handleToggleLoop = useCallback(() => {
    setLoopActive(prev => {
      loopActiveRef.current = !prev;
      return !prev;
    });
  }, []);

  const handleClearLoop = useCallback(() => {
    setLoopA(null);
    setLoopB(null);
    setLoopActive(false);
    loopARef.current = null;
    loopBRef.current = null;
    loopActiveRef.current = false;
  }, []);

  const handleBack = useCallback(() => {
    stopListening();
    resetAudioEngine();
    onBack();
  }, [stopListening, onBack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('noteOnset', handleNoteOnset as EventListener);
      if (engine.isRunning) engine.stop();
      isListeningRef.current = false;
    };
  }, [engine, handleNoteOnset]);

  const progress = totalBeats > 0 ? (currentBeatIndex / totalBeats) * 100 : 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button id="back-to-library" className="btn btn-ghost" onClick={handleBack}>
          ← Biblioteca
        </button>
        <div className={styles.songInfo}>
          <h1 className={styles.songTitle}>{song.title}</h1>
          <span className={styles.songArtist}>{song.artist}</span>
        </div>
        {/* Mode toggle — center-right of header */}
        <ModeToggle
          mode={viewMode}
          arcadeReady={timeline.length > 0}
          onChange={(m) => { setViewMode(m); saveViewMode(m); }}
        />
        <div className={styles.bpm}>
          <span className={styles.bpmValue}>{song.bpm}</span>
          <span className={styles.bpmLabel}>BPM</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        <span className={styles.progressLabel}>
          {totalBeats > 0 ? `Nota ${currentBeatIndex + 1} / ${totalBeats}` : 'Carregando...'}
        </span>
      </div>

      {/* Main layout */}
      <div className={styles.layout}>
        {/* Tab viewer / Arcade — same DOM slot, crossfade between modes */}
        <div className={styles.tabArea} style={{ position: 'relative' }}>
          {/* TabViewer stays mounted even in arcade mode so its beatsRef/cursor stay live */}
          <div
            style={{
              opacity: viewMode === 'arcade' ? 0 : 1,
              pointerEvents: viewMode === 'arcade' ? 'none' : 'auto',
              transition: 'opacity 0.25s ease',
              height: viewMode === 'arcade' ? 0 : 'auto',
              overflow: viewMode === 'arcade' ? 'hidden' : 'visible',
            }}
          >
            <TabViewer
              ref={tabRef}
              alphaTex={song.alphaTex}
              onScoreLoaded={handleScoreLoaded}
              onError={(err) => setAudioError(err)}
            />
          </div>

          {/* NoteHighway — rendered in arcade mode once timeline is ready */}
          {timeline.length > 0 && (
            <div
              style={{
                opacity: viewMode === 'arcade' ? 1 : 0,
                pointerEvents: viewMode === 'arcade' ? 'auto' : 'none',
                transition: 'opacity 0.25s ease',
                position: viewMode === 'arcade' ? 'relative' : 'absolute',
                inset: 0,
                height: viewMode === 'arcade' ? '100%' : 0,
                overflow: 'hidden',
                minHeight: viewMode === 'arcade' ? 340 : 0,
              }}
            >
              <NoteHighway
                timeline={timeline}
                currentBeatIndex={currentBeatIndex}
                bpm={song.bpm}
                isActive={listeningState === 'running'}
                lastHit={lastHit}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className={styles.sidebar}>
          {/* Input level meter */}
          {listeningState === 'running' && <InputLevelMeter />}

          {/* Pitch feedback */}
          <PitchFeedback
            expectedNote={listeningState === 'running' ? expectedNote : null}
            toleranceCents={toleranceCents}
          />

          {/* Loop A-B controls */}
          <LoopControls
            loopA={loopA}
            loopB={loopB}
            loopActive={loopActive}
            currentBeat={currentBeatIndex}
            totalBeats={totalBeats}
            isListening={listeningState === 'running'}
            onMarkA={handleMarkA}
            onMarkB={handleMarkB}
            onToggleLoop={handleToggleLoop}
            onClearLoop={handleClearLoop}
          />

          {/* Note history */}
          <NoteHistory
            expectedNote={listeningState === 'running' ? expectedNote : null}
            toleranceCents={toleranceCents}
          />

          {/* Controls + stats */}
          <PracticeControls
            toleranceCents={toleranceCents}
            onToleranceChange={setToleranceCents}
            isListening={listeningState === 'running'}
            onToggleListening={handleToggleListening}
            isLoading={listeningState === 'loading'}
            sessionStats={sessionStats}
            onRestart={handleRestart}
          />

          {/* Error display */}
          {audioError && (
            <div className={styles.errorBox}>
              <strong>⚠️ Erro de áudio:</strong>
              <p>{audioError}</p>
              {(audioError.toLowerCase().includes('permission') ||
                audioError.toLowerCase().includes('denied')) && (
                <p>
                  Verifique: <strong>Preferências → Privacidade → Microfone</strong>
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
