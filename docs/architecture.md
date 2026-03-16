# Talk with Nikhil -- Architecture

## System Overview

```
User Browser
   |
   v
Next.js Frontend (port 3000)
   | WebSocket + REST
   v
FastAPI Backend (port 8000)
   |
   +-- Voice Agent (Gemini Live API, native audio)
   |      |
   |      +-- /ws/voice (bidirectional audio + barge-in)
   |      +-- 5 retrieval tools (function calling)
   |             |
   |             v
   |        KnowledgeSearch --> Supabase (knowledge_chunks)
   |
   +-- ConversationStore --> Supabase (sessions, transcripts, question_events)
   |
   +-- GapDetector --> flags weak answers --> question_events
   |
   +-- Admin Auth --> Supabase Auth (JWT)

Supabase (PostgreSQL)
   |
   +-- Knowledge tables (profiles, experiences, projects, faqs, timeline_events, stories, links)
   +-- knowledge_chunks (retrieval index, pg_trgm + pgvector ready)
   +-- sessions, transcript_messages, question_events, knowledge_updates
   +-- auth.users (admin accounts)
```

## Layers

### 1. Core Voice Experience

The primary product. A user opens the terminal, types `start`, and enters a live, interruptible voice conversation.

**Frontend flow:**
- `page.tsx` (boot) --> `talk/page.tsx` (live session)
- `useVoiceSession` opens a WebSocket to `/ws/voice`
- AudioWorklet captures mic audio and converts Float32 → Int16 PCM
- Audio is resampled to the required rate before sending
- `useAudioPlayer` decodes PCM audio chunks from Gemini and plays them via Web Audio
- Zustand store manages session/speaker state

**Backend flow:**
- WebSocket at `/ws/voice` bridges browser ↔ Gemini Live API
- Backend forwards raw PCM input audio to Gemini Live
- Gemini returns raw PCM output audio + transcription events
- Backend persists sessions/transcripts and runs gap detection after each AI turn

**Gemini Live (native audio):**
- Voice model: `gemini-live-2.5-flash-native-audio`
- Persona + behavioral rules: `backend/prompts/persona.md` (system instruction)
- Tool calling: `search_about_nikhil`, `get_project_details`, `get_experience_details`, `get_timeline_event`, `get_links`
- Audio formats:
  - Input: raw 16-bit PCM @ 16kHz, little-endian (`audio/pcm;rate=16000`)
  - Output: raw 16-bit PCM @ 24kHz, little-endian

**Interruptions / Barge-in (interruptible conversation):**
- Gemini emits an `interrupted` signal when the user starts speaking while the model is speaking.
- Backend prioritizes `interrupted` events and suppresses forwarding any “tail audio” from the interrupted response.
- Frontend flushes queued audio immediately so the old answer stops and the new answer can play cleanly.

### 2. Knowledge & Retrieval

All knowledge lives in Supabase, organized in two tiers:

**Source tables** (human-readable, admin-editable):
- `profiles`, `experiences`, `projects`, `faqs`, `timeline_events`, `stories`, `links`

**Index table** (agent-searchable):
- `knowledge_chunks` -- generated from source tables via `rebuild_chunks.py`
- Indexed with `pg_trgm` for keyword search
- `pgvector` column ready for future embedding-based search

**Search:** `KnowledgeSearch` in `retrieval/search.py` queries `knowledge_chunks` with term extraction, scoring (title bonus, tag bonus, exact phrase bonus, type weights).

**Rebuild flow:** When knowledge changes (admin edits profile, resolves a gap), run `rebuild_chunks.py` or call `chunk_builder.rebuild_all()` to regenerate all chunks.

### 3. Session Persistence

Every conversation is persisted to Supabase:

- `sessions` -- metadata (id, start/end time, turn count, topics, user agent, IP, status)
- `transcript_messages` -- every user and AI message with timestamps
- `question_events` -- per-question analytics (retrieval score, confidence, gap flags)

Persistence is wired into the voice session flow:
1. User speech transcription saved to `transcript_messages`
2. Turn count incremented
3. AI response transcription saved to `transcript_messages`
4. Gap detector evaluates and creates `question_events`

### 4. Gap Detection (Conversation Learning Loop)

After each AI response, `GapDetector.evaluate()` checks for weak answers:

**Signals:**
- `NO_CONTEXT_FOUND` -- retrieval returned 0 results
- `LOW_RETRIEVAL_CONFIDENCE` -- top score below threshold
- `EXPLICIT_UNCERTAINTY` -- AI used hedging language
- `GENERIC_ANSWER` -- answer too short or vague

