"use client";

import { useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { LiveSocket } from "@/lib/websocket";
import type {
  WSMessage,
  TranscriptEntry,
  SpeakerState,
} from "@/lib/types";

let entryCounter = 0;
function makeId(): string {
  return `t-${Date.now()}-${++entryCounter}`;
}

export function useLiveSession() {
  const socketRef = useRef<LiveSocket | null>(null);
  const {
    sessionState,
    sessionId,
    setSessionState,
    setSpeakerState,
    setSessionId,
    addTranscriptEntry,
    setCurrentTopic,
    setActiveProject,
    setMentionedSkills,
  } = useAppStore();

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "session.ready":
          setSessionId(msg.session_id as string);
          setSessionState("live");
          break;

        case "speaker.state": {
          const speaker = msg.speaker as SpeakerState;
          setSpeakerState(speaker);
          if (speaker === "ai") {
            setSessionState("ai_speaking");
          } else if (speaker === "user") {
            setSessionState("user_speaking");
          } else {
            setSessionState("live");
          }
          break;
        }

        case "transcript.final": {
          const entry: TranscriptEntry = {
            id: makeId(),
            speaker: (msg.speaker as SpeakerState) || "ai",
            content: msg.content as string,
            timestamp: Date.now(),
            isFinal: true,
          };
          addTranscriptEntry(entry);
          break;
        }

        case "transcript.partial": {
          const entry: TranscriptEntry = {
            id: makeId(),
            speaker: (msg.speaker as SpeakerState) || "ai",
            content: msg.content as string,
            timestamp: Date.now(),
            isFinal: false,
          };
          addTranscriptEntry(entry);
          break;
        }

        case "context.update":
          if (msg.topic) setCurrentTopic(msg.topic as string);
          if (msg.project) setActiveProject(msg.project as string);
          if (msg.skills) setMentionedSkills(msg.skills as string[]);
          break;

        case "session.ended":
          setSessionState("ended");
          setSpeakerState("none");
          break;

        case "error":
          console.error("Server error:", msg.content);
          break;
      }
    },
    [
      setSessionId,
      setSessionState,
      setSpeakerState,
      addTranscriptEntry,
      setCurrentTopic,
      setActiveProject,
      setMentionedSkills,
    ]
  );

  const startSession = useCallback(async () => {
    setSessionState("connecting");

    const socket = new LiveSocket();
    socketRef.current = socket;

    socket.onMessage(handleMessage);

    try {
      await socket.connect();
      socket.send({ type: "session.start" });
    } catch {
      setSessionState("error");
    }
  }, [handleMessage, setSessionState]);

  const sendText = useCallback(
    (text: string) => {
      if (!socketRef.current?.isConnected) return;

      const entry: TranscriptEntry = {
        id: makeId(),
        speaker: "user",
        content: text,
        timestamp: Date.now(),
        isFinal: true,
      };
      addTranscriptEntry(entry);

      socketRef.current.send({
        type: "transcript.user",
        content: text,
      });
    },
    [addTranscriptEntry]
  );

  const endSession = useCallback(() => {
    socketRef.current?.send({ type: "session.end" });
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSessionState("ended");
    setSpeakerState("none");
  }, [setSessionState, setSpeakerState]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    sessionState,
    sessionId,
    startSession,
    sendText,
    endSession,
  };
}
