/**
 * AudioWorklet processor: captures mic samples and converts Float32 → Int16 PCM.
 * Adapts chunk size based on actual sample rate to always produce ~100ms chunks.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer ~100ms of audio at whatever rate the AudioContext runs
    this._chunkSamples = Math.round(sampleRate * 0.1);
    this._buffer = new Float32Array(this._chunkSamples);
    this._writePos = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._writePos++] = channel[i];

      if (this._writePos >= this._chunkSamples) {
        const pcm = new Int16Array(this._chunkSamples);
        for (let j = 0; j < this._chunkSamples; j++) {
          const s = Math.max(-1, Math.min(1, this._buffer[j]));
          pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage({ type: "pcm", buffer: pcm.buffer }, [pcm.buffer]);
        this._writePos = 0;
      }
    }

    return true;
  }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
