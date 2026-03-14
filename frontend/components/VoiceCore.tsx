"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import AudioVisualizer from "./AudioVisualizer";

interface VoiceCoreProps {
  timeDomain: Uint8Array;
  frequency: Uint8Array;
  intensity: number;
}

export default function VoiceCore({
  timeDomain,
  frequency,
  intensity,
}: VoiceCoreProps) {
  const speakerState = useAppStore((s) => s.speakerState);
  const sessionState = useAppStore((s) => s.sessionState);

  const isActive =
    sessionState === "live" ||
    sessionState === "listening" ||
    sessionState === "ai_speaking" ||
    sessionState === "user_speaking";

  const ringColor =
    speakerState === "ai"
      ? "border-[var(--accent-cyan)]"
      : speakerState === "user"
      ? "border-[var(--accent-amber)]"
      : "border-[var(--text-muted)]";

  const glowStyle =
    speakerState === "ai"
      ? { boxShadow: `0 0 ${30 + intensity * 50}px var(--glow-cyan)` }
      : speakerState === "user"
      ? { boxShadow: `0 0 ${20 + intensity * 40}px rgba(255, 171, 0, 0.15)` }
      : {};

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        animate={{
          scale: isActive ? 1 + intensity * 0.1 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full border-2 ${ringColor} flex items-center justify-center overflow-hidden`}
        style={glowStyle}
      >
        <AudioVisualizer
          timeDomain={timeDomain}
          frequency={frequency}
          intensity={intensity}
        />

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[var(--text-muted)] animate-pulse" />
          </div>
        )}
      </motion.div>

      {isActive && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="mt-4 text-xs text-[var(--text-muted)] tracking-widest uppercase"
        >
          {speakerState === "ai"
            ? "nikhil is speaking"
            : speakerState === "user"
            ? "listening to you"
            : "live"}
        </motion.p>
      )}
    </div>
  );
}
