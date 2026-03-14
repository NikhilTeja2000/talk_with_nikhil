"use client";

import { motion } from "framer-motion";

interface StatsCardsProps {
  stats: {
    total_sessions: number;
    active_sessions: number;
    open_flags: number;
    total_questions: number;
  } | null;
}

const cards = [
  { key: "total_sessions", label: "TOTAL SESSIONS", color: "var(--accent-cyan)" },
  { key: "active_sessions", label: "ACTIVE", color: "var(--accent-green)" },
  { key: "open_flags", label: "OPEN FLAGS", color: "var(--accent-amber)" },
  { key: "total_questions", label: "QUESTIONS", color: "var(--text-muted)" },
] as const;

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ key, label, color }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="border border-[var(--border)] p-4"
        >
          <p className="text-xs terminal-text text-[var(--text-muted)] mb-1">{label}</p>
          <p
            className="text-2xl font-mono font-bold"
            style={{ color }}
          >
            {stats ? stats[key] : "—"}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