Flagged questions appear in the admin dashboard for resolution.

### 5. Admin Dashboard

Accessible via `login` command in the terminal. Uses Supabase Auth (email/password).

**Tabs:**
- **Overview** -- stats (total sessions, active, open flags, total questions)
- **Sessions** -- list with transcript viewer
- **Flagged** -- unanswered/weak questions with resolve workflow
- **Profile** -- view/edit profile data

**Auth flow:**
- Frontend sends email/password to `/api/auth/login`
- Backend authenticates via Supabase Auth, returns JWT
- Frontend stores token in Zustand (localStorage persisted)
- All `/api/admin/*` routes require `Authorization: Bearer <token>`

### 6. Knowledge Update Loop

When admin resolves a flagged question:
1. Admin provides correct answer in dashboard
2. Backend saves to `knowledge_updates` table
3. On "apply", answer is inserted into appropriate source table (e.g. new FAQ)
4. `knowledge_chunks` are rebuilt
5. Next conversation, retrieval finds the new knowledge

### 7. WhatsApp Escalation (planned)

Future layer for real-time admin notification:
- High-severity gaps trigger WhatsApp message to admin
- Admin can reply with the answer
- Reply is captured and processed as a knowledge update

## V2 (Planned) Features

These are intentionally **not required for the current hackathon demo**, but are the next upgrades.

### Owner escalation via Telegram / WhatsApp (Human-in-the-loop)

- When the agent flags a gap (low confidence / missing context), it can notify Nikhil on **Telegram** (or WhatsApp).
- Nikhil replies with the correct answer.
- The system stores that reply as a `knowledge_update` and optionally sends a follow-up to the user if the session is still active.

### Preferences management UI (Admin)

- We added a `preferences` table + retrieval tool (`get_preferences`) to ground “what do you like?” questions without guessing.
- The dedicated **Preferences editor UI** is currently hidden to keep admin UX simple (4 tabs) for the demo.
- In V2, it becomes a full admin section for editing preferences + one-click chunk rebuild.

### Automated deployment (IaC / scripts)

- Cloud Run deployment scripts or infrastructure-as-code (Terraform / Pulumi) for one-command backend deploy.
- Vercel deployment automation (env sync + preview URLs) and a reproducible judge flow.

## Database Schema

12 tables with Row Level Security:

| Table | Purpose | Public Access |
|-------|---------|---------------|
| profiles | Nikhil's personal info | SELECT |
| experiences | Work history | SELECT (active) |
| projects | Project details | SELECT (active) |
| faqs | Common Q&A | SELECT (active) |
| timeline_events | Career milestones | SELECT (active) |
| stories | Long-form narratives | SELECT (active) |
| links | External URLs | SELECT (active) |
| knowledge_chunks | Retrieval index | SELECT (active) |
| sessions | Conversation metadata | INSERT, SELECT, UPDATE |
| transcript_messages | Chat messages | INSERT, SELECT |
| question_events | Per-question analytics | INSERT, SELECT |
| knowledge_updates | Admin corrections | Authenticated only |

## Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GEMINI_LIVE_MODEL=gemini-2.5-flash
GEMINI_VOICE_MODEL=gemini-live-2.5-flash-native-audio
ALLOWED_ORIGIN=http://localhost:3000
```

## Architecture Diagram (Mermaid)
```mermaid
flowchart LR
  U[User] -->|mic audio and UI| FE[Frontend<br/>Next.js]

  subgraph Frontend["Browser"]
    FE -->|getUserMedia and AudioWorklet| AW[Audio capture<br/>PCM16 16kHz]
    FE -->|WebSocket /ws/voice| CR[FastAPI backend<br/>Cloud Run]
  end

  subgraph Backend["Google Cloud Run"]
    CR -->|realtime session| LIVE[Gemini Live<br/>native audio model]
    CR -->|tool calls and persistence| SB[(Supabase<br/>Postgres)]
  end

  subgraph Model["Google AI Layer"]
    LIVE
  end

  AW -->|audio chunks| CR
  CR -->|stream audio| LIVE
  LIVE -->|audio reply and transcript events| CR
  CR -->|audio and transcript updates| FE
  FE -->|play reply| U

  LIVE -->|function call| CR
  CR -->|search_about_nikhil / get_project_details / get_links| SB
  SB -->|retrieved facts| CR
  CR -->|tool response| LIVE

  CR -->|save session, transcript, question events, knowledge updates| SB
  ```