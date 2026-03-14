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
   +-- ADK Agent (Gemini Live)
   |      |
   |      +-- 5 retrieval tools
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

The primary product. A user opens the terminal, types `start`, and enters a live conversation.

**Frontend flow:**
- `page.tsx` (boot) --> `talk/page.tsx` (live session)
- `useMicInput` captures audio
- `useLiveSession` manages WebSocket connection
- `useAudioAnalyzer` drives waveform visuals
- Zustand store manages session/speaker state

**Backend flow:**
- WebSocket at `/ws/live` receives `session.start`, `transcript.user`, `session.end`
- `LiveSessionManager` creates an ADK `Runner` per session
- `Runner.run_async()` sends text to Gemini, which may call retrieval tools
- Responses stream back over WebSocket as `transcript.final`

**ADK Agent:**
- Model: `gemini-2.0-flash-live-001`
- Persona: `backend/prompts/persona.md`
- Tools: `search_about_nikhil`, `get_project_details`, `get_experience_details`, `get_timeline_event`, `get_links`
- Session memory: `InMemorySessionService` (automatic conversation history within one session)

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

Persistence is wired into `LiveSessionManager.process_text()`:
1. User message saved to `transcript_messages`
2. Turn count incremented
3. AI response saved to `transcript_messages`
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
GEMINI_LIVE_MODEL=gemini-2.0-flash-live-001
ALLOWED_ORIGIN=http://localhost:3000
```
