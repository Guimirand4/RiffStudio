/**
 * audioEngine.ts
 *
 * Manages the full audio capture pipeline:
 *   Microphone → MediaStream → AudioContext → AudioWorklet → OnsetDetector + PitchDetector
 *
 * Emits CustomEvents on window (decoupled from React):
 *   - 'noteDetected'   → a pitch was detected (fires continuously while note sustains)
 *   - 'noteOnset'      → a NEW note attack was detected (fires once per new note)
 *   - 'silenceDetected'→ audio dropped below silence threshold
 *   - 'inputLevel'     → RMS level every frame (for the VU meter)
 *   - 'pitchEngineReady'
 *   - 'pitchEngineError'
 *
 * The Player uses 'noteOnset' (not 'noteDetected') for matching — this ensures
 * that two consecutive identical notes (E2 → E2) each trigger a separate match.
 */

import { PitchDetector } from './pitchDetector';
import { OnsetDetector } from './onsetDetector';
import type { DetectedNote } from './pitchDetector';

// CustomEvent type augmentation
declare global {
  interface WindowEventMap {
    noteDetected: CustomEvent<DetectedNote>;
    noteOnset: CustomEvent<DetectedNote>;        // NEW: fires only on note attack
    silenceDetected: CustomEvent<void>;
    inputLevel: CustomEvent<{ rms: number }>;    // NEW: fires every buffer for VU meter
    pitchEngineReady: CustomEvent<{ sampleRate: number }>;
    pitchEngineError: CustomEvent<{ error: string }>;
  }
}

const BUFFER_SIZE = 2048;
const WORKLET_URL = '/audio-processor.worklet.js';

export type AudioEngineState = 'idle' | 'starting' | 'running' | 'error' | 'stopped';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private pitchDetector: PitchDetector | null = null;
  private onsetDetector: OnsetDetector | null = null;
  private _state: AudioEngineState = 'idle';

  // Track whether we were in silence last frame (for silenceDetected event throttling)
  private wasSilent = true;

  get state(): AudioEngineState {
    return this._state;
  }

  /**
   * Initialize and start the audio capture pipeline.
   * Requests microphone permission, creates AudioContext, loads the worklet.
   */
  async start(): Promise<void> {
    if (this._state === 'running') return;
    this._state = 'starting';

    try {
      // Request microphone with constraints optimized for instrument (not voice).
      // These three are critical — browser defaults are tuned for voice calls
      // and will distort guitar/instrument signals.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,    // Preserve guitar signal — no acoustic echo processing
          noiseSuppression: false,    // Keep transients intact — essential for onset detection
          autoGainControl: false,     // Fixed gain — variable gain breaks pitch clarity
          channelCount: 1,            // Mono — faster processing, guitar is mono anyway
          sampleRate: 44100,          // CD quality — standard for pitch tracking
        },
      });

      // Create AudioContext matching the stream sample rate
      this.audioContext = new AudioContext({ sampleRate: 44100 });

      // Load the AudioWorklet (runs in dedicated audio thread)
      await this.audioContext.audioWorklet.addModule(WORKLET_URL);

      // Wire up the pipeline
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      // Initialize detectors
      this.pitchDetector = new PitchDetector(BUFFER_SIZE, this.audioContext.sampleRate);
      this.onsetDetector = new OnsetDetector();

      // Handle incoming audio buffers from the worklet thread
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type !== 'buffer') return;
        const buffer: Float32Array = event.data.data;

        // 1. Onset detection (also gives us RMS for the VU meter)
        const onset = this.onsetDetector!.detect(buffer);

        // 2. Emit input level for the VU meter (every frame)
        window.dispatchEvent(
          new CustomEvent('inputLevel', { detail: { rms: onset.rms } })
        );

        // 3. Handle silence transitions
        if (onset.isSilence) {
          if (!this.wasSilent) {
            window.dispatchEvent(new CustomEvent('silenceDetected'));
            this.wasSilent = true;
          }
          return;
        }
        this.wasSilent = false;

        // 4. Pitch detection — runs every frame that has audio
        const detected = this.pitchDetector!.detect(buffer);
        if (!detected) return; // Low clarity or out of range — skip

        // 5. Emit general noteDetected (for the PitchFeedback display)
        window.dispatchEvent(
          new CustomEvent('noteDetected', { detail: detected })
        );

        // 6. Emit noteOnset only when attack detected (for the Player matching logic)
        if (onset.isOnset) {
          window.dispatchEvent(
            new CustomEvent('noteOnset', { detail: detected })
          );
        }
      };

      // Connect: mic → worklet (NOT → destination, to avoid feedback loop)
      this.sourceNode.connect(this.workletNode);

      this._state = 'running';
      this.wasSilent = true;
      this.onsetDetector.reset();

      window.dispatchEvent(
        new CustomEvent('pitchEngineReady', {
          detail: { sampleRate: this.audioContext.sampleRate },
        })
      );
    } catch (err) {
      this._state = 'error';
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      window.dispatchEvent(
        new CustomEvent('pitchEngineError', { detail: { error: errorMsg } })
      );
      throw err;
    }
  }

  /** Stop the audio pipeline and release all resources. */
  stop(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage('stop');
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.pitchDetector = null;
    this.onsetDetector = null;
    this._state = 'stopped';
  }

  async suspend(): Promise<void> {
    await this.audioContext?.suspend();
  }

  async resume(): Promise<void> {
    await this.audioContext?.resume();
  }

  get isRunning(): boolean {
    return this._state === 'running';
  }
}

// Singleton — one engine per app session
let _engineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!_engineInstance) {
    _engineInstance = new AudioEngine();
  }
  return _engineInstance;
}

/**
 * Reset the singleton (needed when unmounting the player and returning to library).
 * Ensures a fresh AudioEngine is created on next practice session.
 */
export function resetAudioEngine(): void {
  if (_engineInstance?.isRunning) {
    _engineInstance.stop();
  }
  _engineInstance = null;
}
