# Agent instructions — Talk with Nikhil

Before exploring the codebase for architecture, audio flow, or WebSocket behavior, **read these docs first**:

1. **[docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** — Low-level map: routes, `/ws/voice` vs `/ws/live`, audio pipeline (16k in / 24k out), barge-in, backend modules, RAG, admin, env vars.
2. **[docs/architecture.md](docs/architecture.md)** — Schema, layers, gap detection, V2 plans.
3. **[docs/deployment.md](docs/deployment.md)** — Production deploy.

## Quick facts

- **Primary user path:** `/` → `start` → `/talk` → `useVoiceSession` → **`/ws/voice`** → `live_voice_session.py` → Gemini Live.
- **Do not confuse** `/ws/live` (text-only, `useLiveSession`) with `/ws/voice` (audio).
- **Audio:** mic PCM16 @ 16kHz to server; AI reply PCM16 @ 24kHz to browser.
- **Data:** Supabase `knowledge_chunks` + tools; sessions/transcripts in `conversation_store`.

Only dive into source files when the docs are insufficient or you are changing behavior.
