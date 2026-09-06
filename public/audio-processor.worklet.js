/**
 * audio-processor.worklet.js
 * 
 * AudioWorkletProcessor that runs on a dedicated audio thread.
 * Accumulates audio samples into a fixed-size buffer and posts
 * them to the main thread for pitch detection via pitchy.
 * 
 * NOTE: This file cannot import ES modules directly (AudioWorklet limitation).
 * All logic must be self-contained.
 */

const BUFFER_SIZE = 2048; // ~46ms at 44100Hz — good balance for guitar pitch detection

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(BUFFER_SIZE);
    this._writePos = 0;
    this._isActive = true;

    this.port.onmessage = (e) => {
      if (e.data === 'stop') {
        this._isActive = false;
      }
    };
  }

  process(inputs, _outputs, _parameters) {
    if (!this._isActive) return false;

    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0]; // mono — use first channel only
    if (!channel) return true;

    // Copy samples into our rolling buffer
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._writePos] = channel[i];
      this._writePos++;

      // When buffer is full, send to main thread and reset
      if (this._writePos >= BUFFER_SIZE) {
        // Transfer a copy so we don't mutate while main thread reads
        const snapshot = new Float32Array(this._buffer);
        this.port.postMessage({ type: 'buffer', data: snapshot }, [snapshot.buffer]);
        this._writePos = 0;
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
