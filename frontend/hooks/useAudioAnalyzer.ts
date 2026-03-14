"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AnalyzerData {
  timeDomain: Uint8Array;
  frequency: Uint8Array;
  intensity: number;
  isActive: boolean;
}

export function useAudioAnalyzer(stream: MediaStream | null) {
  const [data, setData] = useState<AnalyzerData>({
    timeDomain: new Uint8Array(0),
    frequency: new Uint8Array(0),
    intensity: 0,
    isActive: false,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  const analyze = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const timeDomain = new Uint8Array(analyzer.fftSize);
    const frequency = new Uint8Array(analyzer.frequencyBinCount);

    const tick = () => {
      analyzer.getByteTimeDomainData(timeDomain);
      analyzer.getByteFrequencyData(frequency);

      let sum = 0;
      for (let i = 0; i < timeDomain.length; i++) {
        const normalized = (timeDomain[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / timeDomain.length);
      const intensity = Math.min(rms * 4, 1);

      setData({
        timeDomain: new Uint8Array(timeDomain),
        frequency: new Uint8Array(frequency),
        intensity,
        isActive: true,
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  useEffect(() => {
    if (!stream) {
      setData((d) => ({ ...d, intensity: 0, isActive: false }));
      return;
    }

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyzer);

    ctxRef.current = audioCtx;
    analyzerRef.current = analyzer;
    sourceRef.current = source;

    analyze();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close();
      ctxRef.current = null;
      analyzerRef.current = null;
      sourceRef.current = null;
    };
  }, [stream, analyze]);

  return data;
}
