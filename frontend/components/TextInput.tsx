"use client";

import { useState, useRef, useEffect } from "react";

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function TextInput({ onSend, disabled = false }: TextInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
    >
      <span className="text-[var(--accent-green)] text-sm">{">"}</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="type a message..."
        className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] caret-[var(--accent-cyan)]"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="text-xs text-[var(--accent-cyan)] hover:text-[var(--text-primary)] disabled:text-[var(--text-muted)] transition-colors"
      >
        send
      </button>
    </form>
  );
}
