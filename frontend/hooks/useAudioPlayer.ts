"use client";

import { useCallback, useRef } from "react";

const SAMPLE_RATE = 24000;

export function useAudioPlayer() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const gainRef = useRef<GainNode | null>(null);
  // Incremented on every flush — stale enqueue calls from in-flight WS messages are dropped.
  const generationRef = useRef<number>(0);

  // Returns the long-lived AudioContext for this session, creating it once.
  // The context is intentionally NOT closed on flush — closing and recreating it
  // is expensive and triggers browser autoplay-policy issues. Instead, flush()
  // silences it via the gain node and we restore volume in enqueue().
  const getContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
      nextPlayTimeRef.current = 0;
      sourcesRef.current.clear();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const enqueue = useCallback(
    (base64Pcm: string, generation?: number) => {
      // Drop chunks that arrived after a flush (stale in-flight WebSocket messages).
      if (generation !== undefined && generation !== generationRef.current) return;

      const ctx = getContext();
      const gain = gainRef.current!;

      // Restore volume — flush() sets gain to 0 for instant silence.
      // The first valid chunk after an interruption brings it back up.
      if (gain.gain.value === 0) {
        gain.gain.value = 1;
      }

      const raw = atob(base64Pcm);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      const samples = bytes.length / 2;
      const audioBuffer = ctx.createBuffer(1, samples, SAMPLE_RATE);
      const channelData = audioBuffer.getChannelData(0);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < samples; i++) {
        channelData[i] = view.getInt16(i * 2, true) / 0x8000;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gain);

      sourcesRef.current.add(source);
      source.onended = () => sourcesRef.current.delete(source);

      const now = ctx.currentTime;
      const start = Math.max(now, nextPlayTimeRef.current);
      source.start(start);
      nextPlayTimeRef.current = start + audioBuffer.duration;
    },
    [getContext]
  );

  const flush = useCallback(() => {
    // Bump generation — any enqueue() call captured with the old generation is discarded.
    generationRef.current += 1;

    // Stop all active sources immediately.
    for (const src of sourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    sourcesRef.current.clear();
    nextPlayTimeRef.current = 0;

    // Silence instantly via gain node. The context stays alive so the next
    // answer can play without recreating the AudioContext (which is slow and
    // can trip browser autoplay policies). enqueue() restores gain to 1.
    if (gainRef.current) {
      gainRef.current.gain.value = 0;
    }
  }, []);

  const stop = useCallback(() => {
    // Full teardown — close the context entirely (used on session end).
    generationRef.current += 1;
    for (const src of sourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    sourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
    if (gainRef.current) gainRef.current.gain.value = 0;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
      gainRef.current = null;
    }
  }, []);

  const getGeneration = useCallback(() => generationRef.current, []);

  return { enqueue, stop, flush, getGeneration };
}
