"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface CommandInputProps {
  onCommand: (command: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CommandInput({
  onCommand,
  disabled = false,
  placeholder = "enter command",
}: CommandInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !disabled) {
      onCommand(trimmed);
      setValue("");
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="w-full max-w-2xl mx-auto px-6 mt-4"
    >
      <div className="flex items-center gap-2 terminal-text">
        <span className="text-[var(--accent-green)]">{">"}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] caret-[var(--accent-cyan)]"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="inline-block w-2 h-4 bg-[var(--accent-cyan)] cursor-blink" />
      </div>
    </motion.form>
  );
}
