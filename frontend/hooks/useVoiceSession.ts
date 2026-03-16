"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { WS_VOICE_URL } from "@/lib/constants";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { TranscriptEntry, SpeakerState } from "@/lib/types";

let entryCounter = 0;
function makeId() {
  return `v-${Date.now()}-${++entryCounter}`;
}

function toBase64(buffer: ArrayBufferLike): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useVoiceSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(false);
  const [micActive, setMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

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

  const { enqueue: enqueueAudio, stop: stopAudio, flush: flushAudio, getGeneration } = useAudioPlayer();

  const handleMessage = useCallback(
    (raw: string) => {
      if (!activeRef.current) return;

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {
        case "session.ready":
          setSessionId(msg.session_id as string);
          setSessionState("live");
          break;

        case "audio.chunk": {
          // Capture the current generation at message-receipt time.
          // If flush() ran between when the backend sent this chunk and now
          // (i.e. an interruption happened), the generation will have changed
          // and enqueueAudio will silently drop the stale chunk.
          const gen = getGeneration();
          enqueueAudio(msg.data as string, gen);
          // Only update UI state if this chunk is from the current turn.
          // Stale chunks after an interruption must not flip the state back to ai_speaking.
          if (gen === getGeneration()) {
            setSpeakerState("ai");
            setSessionState("ai_speaking");
          }
          break;
        }

        case "transcript.partial": {
          const e: TranscriptEntry = {
            id: makeId(),
            speaker: (msg.speaker as SpeakerState) || "ai",
            content: msg.content as string,
            timestamp: Date.now(),
            isFinal: false,
          };
          addTranscriptEntry(e);
          break;
        }

        case "transcript.final": {
          const speaker = (msg.speaker as SpeakerState) || "ai";
          if (speaker === "ai") {
            setSpeakerState("none");
            setSessionState("live");
          } else if (speaker === "user") {
            setSpeakerState("user");
            setSessionState("user_speaking");
          }
          const e: TranscriptEntry = {
            id: makeId(),
            speaker,
            content: msg.content as string,
            timestamp: Date.now(),
            isFinal: true,
          };
          addTranscriptEntry(e);
          break;
        }

        case "context.update":
          if (msg.topic) setCurrentTopic(msg.topic as string);
          if (msg.project) setActiveProject(msg.project as string);
          if (msg.skills) setMentionedSkills(msg.skills as string[]);
          break;

        case "interrupted":
          // flush() increments generationRef, stops all sources, and silences the gain node.
          // Any audio.chunk messages already buffered in the WS queue will be discarded
          // because their captured generation won't match the new one.
          flushAudio();
          setSpeakerState("user");
          setSessionState("user_speaking");
          break;

        case "session.ended":
          setSessionState("ended");
          setSpeakerState("none");
          break;

        case "error":
          console.error("Voice session error:", msg.content);
          setSessionState("error");
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
      flushAudio,
      enqueueAudio,
      getGeneration,
    ]
  );

  const stopMicInternal = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicActive(false);
  }, []);

  const startMic = useCallback(async (ws: WebSocket) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const nativeSampleRate = stream.getAudioTracks()[0]?.getSettings().sampleRate || 48000;
    const TARGET_RATE = 16000;

    const ctx = new AudioContext({ sampleRate: nativeSampleRate });
    audioCtxRef.current = ctx;
    console.log(`[voice] AudioContext sampleRate: ${ctx.sampleRate}, mic native: ${nativeSampleRate}`);

    await ctx.audioWorklet.addModule("/audio-processor.js");
    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, "audio-capture-processor");
    workletNodeRef.current = worklet;

    const resampleRatio = ctx.sampleRate / TARGET_RATE;
    let chunksSent = 0;

    worklet.port.onmessage = (e: MessageEvent) => {
      if (isMutedRef.current) return;
      if (ws.readyState !== WebSocket.OPEN) return;

      const inputPcm = new Int16Array(e.data.buffer as ArrayBuffer);
      let outputPcm: Int16Array;

      if (Math.abs(resampleRatio - 1.0) < 0.01) {
        outputPcm = inputPcm;
      } else {
        const outLen = Math.round(inputPcm.length / resampleRatio);
        outputPcm = new Int16Array(outLen);
        for (let i = 0; i < outLen; i++) {
          const srcIdx = Math.min(Math.round(i * resampleRatio), inputPcm.length - 1);
          outputPcm[i] = inputPcm[srcIdx];
        }
      }

      const b64 = toBase64(outputPcm.buffer);
      ws.send(JSON.stringify({ type: "audio.chunk", data: b64 }));
      chunksSent++;
      if (chunksSent % 100 === 0) {
        console.log(`[voice] ${chunksSent} audio chunks sent (ratio: ${resampleRatio.toFixed(2)})`);
      }
    };

    source.connect(worklet);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    worklet.connect(silentGain);
    silentGain.connect(ctx.destination);
    setMicActive(true);
    console.log(`[voice] Mic started, resample ratio: ${resampleRatio.toFixed(2)}`);
  }, []);

  const cleanupConnection = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    }
    stopMicInternal();
    stopAudio();
  }, [stopMicInternal, stopAudio]);

  const startSession = useCallback(async () => {
    cleanupConnection();

    activeRef.current = true;
    setSessionState("connecting");

    const ws = new WebSocket(WS_VOICE_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      if (!activeRef.current) return;
      try {
        await startMic(ws);
      } catch (e) {
        console.error("Mic error:", e);
        if (activeRef.current) setSessionState("error");
      }
    };

    ws.onmessage = (e) => handleMessage(e.data);

    ws.onerror = () => {
      if (!activeRef.current) return;
      console.error("Voice WebSocket connection error");
      setSessionState("error");
    };

    ws.onclose = () => {
      if (!activeRef.current) return;
      stopMicInternal();
      stopAudio();
      setSessionState("ended");
      setSpeakerState("none");
    };
  }, [cleanupConnection, startMic, stopMicInternal, stopAudio, handleMessage, setSessionState, setSpeakerState]);

  const sendText = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const e: TranscriptEntry = {
        id: makeId(),
        speaker: "user",
        content: text,
        timestamp: Date.now(),
        isFinal: true,
      };
      addTranscriptEntry(e);

      wsRef.current.send(JSON.stringify({ type: "transcript.user", content: text }));
    },
    [addTranscriptEntry]
  );

  const mute = useCallback(() => {
    isMutedRef.current = true;
    setIsMuted(true);
    streamRef.current?.getTracks().forEach((t) => { t.enabled = false; });
  }, []);

  const unmute = useCallback(() => {
    isMutedRef.current = false;
    setIsMuted(false);
    streamRef.current?.getTracks().forEach((t) => { t.enabled = true; });
  }, []);

  const endSession = useCallback(() => {
    activeRef.current = false;
    try {
      wsRef.current?.send(JSON.stringify({ type: "session.end" }));
    } catch { /* ws may already be closed */ }
    cleanupConnection();
    setSessionState("ended");
    setSpeakerState("none");
  }, [cleanupConnection, setSessionState, setSpeakerState]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cleanupConnection();
    };
  }, [cleanupConnection]);

  return {
    sessionState,
    sessionId,
    micActive,
    isMuted,
    startSession,
    sendText,
    mute,
    unmute,
    endSession,
  };
}
