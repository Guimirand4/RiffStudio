/**
 * noteMatcher.ts
 *
 * Compares a detected note against the expected note from the tab cursor.
 *
 * Match criteria:
 *   1. Same pitch class (note name, ignoring octave) — handles octave errors from pitch tracker
 *   2. Cents deviation within tolerance band
 *
 * Octave handling:
 *   Guitar pitch trackers occasionally detect a harmonic instead of the fundamental,
 *   reporting the note 1–2 octaves above what was actually played. For the MVP we
 *   use pitch-class matching (same note name, any octave) to tolerate this.
 *   This is configurable via strictOctave=true when you want exact-octave matching.
 *
 * The caller (Player) is responsible for calling this only on onset events —
 * the timing/debounce logic lives there, not here.
 */

import type { DetectedNote } from '../audio/pitchDetector';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface ExpectedNote {
  noteName: string;    // e.g. "E2" — extracted from tab string+fret
  beatIndex: number;
  // midiNumber is computed internally from noteName
}

export interface MatchResult {
  isMatch: boolean;
  detectedNote: string;    // e.g. "E2"
  expectedNote: string;    // e.g. "E2"
  centsOff: number;        // detected.cents (deviation from nearest equal-temp note)
  pitchClassMatch: boolean;// same note name (ignoring octave)
  octaveError: boolean;    // same pitch class but different octave (common with harmonics)
  midiDelta: number;       // semitone difference (0 = same, 12 = octave, etc.)
}

/** Parse note name to pitch class index (0=C, 1=C#, …, 11=B). */
function noteNameToPitchClass(noteName: string): number {
  const normalized = noteName
    .replace('Bb', 'A#').replace('Eb', 'D#')
    .replace('Ab', 'G#').replace('Db', 'C#').replace('Gb', 'F#');
  const match = normalized.match(/^([A-G]#?)/);
  if (!match) return -1;
  return NOTE_NAMES.indexOf(match[1]);
}

/** Parse note name to MIDI number. */
function noteNameToMidi(noteName: string): number {
  const normalized = noteName
    .replace('Bb', 'A#').replace('Eb', 'D#')
    .replace('Ab', 'G#').replace('Db', 'C#').replace('Gb', 'F#');
  const match = normalized.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 0;
  const noteIndex = NOTE_NAMES.indexOf(match[1]);
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + noteIndex;
}

/**
 * Compare detected note to expected note.
 *
 * @param detected       - From PitchDetector (has noteName, midiNumber, cents, clarity)
 * @param expected       - From TabViewer.getNoteAtBeat() (has noteName, beatIndex)
 * @param toleranceCents - Max allowed cents deviation (default 50)
 * @param strictOctave   - If true, octave must also match (default false)
 */
export function matchNote(
  detected: DetectedNote,
  expected: ExpectedNote,
  toleranceCents = 50,
  strictOctave = false,
): MatchResult {
  const detectedPitchClass = noteNameToPitchClass(detected.noteName);
  const expectedPitchClass = noteNameToPitchClass(expected.noteName);
  const expectedMidi = noteNameToMidi(expected.noteName);

  const pitchClassMatch = detectedPitchClass !== -1 &&
    detectedPitchClass === expectedPitchClass;

  const midiDelta = Math.abs(detected.midiNumber - expectedMidi);
  const octaveError = pitchClassMatch && midiDelta > 0 && midiDelta % 12 === 0;

  const centsOk = Math.abs(detected.cents) <= toleranceCents;

  let isMatch: boolean;
  if (strictOctave) {
    // Must be exact MIDI note AND within tolerance
    isMatch = midiDelta === 0 && centsOk;
  } else {
    // Pitch class must match (any octave) AND cents within tolerance
    // This tolerates the common 1-octave harmonic error from pitch trackers
    isMatch = pitchClassMatch && centsOk;
  }

  return {
    isMatch,
    detectedNote: detected.noteName,
    expectedNote: expected.noteName,
    centsOff: detected.cents,
    pitchClassMatch,
    octaveError,
    midiDelta,
  };
}

/**
 * Human-readable description of the match result (for debug/feedback display).
 */
export function matchDescription(result: MatchResult): string {
  if (result.isMatch) {
    if (Math.abs(result.centsOff) < 10) return 'Perfeito!';
    if (Math.abs(result.centsOff) < 25) return 'Muito bom!';
    return 'Acertou!';
  }
  if (result.octaveError) {
    return result.midiDelta > 0
      ? `Oitava acima (${result.detectedNote} vs ${result.expectedNote})`
      : `Oitava abaixo (${result.detectedNote} vs ${result.expectedNote})`;
  }
  if (result.pitchClassMatch && !result.isMatch) {
    return result.centsOff > 0 ? 'Um pouco agudo' : 'Um pouco grave';
  }
  return `Nota errada — detectou ${result.detectedNote}, esperado ${result.expectedNote}`;
}
