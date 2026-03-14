"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";

export default function TranscriptConsole() {
  const transcript = useAppStore((s) => s.transcript);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] flex-shrink-0">
        <span className="text-xs text-[var(--text-muted)] tracking-widest uppercase">
          transcript
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence>
          {transcript.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3"
            >
              <span
                className={`text-xs font-mono flex-shrink-0 mt-0.5 ${
                  entry.speaker === "user"
                    ? "text-[var(--accent-amber)]"
                    : "text-[var(--accent-cyan)]"
                }`}
              >
                {entry.speaker === "user" ? "you" : "nikhil"}
              </span>
              <p
                className={`text-sm leading-relaxed ${
                  entry.isFinal
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] italic"
                }`}
              >
                {entry.content}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {transcript.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] italic">
            conversation will appear here...
          </p>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
