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
  const [sessionsPage, setSessionsPage] = useState(0);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [flagged, setFlagged] = useState<any[]>([]);
  const [flaggedPage, setFlaggedPage] = useState(0);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const pageSize = 20;
  const sessionsPageSize = 20;

  const loadData = useCallback(async (page = 0) => {
    if (!accessToken) return;
    try {
      const [statsData, sessionsData, flaggedData] = await Promise.all([
        api.adminGetStats(accessToken),
        api.adminGetSessions(accessToken),
        api.adminGetFlagged(accessToken, "open", pageSize, page * pageSize),
      ]);
      setStats(statsData);
      setFlagged(flaggedData.questions);
      setFlaggedPage(page);
    } catch {
      clearAuth();
    }
  }, [accessToken, clearAuth, pageSize]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(0);
      // also load first page of sessions
      loadSessions(0);
    }
  }, [isAuthenticated, loadData]);

  const loadSessions = useCallback(
    async (page = 0) => {
      if (!accessToken) return;
      try {
        const sessionsData = await api.adminGetSessions(
          accessToken,
          sessionsPageSize,
          page * sessionsPageSize
        );
        setSessions(sessionsData.sessions);
        setSessionsPage(page);
        setSessionsHasMore(
          Array.isArray(sessionsData.sessions) &&
            sessionsData.sessions.length === sessionsPageSize
        );
      } catch {
        clearAuth();
      }
    },
    [accessToken, clearAuth, sessionsPageSize]
  );

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
                      <div className="mt-3 flex justify-between items-center text-[10px] terminal-text text-[var(--text-muted)]">
                        <span>
                          Page {sessionsPage + 1}
                          {stats && stats.total_sessions !== undefined && (
                            <> · Total sessions: {stats.total_sessions}</>
                          )}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={sessionsPage === 0}
                            onClick={() => loadSessions(sessionsPage - 1)}
                            className={`px-2 py-1 border text-xs ${
                              sessionsPage === 0
                                ? "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                            }`}
                          >
                            PREV
                          </button>
                          <button
                            disabled={!sessionsHasMore}
                            onClick={() => loadSessions(sessionsPage + 1)}
                            className={`px-2 py-1 border text-xs ${
                              !sessionsHasMore
                                ? "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                            }`}
                          >
                            NEXT
                          </button>
                        </div>
                      </div>
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
                      onRefresh={() => loadData(flaggedPage)}
                    />
                    {stats && (
                      <div className="mt-3 flex justify-between items-center text-[10px] terminal-text text-[var(--text-muted)]">
                        <span>
                          Page {flaggedPage + 1} of{" "}
                          {Math.max(
                            1,
                            Math.ceil((stats.open_flags || 0) / pageSize)
                          )}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={flaggedPage === 0}
                            onClick={() => loadData(flaggedPage - 1)}
                            className={`px-2 py-1 border text-xs ${
                              flaggedPage === 0
                                ? "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                            }`}
                          >
                            PREV
                          </button>
                          <button
                            disabled={
                              !stats.open_flags ||
                              (flaggedPage + 1) * pageSize >= stats.open_flags
                            }
                            onClick={() => loadData(flaggedPage + 1)}
                            className={`px-2 py-1 border text-xs ${
                              !stats.open_flags ||
                              (flaggedPage + 1) * pageSize >= stats.open_flags
                                ? "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                            }`}
                          >
                            NEXT
                          </button>
                        </div>
                      </div>
                    )}
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
