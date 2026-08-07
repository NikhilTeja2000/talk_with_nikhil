# Agent / developer handoff

> **Read this first** when picking up Talk with Nikhil in a new Cursor session, with another agent, or after time away. Then follow the doc map below.

---

## Doc reading order

| Order | File | Use for |
|-------|------|---------|
| 1 | [AGENTS.md](../AGENTS.md) | Pointer + quick facts |
| 2 | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Audio flow, WebSockets, file map, env checklist |
| 3 | [architecture.md](./architecture.md) | Schema, RAG, gap detection, V2 |
| 4 | [knowledge-organization.md](./knowledge-organization.md) | LinkedIn → `data/updates.json` → Supabase |
| 5 | [deployment.md](./deployment.md) | Deploy, cron keepalive, CORS |

**Skip unless needed:** `talk_with_nikhil_implementation_plan.md` (historical plan; may be stale).

---

## Production (as of last verified handoff)

| Piece | Value | Notes |
|-------|--------|--------|
| **Frontend URL** | https://talk-with-nikhil.vercel.app | May be on **orphaned** Vercel team — see below |
| **Backend URL** | https://talk-with-nikhil-api-679881662872.us-central1.run.app | Google Cloud Run, `us-central1` |
| **Voice WebSocket** | `wss://talk-with-nikhil-api-679881662872.us-central1.run.app/ws/voice` | Primary path — not `/ws/live` |
| **Health** | `GET /health` | Liveness |
| **Readiness** | `GET /readiness` | Gemini + Supabase + chunk count |
| **GitHub** | https://github.com/NikhilTeja2000/talk_with_nikhil | Source of truth |

### Supabase

| Field | Value |
|-------|--------|
| **Project name** | Minime |
| **Project ref** | `jlotqffilycaelvkonsg` |
| **Dashboard** | https://supabase.com/dashboard/project/jlotqffilycaelvkonsg |
| **Region** | us-east-2 |

Backend uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Frontend/cron may use `NEXT_PUBLIC_SUPABASE_*` on Vercel.

### Google Cloud

| Field | Value |
|-------|--------|
| **GCP project (docs)** | `clinivise2` |
| **Cloud Run service** | `talk-with-nikhil-api` |
| **Region** | `us-central1` |
| **Voice model** | `gemini-live-2.5-flash-native-audio` (Vertex AI) |

---

## Vercel access (important)

Two different Vercel contexts exist:

| Team | Slug | Status |
|------|------|--------|
| **Old (hosts live `.vercel.app`)** | `nikhils-projects-6e80771f` | **Lost access** — owner account deleted |
| **Current (MCP / Gmail account)** | `chntus2000-gmailcoms-projects` | Has other projects; **no** `talk-with-nikhil` project |

**Implications:**

- `talk-with-nikhil.vercel.app` may still serve traffic but **cannot be updated** without reclaiming the project or Vercel support.
- To regain control: **redeploy** `frontend/` from GitHub on an account you own, set env vars, update Cloud Run `ALLOWED_ORIGIN`.
- New deploy may get a **different** URL unless project name `talk-with-nikhil` is available again.
- Consider a **custom domain** long term.

**Cron keepalive:** `frontend/vercel.json` → `GET /api/cron/keepalive` daily. Requires deployed Vercel + env vars (see [deployment.md](./deployment.md)).

---

## Primary code paths (do not confuse)

```text
User → / → start → /talk
         useVoiceSession → WebSocket /ws/voice
         live_voice_session.py → Gemini Live + tools → Supabase

Alternate (text-only, not voice UI):
         useLiveSession → WebSocket /ws/live
```

**Audio:** mic PCM16 @ 16 kHz → server; AI PCM16 @ 24 kHz → browser. Barge-in via `interrupted` + client audio flush.

---

## Knowledge pipeline

```text
data/*.json, data/updates.json, data/stories/
    → python scripts/sync_data_to_supabase.py
    → Supabase source tables
    → python scripts/rebuild_chunks.py
    → knowledge_chunks (retrieval index)
```

From repo root:

```bash
make sync-knowledge
```

Or:

```bash
cd backend && source .venv/bin/activate
PYTHONPATH=. python scripts/sync_data_to_supabase.py
PYTHONPATH=. python scripts/rebuild_chunks.py
```

---

## Evaluation scope (what we have vs enterprise eval)

| Capability | Status |
|------------|--------|
| Live production agent | ✅ Gemini Live + tools |
| Session / transcript logging | ✅ `sessions`, `transcript_messages` |
| Post-turn quality signals | ✅ `GapDetector` → `question_events` |
| Admin human-in-the-loop fixes | ✅ Flagged questions → `knowledge_updates` |
| Full trace logging (LangSmith-style) | ❌ |
| Regression test dataset | ❌ |
| Model/prompt A/B comparison | ❌ |

Gap signals: `NO_CONTEXT_FOUND`, `LOW_RETRIEVAL_CONFIDENCE`, `EXPLICIT_UNCERTAINTY`, `GENERIC_ANSWER`.

---

## Local dev quick start

```bash
cp .env.example .env   # fill Google Cloud + Supabase keys
make install
make dev               # frontend :3000, backend :8000
```

Admin user (once):

```bash
cd backend && source .venv/bin/activate
PYTHONPATH=. python scripts/create_admin.py --email you@example.com --password '...'
```

Secrets live in **`.env`** (gitignored) and in **Vercel / Cloud Run** env — not in this repo.

---

## Common tasks for a new agent

| Task | Where to look |
|------|----------------|
| Change voice / tools behavior | `backend/agent/live_voice_session.py`, `backend/prompts/persona.md`, `backend/agent/tools/` |
| Fix retrieval | `backend/retrieval/search.py`, `knowledge_chunks`, `make sync-knowledge` |
| Add LinkedIn / recent activity | `data/updates.json`, [knowledge-organization.md](./knowledge-organization.md) |
| Admin API | `backend/routes/admin.py`, `frontend/app/admin/` |
| Cron / Supabase pause | `frontend/app/api/cron/keepalive/route.ts`, [deployment.md](./deployment.md) |
| CORS / prod wiring | Cloud Run `ALLOWED_ORIGIN`, Vercel `NEXT_PUBLIC_*` URLs |

---

## Verify prod is healthy

```bash
curl -s https://talk-with-nikhil-api-679881662872.us-central1.run.app/readiness | python3 -m json.tool
curl -s https://talk-with-nikhil.vercel.app/api/cron/keepalive | python3 -m json.tool
```

Expect `ready: true`, `supabase.ok: true`, `knowledge_base.chunks` > 0.

---

## When handing off to another agent

Paste this one-liner plus repo access:

```text
Read docs/HANDOFF.md and AGENTS.md first. Voice = /ws/voice only. Supabase = Minime (jlotqffilycaelvkonsg).
Old Vercel team lost; backend on Cloud Run is live. Knowledge sync = make sync-knowledge.
```
