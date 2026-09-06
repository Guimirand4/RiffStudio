import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as alphaTab from '@coderline/alphatab';
import styles from './TabViewer.module.css';

export interface TabViewerRef {
  /** Move cursor highlight to a specific beat index (0-based, non-rest beats only). */
  goToBeat: (beatIndex: number) => void;
  /**
   * Get the expected note name at a beat index.
   * Returns null for rest beats (caller must skip them).
   * Returns the LOWEST pitched note in the beat (most audible for pitch detection).
   */
  getNoteAtBeat: (beatIndex: number) => string | null;
  /** Total number of beats in the loaded score (including rests). */
  getTotalBeats: () => number;
  /** Reset highlight to beat 0. */
  reset: () => void;
}

interface TabViewerProps {
  alphaTex: string;
  onScoreLoaded?: (totalBeats: number) => void;
  onError?: (error: string) => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Guitar standard tuning — MIDI for open strings.
 * alphaTab uses 1-indexed strings: 1 = high e, 6 = low E.
 */
const OPEN_STRING_MIDI: Record<number, number> = {
  1: 64, // e4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

function midiToName(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Extract the MIDI number of the lowest note in a beat.
 * "Lowest" = lowest pitch = most audible fundamental for monophonic pitch detection.
 */
function beatToLowestMidi(beat: alphaTab.model.Beat): number | null {
  if (!beat.notes || beat.notes.length === 0) return null;
  let lowestMidi = Infinity;
  for (const note of beat.notes) {
    const openMidi = OPEN_STRING_MIDI[note.string];
    if (openMidi === undefined) continue;
    const midi = openMidi + note.fret;
    if (midi < lowestMidi) lowestMidi = midi;
  }
  return lowestMidi === Infinity ? null : lowestMidi;
}

/**
 * Build a flat array of ALL beats across all tracks/staves/bars/voices.
 * Rests are included — getNoteAtBeat returns null for them, and the Player
 * will auto-skip rest beats.
 */
function buildBeatsArray(score: alphaTab.model.Score): alphaTab.model.Beat[] {
  const beats: alphaTab.model.Beat[] = [];
  // Only process the first track (rhythm guitar or main melody)
  const track = score.tracks[0];
  if (!track) return beats;

  for (const staff of track.staves) {
    for (const bar of staff.bars) {
      // Use voice 0 (main melody voice)
      const voice = bar.voices[0];
      if (!voice) continue;
      for (const beat of voice.beats) {
        beats.push(beat);
      }
    }
  }
  return beats;
}

/**
 * TabViewer — alphaTab wrapper with imperative ref for cursor control.
 *
 * Uses LOCAL copies of alphaTab assets (public/alphatab/) instead of CDN
 * to ensure offline functionality and consistent performance.
 */
export const TabViewer = forwardRef<TabViewerRef, TabViewerProps>(function TabViewer(
  { alphaTex, onScoreLoaded, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const beatsRef = useRef<alphaTab.model.Beat[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current) return;
    setLoadState('loading');

    const settings = new alphaTab.Settings();

    // ── Assets: use local copies ─────────────────────────────────────────────
    // We renamed the .mjs files to .js to prevent MIME type issues inside
    // the Tauri custom protocol (tauri://localhost).
    // Now it works 100% offline inside the native Mac app.
    // ─────────────────────────────────────────────────────────────────────────
    settings.core.scriptFile = '/alphatab/alphaTab.js';
    settings.core.fontDirectory = '/alphatab/font/';
    
    // Disable Web Worker. WebKit (macOS Safari engine used by Tauri) block Web Workers 
    // from being loaded from custom protocols like tauri:// in production builds.
    // Disabling the worker runs alphaTab in the main thread (perfectly fine for simple riffs).
    settings.core.useWorkers = false;

    // Layout: page mode so full tab is visible
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    settings.display.scale = 1.1;

    // ─── Color theme: dark ink on white paper (like real sheet music) ────────
    const black = new alphaTab.model.Color(15,  15,  25,  255);
    const red   = new alphaTab.model.Color(180, 40,  40,  255);
    const gray  = new alphaTab.model.Color(100, 100, 120, 255);

    settings.display.resources.mainGlyphColor     = black;
    settings.display.resources.staffLineColor      = black;
    settings.display.resources.barSeparatorColor   = black;
    settings.display.resources.scoreInfoColor      = black;
    settings.display.resources.barNumberColor      = red;
    settings.display.resources.secondaryGlyphColor = gray;
    // ─────────────────────────────────────────────────────────────────────────

    // Disable built-in player — we control playback
    settings.player.enablePlayer = false;
    settings.player.enableCursor = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Off;

    const api = new alphaTab.AlphaTabApi(containerRef.current, settings);
    apiRef.current = api;

    const onScoreLoadedHandler = (score: alphaTab.model.Score) => {
      const beats = buildBeatsArray(score);
      beatsRef.current = beats;
      setLoadState('loaded');
      onScoreLoaded?.(beats.length);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onErrorHandler = (e: any) => {
      console.error('[alphaTab]', e);
      const msg = String(e.message ?? 'Erro desconhecido ao carregar tablatura');
      setErrorMsg(msg);
      setLoadState('error');
      onError?.(msg);
    };

    api.scoreLoaded.on(onScoreLoadedHandler);
    api.error.on(onErrorHandler);

    // Load the AlphaTex score
    api.tex(alphaTex);

    return () => {
      api.scoreLoaded.off(onScoreLoadedHandler);
      api.error.off(onErrorHandler);
      api.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alphaTex]);

  useImperativeHandle(ref, () => ({
    getNoteAtBeat(beatIndex: number): string | null {
      const beat = beatsRef.current[beatIndex];
      if (!beat) return null;
      // Rest beat — return null so Player can auto-skip
      if (beat.isRest) return null;
      const midi = beatToLowestMidi(beat);
      if (midi === null) return null;
      return midiToName(midi);
    },

    goToBeat(beatIndex: number): void {
      const beat = beatsRef.current[beatIndex];
      if (!beat || !apiRef.current) return;
      // Highlight the beat via alphaTab's cursor system
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiRef.current as any).playbackRange = {
          startTick: beat.absolutePlaybackStart,
          endTick: beat.absolutePlaybackStart + 1,
        };
      } catch {
        // Cursor update may not be available in all alphaTab configs — safe to ignore
      }
    },

    getTotalBeats(): number {
      return beatsRef.current.length;
    },

    reset(): void {
      this.goToBeat(0);
    },
  }));

  return (
    <div className={styles.wrapper}>
      {loadState === 'loading' && (
        <div className={styles.loadingOverlay}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <span className={styles.loadingText}>Carregando tablatura...</span>
        </div>
      )}
      {loadState === 'error' && (
        <div className={styles.errorState}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p>Erro ao carregar tablatura</p>
          <p className={styles.errorDetail}>{errorMsg}</p>
        </div>
      )}
      <div
        ref={containerRef}
        className={styles.container}
        style={{ opacity: loadState === 'loaded' ? 1 : 0 }}
      />
    </div>
  );
});
