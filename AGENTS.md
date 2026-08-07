# Agent instructions — Talk with Nikhil

Before exploring the codebase, **read these docs in order**:

1. **[docs/HANDOFF.md](docs/HANDOFF.md)** — Prod URLs, Supabase/Vercel/GCP context, eval scope, common tasks (start here for handoffs).
2. **[docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)** — Low-level map: routes, `/ws/voice` vs `/ws/live`, audio pipeline (16k in / 24k out), barge-in, backend modules, RAG, admin, env vars.
3. **[docs/architecture.md](docs/architecture.md)** — Schema, layers, gap detection, V2 plans.
4. **[docs/deployment.md](docs/deployment.md)** — Production deploy, cron keepalive.
5. **[docs/knowledge-organization.md](docs/knowledge-organization.md)** — LinkedIn / `data/updates.json` → Supabase sync.

## Quick facts

- **Primary user path:** `/` → `start` → `/talk` → `useVoiceSession` → **`/ws/voice`** → `live_voice_session.py` → Gemini Live.
- **Do not confuse** `/ws/live` (text-only, `useLiveSession`) with `/ws/voice` (audio).
- **Audio:** mic PCM16 @ 16kHz to server; AI reply PCM16 @ 24kHz to browser.
- **Data:** Supabase `knowledge_chunks` + tools; sessions/transcripts in `conversation_store`.

Only dive into source files when the docs are insufficient or you are changing behavior.
