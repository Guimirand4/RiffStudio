import { useState, useRef, useCallback, useEffect } from 'react';
import { TabViewer } from './TabViewer';
import type { TabViewerRef } from './TabViewer';
import { PitchFeedback } from './PitchFeedback';
import { NoteHistory } from './NoteHistory';
import { PracticeControls } from './PracticeControls';
import { InputLevelMeter } from './InputLevelMeter';
import { LoopControls } from './LoopControls';
import { ModeToggle, loadViewMode, saveViewMode, PlayModeToggle, loadPlayMode, savePlayMode } from './ModeToggle';
import type { ViewMode, PlayMode } from './ModeToggle';
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

  // ── View & Play mode ───────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [playMode, setPlayMode] = useState<PlayMode>(loadPlayMode);
  const [timeline, setTimeline] = useState<BeatStringNote[]>([]);
  const timelineRef = useRef<BeatStringNote[]>([]);

  // ── Music Mode (Playback) State ────────────────────────────────────────────
  const [playerState, setPlayerState] = useState(0); // 0=paused, 1=playing
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const playbackPositionMsRef = useRef(0);
  const hitBeatsRef = useRef<Set<number>>(new Set());
  const missedBeatsRef = useRef<Set<number>>(new Set());
  const playModeRef = useRef<PlayMode>(playMode);

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
  useEffect(() => { playbackPositionMsRef.current = playbackPositionMs; }, [playbackPositionMs]);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);

  // Handle Play Mode Switch (Mute logic)
  useEffect(() => {
    if (playMode === 'music') {
      tabRef.current?.clearPlaybackRange();
      tabRef.current?.muteTrack(0, true);
    } else {
      tabRef.current?.pause();
      tabRef.current?.muteTrack(0, false);
      tabRef.current?.goToBeat(beatIndexRef.current);
      // Reset hits so they can be played again
      hitBeatsRef.current.clear();
      missedBeatsRef.current.clear();
    }
  }, [playMode]);

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
    if (playModeRef.current === 'practice') {
      tabRef.current?.goToBeat(idx);
    }
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
    hitBeatsRef.current.clear();
    missedBeatsRef.current.clear();
  }, [advanceTo, song.bpm]);

  // ── Music Mode Callbacks ───────────────────────────────────────────────────
  const handlePlayerStateChanged = useCallback((args: any) => {
    // alphaTab sometimes passes the state directly, or in an args object
    const newState = args?.state !== undefined ? args.state : args;
    setPlayerState(prev => {
      // Song just ended (was playing, now stopped) — reset so notes look fresh on next play
      if (prev === 1 && newState === 0) {
        hitBeatsRef.current.clear();
        missedBeatsRef.current.clear();
        setPlaybackPositionMs(0);
        setCurrentBeatIndex(0);
        beatIndexRef.current = 0;
        setExpectedNote(tabRef.current?.getNoteAtBeat(0) ?? null);
      }
      return newState;
    });
  }, []);

  const handlePlayerPositionChanged = useCallback((args: any) => {
    if (playMode !== 'music') return;
    const currentMs = args.currentTime;
    setPlaybackPositionMs(currentMs);

    // 1. Check for Misses (beats that passed 200ms ago without being hit)
    const newMisses: NoteResult[] = [];
    for (let i = 0; i < timelineRef.current.length; i++) {
      const beat = timelineRef.current[i];
      if (beat.isRest || hitBeatsRef.current.has(i) || missedBeatsRef.current.has(i)) continue;
      
      // If we are past the beat by > 200ms
      if (currentMs > beat.timePositionMs + 200) {
        missedBeatsRef.current.add(i);
        const expNote = tabRef.current?.getNoteAtBeat(i) ?? '?';
        newMisses.push({
          beatIndex: i,
          expectedNote: expNote,
          detectedNote: '-',
          correct: false,
          timingMs: 999, // indicates Miss
        });
      } else {
        // Since timeline is sorted, we can stop searching if we reach future beats
        break;
      }
    }

    if (newMisses.length > 0) {
      setSessionStats(prev => ({
        ...prev,
        notesAttempted: prev.notesAttempted + newMisses.length,
        noteResults: [...prev.noteResults, ...newMisses],
      }));
    }

    // 2. Update visual cursor to the beat we are currently on/passing
    let newBeatIdx = beatIndexRef.current;
    for (let i = beatIndexRef.current; i < timelineRef.current.length; i++) {
      if (timelineRef.current[i].timePositionMs <= currentMs) {
        newBeatIdx = i;
      } else {
        break;
      }
    }
    
    if (newBeatIdx !== beatIndexRef.current) {
      setCurrentBeatIndex(newBeatIdx);
      beatIndexRef.current = newBeatIdx;
      setExpectedNote(tabRef.current?.getNoteAtBeat(newBeatIdx) ?? null);
    }
  }, [playMode]);

  /** Core matching handler — called on noteOnset events only. */
  const handleNoteOnset = useCallback((e: CustomEvent<DetectedNote>) => {
    if (!isListeningRef.current) return;
    if (playMode === 'practice' && performance.now() < refractoryUntilRef.current) return;

    const detected = e.detail;
    const tolerance = toleranceRef.current;
    const onsetTime = performance.now();

    // ── MUSIC MODE MATCHING ──
    if (playMode === 'music') {
      const currentMs = playbackPositionMsRef.current;
      let nearestBeat: BeatStringNote | null = null;
      let minDiff = Infinity;
      
      // Find nearest active, un-hit beat within a 200ms window
      for (const beat of timelineRef.current) {
        if (beat.isRest || hitBeatsRef.current.has(beat.beatIndex) || missedBeatsRef.current.has(beat.beatIndex)) continue;
        const diff = Math.abs(currentMs - beat.timePositionMs);
        if (diff < minDiff && diff <= 200) {
          minDiff = diff;
          nearestBeat = beat;
        }
      }

      if (!nearestBeat) return; // No beat in window, ignore onset

      const expNoteName = tabRef.current?.getNoteAtBeat(nearestBeat.beatIndex) ?? null;
      if (!expNoteName) return;

      const result = matchNote(detected, { noteName: expNoteName, beatIndex: nearestBeat.beatIndex }, tolerance);
      
      if (result.isMatch) {
        hitBeatsRef.current.add(nearestBeat.beatIndex);
        const timingDiffMs = Math.round(currentMs - nearestBeat.timePositionMs);
        
        // Trigger arcade flash
        const beatStrings = nearestBeat.notes.map((n) => n.stringNumber);
        setLastHit({
          id: ++hitIdRef.current,
          correct: true,
          timingMs: Math.abs(timingDiffMs),
          strings: beatStrings,
          matchResult: result,
        });

        // Record stats
        setSessionStats(prev => {
          const newResult: NoteResult = {
            beatIndex: nearestBeat!.beatIndex,
            expectedNote: expNoteName,
            detectedNote: detected.noteName,
            correct: true,
            timingMs: timingDiffMs,
          };
          const newResults = [...prev.noteResults, newResult];
          const correctHits = newResults.filter(r => r.correct);
          const avgTiming = correctHits.length > 0
            ? Math.round(correctHits.reduce((sum, r) => sum + r.timingMs, 0) / correctHits.length)
            : 0;
          return {
            ...prev,
            notesAttempted: prev.notesAttempted + 1,
            notesCorrect: prev.notesCorrect + 1,
            avgTimingMs: avgTiming,
            noteResults: newResults,
          };
        });
      }
      return;
    }

    // ── PRACTICE MODE MATCHING ──
    const beatIndex = beatIndexRef.current;

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
  }, [advanceTo, playMode]);

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
    hitBeatsRef.current.clear();
    missedBeatsRef.current.clear();
    
    if (playMode === 'music') {
      tabRef.current?.play(); // auto play on restart in music mode
    }
  }, [advanceTo, playMode]);

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
        {/* Mode toggles */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <PlayModeToggle
            mode={playMode}
            onChange={(m) => { setPlayMode(m); savePlayMode(m); }}
          />
          <ModeToggle
            mode={viewMode}
            arcadeReady={timeline.length > 0}
            onChange={(m) => { setViewMode(m); saveViewMode(m); }}
          />
        </div>
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
              onPlayerStateChanged={handlePlayerStateChanged}
              onPlayerPositionChanged={handlePlayerPositionChanged}
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
                isActive={
                  (playMode === 'practice' && listeningState === 'running') ||
                  (playMode === 'music' && playerState === 1)
                }
                lastHit={lastHit}
                playbackPositionMs={playMode === 'music' ? playbackPositionMs : (timeline[currentBeatIndex]?.timePositionMs ?? 0)}
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

          {/* Music Mode Controls */}
          {playMode === 'music' && (
            <div className={styles.musicControls}>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#ffb86c', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 184, 108, 0.1)', padding: '8px', borderRadius: '4px' }}>
                <span>🎧</span>
                <span>Use fones de ouvido para evitar que o microfone ouça a música.</span>
              </div>
              <button
                className={`btn btn-lg ${playerState === 1 ? 'btn-danger' : 'btn-primary'}`}
                style={{ width: '100%', marginBottom: '8px' }}
                onClick={() => {
                  if (listeningState === 'idle') startListening(); // Auto start mic
                  tabRef.current?.playPause();
                }}
              >
                {playerState === 1 ? '⏸ Pausar Música' : '▶️ Tocar Música'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Velocidade:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => {
                    const speed = Number(e.target.value);
                    setPlaybackSpeed(speed);
                    tabRef.current?.setPlaybackSpeed(speed);
                  }}
                  style={{ background: 'var(--bg-elevated)', color: '#fff', border: '1px solid var(--border-card)', borderRadius: '4px', padding: '4px' }}
                >
                  <option value={0.5}>50%</option>
                  <option value={0.75}>75%</option>
                  <option value={1}>100%</option>
                  <option value={1.25}>125%</option>
                </select>
              </div>
            </div>
          )}

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
