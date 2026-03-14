"use client";

import { useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";

interface AudioVisualizerProps {
  timeDomain: Uint8Array;
  frequency: Uint8Array;
  intensity: number;
}

export default function AudioVisualizer({
  timeDomain,
  frequency,
  intensity,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakerState = useAppStore((s) => s.speakerState);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const centerY = h / 2;

    ctx.clearRect(0, 0, w, h);

    const isSpeaking = speakerState !== "none";
    const color =
      speakerState === "ai"
        ? "0, 229, 255"       // cyan
        : speakerState === "user"
        ? "255, 171, 0"       // amber
        : "139, 148, 158";    // muted

    const alpha = isSpeaking ? 0.6 + intensity * 0.4 : 0.2;

    ctx.shadowColor = `rgba(${color}, 0.5)`;
    ctx.shadowBlur = 20 * intensity;

    if (timeDomain.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${color}, ${alpha})`;
      ctx.lineWidth = 2;

      const sliceWidth = w / timeDomain.length;
      let x = 0;

      for (let i = 0; i < timeDomain.length; i++) {
        const v = timeDomain[i] / 128.0;
        const amp = isSpeaking ? intensity * 0.5 + 0.5 : 0.1;
        const y = centerY + (v - 1) * centerY * amp;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
    }

    if (frequency.length > 0 && isSpeaking) {
      const barWidth = w / frequency.length;
      for (let i = 0; i < frequency.length; i++) {
        const barHeight = (frequency[i] / 255) * h * 0.3 * intensity;
        const barAlpha = 0.05 + (frequency[i] / 255) * 0.15;
        ctx.fillStyle = `rgba(${color}, ${barAlpha})`;
        ctx.fillRect(
          i * barWidth,
          centerY - barHeight / 2,
          barWidth - 1,
          barHeight
        );
      }
    }

    ctx.shadowBlur = 0;
  }, [timeDomain, frequency, intensity, speakerState]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
