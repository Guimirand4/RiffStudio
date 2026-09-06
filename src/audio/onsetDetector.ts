/**
 * onsetDetector.ts
 *
 * Detects the START of a new note (onset) in a raw audio buffer.
 * This is separate from pitch detection — pitchy tells us WHAT note is playing,
 * but onset detection tells us WHEN a new note began.
 *
 * Why this matters:
 *   - Two consecutive same notes (E2 → E2): without onset detection, the engine
 *     sees one sustained E2 and never advances the cursor on the second note.
 *   - Residual string vibration after a note stops looks like "note still playing".
 *
 * Algorithm: High Frequency Content (HFC) + energy spike detection.
 *   1. Calculate RMS energy of the current buffer.
 *   2. Compare to a slowly-decaying "background" energy level.
 *   3. If current energy exceeds background by ONSET_THRESHOLD_RATIO → onset detected.
 *   4. Enforce a refractory period (MIN_ONSET_INTERVAL_MS) so rapid fluctuations
 *      don't trigger multiple false onsets.
 *   5. Track a slow "envelope follower" to distinguish new onsets from sustained notes.
 *
 * This is the same conceptual approach as aubio's onset detection (energy-based),
 * simplified for real-time browser use without additional dependencies.
 */

const ONSET_THRESHOLD_RATIO = 2.8;    // energy must spike by this factor to be an onset
const MIN_ONSET_INTERVAL_MS = 150;    // refractory period — minimum ms between onsets
const SILENCE_THRESHOLD = 0.0008;     // RMS below this → consider silence (no onset possible)
const ENVELOPE_DECAY = 0.92;          // how fast the "background energy" decays per frame

export interface OnsetResult {
  isOnset: boolean;
  rms: number;           // current RMS energy (0–1), useful for level meter
  isSilence: boolean;    // true when signal is below silence threshold
}

export class OnsetDetector {
  private envelopeRms = 0;           // slowly-decaying energy follower
  private lastOnsetTime = -Infinity; // timestamp of last detected onset

  /**
   * Analyze a buffer and return whether a new note onset was detected.
   * Call this with every buffer received from the AudioWorklet.
   */
  detect(buffer: Float32Array): OnsetResult {
    const now = performance.now();

    // 1. Compute RMS energy of this buffer
    let sumSq = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSq += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSq / buffer.length);

    // 2. Check for silence
    if (rms < SILENCE_THRESHOLD) {
      // In silence: reset envelope so next note will definitely trigger onset
      this.envelopeRms = 0;
      return { isOnset: false, rms, isSilence: true };
    }

    // 3. Determine if this is an onset: energy spike above the running envelope
    const withinRefractory = now - this.lastOnsetTime < MIN_ONSET_INTERVAL_MS;

    let isOnset = false;
    if (!withinRefractory) {
      if (this.envelopeRms < SILENCE_THRESHOLD) {
        // Coming out of silence → always an onset
        isOnset = true;
      } else if (rms > this.envelopeRms * ONSET_THRESHOLD_RATIO) {
        // Sharp energy increase → new attack transient
        isOnset = true;
      }
    }

    if (isOnset) {
      this.lastOnsetTime = now;
    }

    // 4. Update the decaying envelope follower
    // Fast attack (immediately tracks spikes), slow decay (follows sustain)
    if (rms > this.envelopeRms) {
      this.envelopeRms = rms; // instant attack
    } else {
      this.envelopeRms *= ENVELOPE_DECAY; // slow decay
    }

    return { isOnset, rms, isSilence: false };
  }

  /** Reset state (e.g., when user pauses and resumes practice). */
  reset(): void {
    this.envelopeRms = 0;
    this.lastOnsetTime = -Infinity;
  }
}
