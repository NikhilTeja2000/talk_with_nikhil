"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ConsoleShell from "@/components/ConsoleShell";
import SessionStatusBar from "@/components/SessionStatusBar";
import TranscriptConsole from "@/components/TranscriptConsole";
import VoiceCore from "@/components/VoiceCore";
import ContextPanel from "@/components/ContextPanel";
import CallControls from "@/components/CallControls";
import TextInput from "@/components/TextInput";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useMicInput } from "@/hooks/useMicInput";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import { useAppStore } from "@/lib/store";

export default function TalkPage() {
  const router = useRouter();
  const { startSession, sendText, endSession, sessionState } =
    useLiveSession();
  const { stream, requestMic, stopMic, toggleMute } = useMicInput();
  const analyzerData = useAudioAnalyzer(stream);
  const isMuted = useAppStore((s) => s.isMuted);
  const appToggleMute = useAppStore((s) => s.toggleMute);
  const reset = useAppStore((s) => s.reset);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const init = async () => {
      await requestMic();
      await startSession();
    };
    init();

    return () => {
      stopMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionState === "ended" && !exiting) {
      setExiting(true);
      stopMic();
      setTimeout(() => {
        reset();
        router.push("/");
      }, 1200);
    }
  }, [sessionState, exiting, stopMic, reset, router]);

  const handleEnd = () => {
    endSession();
    stopMic();
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    appToggleMute();
    toggleMute(newMuted);
  };

  const isLive =
    sessionState === "live" ||
    sessionState === "listening" ||
    sessionState === "ai_speaking" ||
    sessionState === "user_speaking";

  return (
    <>
      <SessionStatusBar />
      <ConsoleShell>
        <AnimatePresence>
          {!exiting ? (
            <motion.div
              key="live-session"
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex flex-1 overflow-hidden">
                {/* Left: Transcript */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="hidden md:flex flex-col w-80 border-r border-[var(--border-subtle)]"
                >
                  <TranscriptConsole />
                </motion.div>

                {/* Center: Voice Core */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="flex-1 flex items-center justify-center">
                    <VoiceCore
                      timeDomain={analyzerData.timeDomain}
                      frequency={analyzerData.frequency}
                      intensity={analyzerData.intensity}
                    />
                  </div>

                  {isLive && <TextInput onSend={sendText} />}
                </motion.div>

                {/* Right: Context Panel */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="hidden lg:flex flex-col w-64 border-l border-[var(--border-subtle)]"
                >
                  <ContextPanel />
                </motion.div>
              </div>

              {/* Mobile Transcript */}
              <div className="md:hidden border-t border-[var(--border-subtle)] h-48 overflow-hidden">
                <TranscriptConsole />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center"
            >
              <p className="text-sm text-[var(--text-muted)] tracking-widest uppercase">
                session ended — returning to terminal...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!exiting && (
          <CallControls onEnd={handleEnd} onToggleMute={handleToggleMute} />
        )}
      </ConsoleShell>
    </>
  );
}
