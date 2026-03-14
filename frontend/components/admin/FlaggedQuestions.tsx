"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Question {
  id: string;
  user_question: string;
  ai_answer: string;
  gap_reason: string;
  topic: string;
  status: string;
  confidence_score: number;
  created_at: string;
}

interface FlaggedQuestionsProps {
  questions: Question[];
  onResolved: () => void;
}

export default function FlaggedQuestions({
  questions,
  onResolved,
}: FlaggedQuestionsProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const token = useAuthStore((s) => s.accessToken);

  const handleResolve = async (questionId: string) => {
    if (!token || !answer.trim()) return;
    try {
      await api.adminResolve(token, questionId, answer);
      setResolving(null);
      setAnswer("");
      onResolved();
    } catch {
      // silent
    }
  };

  if (questions.length === 0) {
    return (
      <p className="text-[var(--text-muted)] terminal-text text-sm">
        No flagged questions.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {questions.map((q, i) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="border border-[var(--border)] p-3"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs px-1 border border-[var(--accent-amber)] text-[var(--accent-amber)]">
              {q.gap_reason || "FLAGGED"}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              conf: {(q.confidence_score * 100).toFixed(0)}%
            </span>
          </div>

          <p className="terminal-text text-sm text-[var(--text-primary)] mb-1">
            <span className="text-[var(--accent-cyan)]">Q:</span> {q.user_question}
          </p>
          <p className="terminal-text text-sm text-[var(--text-muted)] mb-2">
            <span className="text-[var(--accent-green)]">A:</span> {q.ai_answer || "(no answer)"}
          </p>

          {q.topic && (
            <span className="text-[10px] px-1 border border-[var(--border)] text-[var(--text-muted)]">
              {q.topic}
            </span>
          )}

          {resolving === q.id ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Provide the correct answer..."
                className="w-full bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-sm p-2 outline-none focus:border-[var(--accent-cyan)] resize-none terminal-text"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolve(q.id)}
                  className="text-xs px-2 py-1 border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 terminal-text"
                >
                  RESOLVE
                </button>
                <button
                  onClick={() => {
                    setResolving(null);
                    setAnswer("");
                  }}
                  className="text-xs px-2 py-1 border border-[var(--border)] text-[var(--text-muted)] hover:border-red-400 hover:text-red-400 terminal-text"
                >
                  CANCEL
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setResolving(q.id)}
              className="mt-2 text-xs px-2 py-1 border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-green)] hover:text-[var(--accent-green)] terminal-text"
            >
              RESOLVE
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
