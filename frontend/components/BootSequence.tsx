"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, ReadinessCheck } from "@/lib/api";

interface BootSequenceProps {
  onComplete: () => void;
}

interface BootLine {
  text: string;
  status?: "ok" | "fail" | "info" | "cmd";
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function runBoot() {
      const addLine = (text: string, status?: BootLine["status"]) => {
        setLines((prev) => [...prev, { text, status }]);
      };

      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      addLine("> waking nikhil up...", "info");
      await delay(500);
      addLine("> loading his brain...", "info");
      await delay(400);
      addLine("> syncing memories, projects, stories...", "info");
      await delay(500);

      let readiness: ReadinessCheck | null = null;
      try {
        readiness = await api.readinessCheck();
      } catch {
        await delay(200);
        addLine("> grabbing his coffee...", "info");
        await delay(600);
        addLine("", "info");
        addLine("> looks like nikhil has some issue with his voice...", "fail");
        addLine("> no worries — will update him.", "fail");
        addLine("> in the mean time, you can play this game!", "info");
        addLine("", "info");
        addLine('> type "game" to play dino runner', "cmd");
        setDone(true);
        onComplete();
        return;
      }

      await delay(300);
      addLine("> almost there...", "info");
      await delay(400);

      if (readiness.ready) {
        addLine("> nikhil is ready to talk", "ok");
        await delay(200);
        addLine("", "info");
        addLine('> type "start" to begin', "cmd");
        addLine('> type "game" to play dino runner', "cmd");
        addLine('> type "login" for admin access', "cmd");
      } else {
        addLine("", "info");
        addLine("> looks like nikhil has some issue with his voice...", "fail");
        addLine("> no worries — will update him.", "fail");
        addLine("> in the mean time, you can play this game!", "info");
        addLine("", "info");
        addLine('> type "game" to play dino runner', "cmd");
        addLine('> type "start" to try anyway', "cmd");
      }

      setDone(true);
      onComplete();
    }

    runBoot();
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
            {line.text === "" ? (
              <br />
            ) : (
              <span
                className={
                  line.status === "ok"
                    ? "text-[var(--accent-green)]"
                    : line.status === "fail"
                    ? "text-red-400"
                    : line.status === "cmd"
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--text-secondary)]"
                }
              >
                {line.text}
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
