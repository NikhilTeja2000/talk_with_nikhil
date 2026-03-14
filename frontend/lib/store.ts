import { create } from "zustand";
import type { SessionState, SpeakerState, TranscriptEntry } from "./types";

interface AppStore {
  sessionState: SessionState;
  speakerState: SpeakerState;
  sessionId: string | null;
  transcript: TranscriptEntry[];
  currentTopic: string;
  activeProject: string;
  mentionedSkills: string[];
  isMuted: boolean;
  audioIntensity: number;

  setSessionState: (state: SessionState) => void;
  setSpeakerState: (state: SpeakerState) => void;
  setSessionId: (id: string | null) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  updateLastTranscript: (content: string) => void;
  setCurrentTopic: (topic: string) => void;
  setActiveProject: (project: string) => void;
  setMentionedSkills: (skills: string[]) => void;
  toggleMute: () => void;
  setAudioIntensity: (intensity: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sessionState: "booting",
  speakerState: "none",
  sessionId: null,
  transcript: [],
  currentTopic: "",
  activeProject: "",
  mentionedSkills: [],
  isMuted: false,
  audioIntensity: 0,

  setSessionState: (sessionState) => set({ sessionState }),
  setSpeakerState: (speakerState) => set({ speakerState }),
  setSessionId: (sessionId) => set({ sessionId }),

  addTranscriptEntry: (entry) =>
    set((s) => ({ transcript: [...s.transcript, entry] })),

  updateLastTranscript: (content) =>
    set((s) => {
      const updated = [...s.transcript];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        };
      }
      return { transcript: updated };
    }),

  setCurrentTopic: (currentTopic) => set({ currentTopic }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setMentionedSkills: (mentionedSkills) => set({ mentionedSkills }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setAudioIntensity: (audioIntensity) => set({ audioIntensity }),

  reset: () =>
    set({
      sessionState: "ready",
      speakerState: "none",
      sessionId: null,
      transcript: [],
      currentTopic: "",
      activeProject: "",
      mentionedSkills: [],
      isMuted: false,
      audioIntensity: 0,
    }),
}));
