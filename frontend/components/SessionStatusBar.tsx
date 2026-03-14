"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { SESSION_STATUS_LABELS } from "@/lib/constants";

export default function SessionStatusBar() {
  const sessionState = useAppStore((s) => s.sessionState);
  const label = SESSION_STATUS_LABELS[sessionState] || sessionState;

  const colorClass =
    sessionState === "live" || sessionState === "listening"
      ? "text-[var(--accent-green)]"
      : sessionState === "ai_speaking"
      ? "text-[var(--accent-cyan)]"
      : sessionState === "error"
      ? "text-[var(--accent-red)]"
      : sessionState === "ended"
      ? "text-[var(--text-muted)]"
      : "text-[var(--accent-amber)]";

  const dotColor =
    sessionState === "live" || sessionState === "listening"
      ? "bg-[var(--accent-green)]"
      : sessionState === "ai_speaking"
      ? "bg-[var(--accent-cyan)]"
      : sessionState === "error"
      ? "bg-[var(--accent-red)]"
      : sessionState === "ended"
      ? "bg-[var(--text-muted)]"
      : "bg-[var(--accent-amber)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]"
    >
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-muted)] text-xs tracking-widest uppercase">
          talk-with-nikhil
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColor} ${sessionState === "connecting" ? "animate-pulse" : ""}`} />
        <span className={`text-xs tracking-wider font-mono ${colorClass}`}>
          {label}
        </span>
      </div>
    </motion.div>
  );
}
