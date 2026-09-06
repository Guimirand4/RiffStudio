/**
 * noteUtils.ts
 * 
 * Utilities for converting between frequencies, MIDI note numbers,
 * note names, and cents deviation. All calculations use equal temperament
 * (A4 = 440Hz standard).
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQ = 440.0;
const A4_MIDI = 69;

/**
 * Convert frequency (Hz) to MIDI note number.
 * Returns a fractional MIDI number (use Math.round for the nearest note).
 */
export function freqToMidi(freq: number): number {
  return 12 * Math.log2(freq / A4_FREQ) + A4_MIDI;
}

/**
 * Convert MIDI note number to frequency (Hz).
 */
export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Convert MIDI note number to note name with octave.
 * Example: 40 → "E2", 69 → "A4", 64 → "E4"
 */
export function midiToNoteName(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Convert note name to MIDI number.
 * Supports: "E2", "A#3", "Bb4" (flats converted to sharps)
 */
export function noteNameToMidi(noteName: string): number {
  // Normalize flats to sharps
  const normalized = noteName
    .replace('Bb', 'A#')
    .replace('Eb', 'D#')
    .replace('Ab', 'G#')
    .replace('Db', 'C#')
    .replace('Gb', 'F#');

  const match = normalized.match(/^([A-G]#?)(\d+)$/);
  if (!match) throw new Error(`Invalid note name: ${noteName}`);

  const noteIndex = NOTE_NAMES.indexOf(match[1]);
  const octave = parseInt(match[2], 10);
  if (noteIndex === -1) throw new Error(`Invalid note: ${match[1]}`);

  return (octave + 1) * 12 + noteIndex;
}

/**
 * Calculate how many cents a frequency deviates from the nearest equal-temperament note.
 * Returns a value from -50 to +50 cents.
 */
export function frequencyToCents(freq: number): { midi: number; noteName: string; cents: number } {
  const exactMidi = freqToMidi(freq);
  const roundedMidi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - roundedMidi) * 100);
  const noteName = midiToNoteName(roundedMidi);
  return { midi: roundedMidi, noteName, cents };
}

/**
 * Guitar strings standard tuning — MIDI numbers for open strings.
 * Index 0 = string 1 (high E), index 5 = string 6 (low E).
 */
export const GUITAR_OPEN_STRINGS: Record<number, { name: string; midi: number }> = {
  1: { name: 'E4', midi: 64 }, // high e
  2: { name: 'B3', midi: 59 },
  3: { name: 'G3', midi: 55 },
  4: { name: 'D3', midi: 50 },
  5: { name: 'A2', midi: 45 },
  6: { name: 'E2', midi: 40 }, // low E
};

/**
 * Calculate MIDI note from guitar string + fret.
 */
export function guitarNoteToMidi(stringNum: number, fret: number): number {
  const openString = GUITAR_OPEN_STRINGS[stringNum];
  if (!openString) throw new Error(`Invalid string number: ${stringNum}`);
  return openString.midi + fret;
}

/**
 * Check if two MIDI notes are enharmonically equivalent
 * (same pitch, different names — e.g., C# and Db).
 */
export function areSameNote(midi1: number, midi2: number): boolean {
  return ((midi1 % 12) + 12) % 12 === ((midi2 % 12) + 12) % 12;
}
