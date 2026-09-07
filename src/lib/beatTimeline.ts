/**
 * beatTimeline.ts
 *
 * Pure function that converts an alphaTab Beat[] (already extracted by TabViewer)
 * into a typed BeatStringNote[] timeline with per-beat temporal positions.
 *
 * WHY: The existing TabViewer only exposes getNoteAtBeat(idx) → string | null,
 * which is enough for the cursor-based tablature mode but not for the Arcade
 * (Note Highway) mode that needs: string number, time position, and duration of
 * every note so it can place them on a canvas timeline.
 *
 * Design choice: alphaTab beats have absolutePlaybackStart and playbackDuration
 * in ticks (960 ticks per quarter note). Converting via BPM gives accurate ms
 * positions that handle dots, triplets and ties without any extra logic.
 *
 * Clock model: the Arcade mode uses a PLAYER-DRIVEN clock (Option A).
 * The current expected beat is always anchored to the hit line; future beats are
 * shown to its right spaced by their time deltas. Notes don't scroll in real time
 * — they advance only when the player hits a correct note. This matches the
 * existing tablature mode philosophy (no metrônomo, player sets the pace).
 *
 * Future Option B (real-time metrônomo): start a session clock on "Começar Treino",
 * compute elapsed = performance.now() - sessionStartMs, and position all beats
 * relative to elapsed instead of currentBeatIndex. When elapsed passes a beat's
 * timePositionMs and it hasn't been hit, mark it as missed. This is a self-contained
 * change in NoteHighway — beatTimeline.ts doesn't need to change.
 */

import type * as alphaTab from '@coderline/alphatab';

export interface BeatStringNote {
  beatIndex: number;

  /** Milliseconds from the start of the song (tick-based, accurate for dots/triplets). */
  timePositionMs: number;

  /** Duration of the beat in ms. Minimum 50ms even for very short notes. */
  durationMs: number;

  /** True for rest beats (no notes to play). */
  isRest: boolean;

  /**
   * All notes in this beat (one entry per note — chords have multiple entries).
   * Sorted lowest-to-highest MIDI for consistency.
   */
  notes: BeatNote[];
}

export interface BeatNote {
  /** 1-based string index (alphaTab convention): 1 = high e, 6 = low E. */
  stringNumber: number;
  fret: number;
  noteName: string;   // e.g. "E2", "A4"
  midiNumber: number;
  finger?: number;    // 0 = open, 1 = index, 2 = middle, 3 = ring, 4 = pinky
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** alphaTab uses 960 ticks per quarter note throughout. */
const TICKS_PER_QUARTER = 960;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Standard guitar tuning — MIDI for open strings. 1=high e, 6=low E. */
const OPEN_STRING_MIDI: Record<number, number> = {
  1: 64, // e4
  2: 59, // B3
  3: 55, // G3
  4: 50, // D3
  5: 45, // A2
  6: 40, // E2
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function midiToName(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build a BeatStringNote[] from the flat beat array that TabViewer already maintains.
 *
 * @param beats - result of buildBeatsArray() inside TabViewer (via beatsRef)
 * @param bpm   - song tempo in BPM (from Song metadata, matches \tempo in .alphatex)
 */
export function extractBeatTimeline(
  beats: alphaTab.model.Beat[],
  bpm: number,
): BeatStringNote[] {
  // msPerTick: how many milliseconds one alphaTab tick represents at this BPM.
  const msPerTick = 60_000 / (bpm * TICKS_PER_QUARTER);
  let currentPosition = 1;

  return beats.map((beat, beatIndex) => {
    const timePositionMs = beat.absolutePlaybackStart * msPerTick;
    const durationMs = Math.max(beat.playbackDuration * msPerTick, 50);
    const isRest = beat.isRest || !beat.notes || beat.notes.length === 0;

    const notes: BeatNote[] = isRest
      ? []
      : beat.notes
          .filter((n) => OPEN_STRING_MIDI[n.string] !== undefined)
          .map((n) => {
            const openMidi = OPEN_STRING_MIDI[n.string];
            const midiNumber = openMidi + n.fret;

            // --- Fingering Heuristic ---
            let finger = 0; // 0 = open string
            if (n.fret > 0) {
              if (n.fret >= currentPosition && n.fret <= currentPosition + 3) {
                finger = n.fret - currentPosition + 1;
              } else {
                currentPosition = n.fret;
                finger = 1; // Index leads the new position
              }
            }

            return {
              stringNumber: n.string,
              fret: n.fret,
              noteName: midiToName(midiNumber),
              midiNumber,
              finger,
            };
          })
          // Sort by MIDI ascending so the "match note" logic (lowest = expected) is consistent
          .sort((a, b) => a.midiNumber - b.midiNumber);

    return { beatIndex, timePositionMs, durationMs, isRest, notes };
  });
}
