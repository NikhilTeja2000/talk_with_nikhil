"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ConsoleShell from "@/components/ConsoleShell";
import LoginForm from "@/components/admin/LoginForm";
import StatsCards from "@/components/admin/StatsCards";
import SessionList from "@/components/admin/SessionList";
import FlaggedQuestions from "@/components/admin/FlaggedQuestions";
import ProfileEditor from "@/components/admin/ProfileEditor";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";

type Tab = "overview" | "sessions" | "flagged" | "profile";

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken, clearAuth } = useAuthStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<{
    total_sessions: number;
    active_sessions: number;
    open_flags: number;
    total_questions: number;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [flagged, setFlagged] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [statsData, sessionsData, flaggedData] = await Promise.all([
        api.adminGetStats(accessToken),
        api.adminGetSessions(accessToken),
        api.adminGetFlagged(accessToken),
      ]);
      setStats(statsData);
      setSessions(sessionsData.sessions);
      setFlagged(flaggedData.questions);
    } catch {
      clearAuth();
    }
  }, [accessToken, clearAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "OVERVIEW" },
    { id: "sessions", label: "SESSIONS" },
    { id: "flagged", label: `FLAGGED${stats?.open_flags ? ` (${stats.open_flags})` : ""}` },
    { id: "profile", label: "PROFILE" },
  ];

  return (
    <ConsoleShell>
      <div className="flex flex-col h-full max-w-5xl mx-auto w-full px-4 py-6">
        {!isAuthenticated ? (
          <div className="flex items-center justify-center flex-1">
            <LoginForm onSuccess={loadData} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6 flex-1 min-h-0"
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <h1 className="terminal-text text-lg text-[var(--accent-green)]">
                  {">"} ADMIN DASHBOARD
                </h1>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => window.open("/", "_blank")}
                    className="text-xs terminal-text text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    [VIEW SITE]
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-xs terminal-text text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  >
                    [LOGOUT]
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-[var(--border)]">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 text-xs terminal-text transition-colors ${
                      tab === t.id
                        ? "text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {tab === "overview" && <StatsCards stats={stats} />}

                {tab === "sessions" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h2 className="terminal-text text-sm text-[var(--text-muted)] mb-3">
                        RECENT SESSIONS
                      </h2>
                      <SessionList
                        sessions={sessions}
                        onSelect={setSelectedSession}
                        selectedId={selectedSession}
                      />
                    </div>
                    <div>
                      {selectedSession && (
                        <SessionDetail
                          sessionId={selectedSession}
                          token={accessToken!}
                        />
                      )}
                    </div>
                  </div>
                )}

                {tab === "flagged" && (
                  <div>
                    <h2 className="terminal-text text-sm text-[var(--text-muted)] mb-3">
                      UNANSWERED / WEAK RESPONSES
                    </h2>
                    <FlaggedQuestions
                      questions={flagged}
                      onResolved={loadData}
                    />
                  </div>
                )}

                {tab === "profile" && <ProfileEditor />}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ConsoleShell>
  );
}

function SessionDetail({ sessionId, token }: { sessionId: string; token: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.adminGetSession(token, sessionId).then(setData).catch(() => {});
  }, [sessionId, token]);

  if (!data) {
    return (
      <p className="terminal-text text-sm text-[var(--text-muted)]">Loading...</p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-3"
    >
      <h2 className="terminal-text text-sm text-[var(--accent-cyan)]">
        TRANSCRIPT
      </h2>
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {data.transcript.map(
          (
            msg: { id: string; speaker: string; content: string; created_at: string },
            i: number
          ) => (
            <div key={msg.id || i} className="terminal-text text-sm">
              <span
                className={
                  msg.speaker === "user"
                    ? "text-[var(--accent-cyan)]"
                    : "text-[var(--accent-green)]"
                }
              >
                {msg.speaker === "user" ? "USER" : "AI"}:
              </span>{" "}
              <span className="text-[var(--text-primary)]">{msg.content}</span>
            </div>
          )
        )}
        {data.transcript.length === 0 && (
          <p className="text-[var(--text-muted)] text-sm terminal-text">
            No transcript messages.
          </p>
        )}
      </div>
    </motion.div>
  );
}
