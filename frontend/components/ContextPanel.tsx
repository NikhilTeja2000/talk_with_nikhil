"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

export default function ContextPanel() {
  const currentTopic = useAppStore((s) => s.currentTopic);
  const activeProject = useAppStore((s) => s.activeProject);
  const mentionedSkills = useAppStore((s) => s.mentionedSkills);

  const hasContent = currentTopic || activeProject || mentionedSkills.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] flex-shrink-0">
        <span className="text-xs text-[var(--text-muted)] tracking-widest uppercase">
          context
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {!hasContent && (
          <p className="text-xs text-[var(--text-muted)] italic">
            topics and context will surface here during the conversation...
          </p>
        )}

        {currentTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              topic
            </span>
            <p className="text-sm text-[var(--text-primary)]">{currentTopic}</p>
          </motion.div>
        )}

        {activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              project
            </span>
            <p className="text-sm text-[var(--accent-cyan)]">{activeProject}</p>
          </motion.div>
        )}

        {mentionedSkills.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              skills
            </span>
            <div className="flex flex-wrap gap-1">
              {mentionedSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 text-[10px] rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
