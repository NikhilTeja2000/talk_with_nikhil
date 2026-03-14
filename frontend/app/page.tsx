"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ConsoleShell from "@/components/ConsoleShell";
import SessionStatusBar from "@/components/SessionStatusBar";
import BootSequence from "@/components/BootSequence";
import CommandInput from "@/components/CommandInput";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const [bootDone, setBootDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const setSessionState = useAppStore((s) => s.setSessionState);

  useEffect(() => {
    setSessionState("booting");
  }, [setSessionState]);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setSessionState("ready");
  }, [setSessionState]);

  const handleCommand = useCallback(
    (cmd: string) => {
      if (cmd === "start") {
        setExiting(true);
        setSessionState("connecting");
        setTimeout(() => {
          router.push("/talk");
        }, 600);
      } else if (cmd === "game") {
        setExiting(true);
        setTimeout(() => {
          router.push("/game");
        }, 600);
      } else if (cmd === "login") {
        setExiting(true);
        setTimeout(() => {
          router.push("/admin");
        }, 600);
      }
    },
    [router, setSessionState]
  );

  return (
    <>
      <SessionStatusBar />
      <ConsoleShell>
        <AnimatePresence>
          {!exiting && (
            <motion.div
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col justify-center flex-1"
            >
              <BootSequence onComplete={handleBootComplete} />
              {bootDone && (
                <CommandInput
                  onCommand={handleCommand}
                  placeholder='type "start" to begin'
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ConsoleShell>
    </>
  );
}
