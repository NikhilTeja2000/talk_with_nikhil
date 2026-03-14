"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

interface CallControlsProps {
  onEnd: () => void;
  onToggleMute: () => void;
}

export default function CallControls({ onEnd, onToggleMute }: CallControlsProps) {
  const isMuted = useAppStore((s) => s.isMuted);
  const sessionState = useAppStore((s) => s.sessionState);

  const isActive =
    sessionState === "live" ||
    sessionState === "listening" ||
    sessionState === "ai_speaking" ||
    sessionState === "user_speaking";

  if (!isActive && sessionState !== "connecting") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 flex items-center gap-3 z-40"
    >
      <button
        onClick={onToggleMute}
        className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
          isMuted
            ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      <button
        onClick={onEnd}
        className="w-12 h-12 rounded-full flex items-center justify-center border border-[var(--accent-red)] bg-[var(--accent-red)]/10 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-all"
        title="End session"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        </svg>
      </button>
    </motion.div>
  );
}
