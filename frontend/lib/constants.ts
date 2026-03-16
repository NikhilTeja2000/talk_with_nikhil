export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live";

export const WS_VOICE_URL =
  process.env.NEXT_PUBLIC_WS_VOICE_URL || "ws://localhost:8000/ws/voice";

export const BOOT_LINES = [
  { text: "> initializing talk-with-nikhil v0.1.0...", delay: 400 },
  { text: "> loading profile...", delay: 300 },
  { text: "> loading projects...", delay: 250 },
  { text: "> loading experience...", delay: 300 },
  { text: "> loading knowledge base...", delay: 350 },
  { text: "> connecting voice interface...", delay: 400 },
  { text: "> system ready", delay: 200 },
  { text: "", delay: 100 },
  { text: '> type "start" to begin conversation', delay: 0 },
  { text: '> type "game" to play dino runner', delay: 0 },
];

export const SESSION_STATUS_LABELS: Record<string, string> = {
  booting: "BOOTING",
  ready: "READY",
  connecting: "CONNECTING...",
  live: "LIVE",
  listening: "LISTENING",
  ai_speaking: "NIKHIL RESPONDING",
  user_speaking: "YOU'RE SPEAKING",
  interrupted: "INTERRUPTED",
  ended: "SESSION ENDED",
  error: "ERROR",
};

export const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];
