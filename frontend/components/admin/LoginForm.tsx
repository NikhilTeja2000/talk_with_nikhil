"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await api.login(email, password);
      setAuth({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        email: result.email,
        userId: result.user_id,
      });
      onSuccess();
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="mb-6 terminal-text text-[var(--accent-green)]">
        <p>{">"} ADMIN AUTH REQUIRED</p>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          enter credentials to access the dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <div className="flex items-center gap-2 terminal-text">
          <span className="text-[var(--text-muted)] w-20">email:</span>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent border-b border-[var(--border)] outline-none text-[var(--text-primary)] px-1 py-0.5 focus:border-[var(--accent-cyan)] transition-colors"
            autoComplete="off"
            required
          />
        </div>

        <div className="flex items-center gap-2 terminal-text">
          <span className="text-[var(--text-muted)] w-20">password:</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-transparent border-b border-[var(--border)] outline-none text-[var(--text-primary)] px-1 py-0.5 focus:border-[var(--accent-cyan)] transition-colors"
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm terminal-text"
          >
            {">"} ERROR: {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-2 text-sm terminal-text border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-colors disabled:opacity-50"
        >
          {loading ? "> AUTHENTICATING..." : "> LOGIN"}
        </button>
      </form>
    </motion.div>
  );
}
