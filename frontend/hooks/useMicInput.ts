"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface MicInputState {
  stream: MediaStream | null;
  isActive: boolean;
  permissionState: PermissionState | "unknown";
  error: string | null;
}

export function useMicInput() {
  const [state, setState] = useState<MicInputState>({
    stream: null,
    isActive: false,
    permissionState: "unknown",
    error: null,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;
      setState({
        stream,
        isActive: true,
        permissionState: "granted",
        error: null,
      });
      return stream;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone access denied";
      setState((s) => ({
        ...s,
        permissionState: "denied",
        error: message,
      }));
      return null;
    }
  }, []);

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setState({
      stream: null,
      isActive: false,
      permissionState: "granted",
      error: null,
    });
  }, []);

  const toggleMute = useCallback((muted: boolean) => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { ...state, requestMic, stopMic, toggleMute };
}
