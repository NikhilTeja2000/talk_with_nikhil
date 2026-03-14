"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BOOT_LINES } from "@/lib/constants";

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cumulative = 0;

    BOOT_LINES.forEach((line, i) => {
      cumulative += line.delay;
      setTimeout(() => {
        if (cancelled) return;
        setLines((prev) => [...prev, line.text]);
        if (i === BOOT_LINES.length - 1) {
          setDone(true);
          onComplete();
        }
      }, cumulative);
    });

    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto px-6">
      <AnimatePresence>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="terminal-text"
          >
            {line === "" ? (
              <br />
            ) : (
              <span
                className={
                  line.includes("system ready")
                    ? "text-[var(--accent-green)]"
                    : line.includes("start")
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--text-secondary)]"
                }
              >
                {line}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {done && (
        <span className="inline-block w-2 h-4 bg-[var(--accent-cyan)] ml-1 cursor-blink" />
      )}
    </div>
  );
}
