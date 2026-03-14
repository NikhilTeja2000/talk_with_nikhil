"use client";

import { motion } from "framer-motion";

interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  turn_count: number;
  topics: string[] | null;
  status: string;
}

interface SessionListProps {
  sessions: Session[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export default function SessionList({
  sessions,
  onSelect,
  selectedId,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-[var(--text-muted)] terminal-text text-sm">
        No sessions yet.
      </p>
    );
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {sessions.map((s, i) => {
        const isSelected = s.id === selectedId;
        const time = new Date(s.started_at).toLocaleString();
        return (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(s.id)}
            className={`w-full text-left px-3 py-2 terminal-text text-sm border transition-colors ${
              isSelected
                ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5"
                : "border-transparent hover:border-[var(--border)]"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-primary)] truncate">
                {s.id.slice(0, 8)}...
              </span>
              <span
                className={`text-xs px-1 ${
                  s.status === "active"
                    ? "text-[var(--accent-green)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {s.status}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-[var(--text-muted)] mt-0.5">
              <span>{time}</span>
              <span>{s.turn_count} turns</span>
            </div>
            {s.topics && s.topics.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {s.topics.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1 border border-[var(--border)] text-[var(--accent-amber)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
