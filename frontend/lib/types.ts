export type SessionState =
  | "booting"
  | "ready"
  | "connecting"
  | "live"
  | "listening"
  | "ai_speaking"
  | "user_speaking"
  | "interrupted"
  | "ended"
  | "error";

export type SpeakerState = "none" | "user" | "ai";

export interface TranscriptEntry {
  id: string;
  speaker: SpeakerState;
  content: string;
  timestamp: number;
  isFinal: boolean;
}

export interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export interface SessionReadyMessage extends WSMessage {
  type: "session.ready";
  session_id: string;
}

export interface SpeakerStateMessage extends WSMessage {
  type: "speaker.state";
  speaker: SpeakerState;
  state: string;
}

export interface TranscriptMessage extends WSMessage {
  type: "transcript.final" | "transcript.partial";
  speaker: SpeakerState;
  content: string;
}

export interface ContextUpdateMessage extends WSMessage {
  type: "context.update";
  topic?: string;
  project?: string;
  skills?: string[];
}

export interface ErrorMessage extends WSMessage {
  type: "error";
  content: string;
}
