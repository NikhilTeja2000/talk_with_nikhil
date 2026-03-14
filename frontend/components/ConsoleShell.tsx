"use client";

import { motion } from "framer-motion";

interface ConsoleShellProps {
  children: React.ReactNode;
}

export default function ConsoleShell({ children }: ConsoleShellProps) {
  return (
    <div className="relative w-full h-screen bg-[var(--bg-primary)] overflow-hidden scanline">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full flex flex-col pt-14"
      >
        {children}
      </motion.div>
    </div>
  );
}
