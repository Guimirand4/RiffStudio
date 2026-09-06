/**
 * pitchDetector.ts
 *
 * Wrapper around pitchy's McLeod Pitch Method detector.
 * Converts raw Float32Array audio buffers into detected musical notes.
 *
 * The McLeod Pitch Method (MPM) is accurate for monophonic signals like
 * single guitar notes. Clarity < 0.85 should be treated as "no note detected"
 * since it likely indicates silence, noise, or a chord.
 */

import { PitchDetector as PitchyDetector } from 'pitchy';
import { frequencyToCents } from '../lib/noteUtils';

export interface DetectedNote {
  frequency: number;   // Hz
  noteName: string;    // e.g. "E2", "A4"
  midiNumber: number;  // MIDI note number
  cents: number;       // deviation from equal temperament, -50 to +50
  clarity: number;     // confidence 0–1 from the pitch algorithm
  timestamp: number;   // performance.now() when detected
}

export const MIN_CLARITY = 0.85;  // below this → discard as noise/silence
export const MIN_FREQ = 70;       // Hz — below low E (82Hz) with some margin
export const MAX_FREQ = 1400;     // Hz — above ~27th fret of high E (1318Hz)

/**
 * PitchDetector wraps pitchy and converts raw audio buffers to note events.
 * Create one instance per AudioContext and reuse it.
 */
export class PitchDetector {
  private detector: PitchyDetector<Float32Array>;
  private sampleRate: number;

  constructor(bufferSize: number, sampleRate: number) {
    this.detector = PitchyDetector.forFloat32Array(bufferSize);
    this.sampleRate = sampleRate;
  }

  /**
   * Detect pitch from a Float32Array audio buffer.
   * Returns null if no clear pitch is detected (silence, noise, chord, etc.)
   */
  detect(buffer: Float32Array): DetectedNote | null {
    const [frequency, clarity] = this.detector.findPitch(buffer, this.sampleRate);

    // Filter out uncertain detections and out-of-guitar-range frequencies
    if (clarity < MIN_CLARITY) return null;
    if (frequency < MIN_FREQ || frequency > MAX_FREQ) return null;

    const { midi, noteName, cents } = frequencyToCents(frequency);

    return {
      frequency,
      noteName,
      midiNumber: midi,
      cents,
      clarity,
      timestamp: performance.now(),
    };
  }

  /**
   * Update the sample rate (e.g., if AudioContext changes).
   */
  setSampleRate(sampleRate: number) {
    this.sampleRate = sampleRate;
  }
}
