# Talk with Nikhil

A real-time AI portfolio built with Google ADK and Gemini Live. It opens like a terminal, boots into a live voice console, and lets users have an interruptible conversation with an AI version of Nikhil.

## Features

- Terminal-style boot UX with `start`, `game`, and `login` commands
- Live voice conversation with interruption support
- Transcript console with speaker states
- Retrieval-augmented responses over Supabase knowledge base
- Audio-reactive waveform visuals
- Text chat fallback
- Admin dashboard with session monitoring, gap detection, and knowledge updates
- Conversation Learning Loop for continuous improvement

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Framer Motion, Web Audio API, Zustand |
| Backend | Python 3.11+, FastAPI, Google ADK, Gemini Live API, WebSocket |
| Database | Supabase (PostgreSQL), pgvector, pg_trgm |
| Auth | Supabase Auth (JWT) |
| Deploy | Docker, Google Cloud Run, Vercel |

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd talk-with-nikhil
cp .env.example .env
# Fill in Google Cloud, Supabase URL/keys in .env
```

### 2. Install everything

```bash
make install
```

### 3. Set up Supabase

Apply the migrations in `backend/supabase/migrations/` to your Supabase project, then seed the data:

```bash
cd backend
source .venv/bin/activate
python scripts/rebuild_chunks.py
```

### 4. Create admin user

```bash
python scripts/create_admin.py --email your@email.com --password YourPassword
```

### 5. Run both servers

```bash
make dev
```

Frontend on `http://localhost:3000`, backend on `http://localhost:8000`.

## Available Commands

| Command | What it does |
|---------|--------------|
| `make install` | Set up venv + pip deps + npm deps |
| `make dev` | Start backend + frontend in parallel |
| `make build` | Production build of frontend |
| `make clean` | Remove venv, node_modules, .next |
| `make dev-backend` | Start only the backend |
| `make dev-frontend` | Start only the frontend |

## Project Structure

```
talk-with-nikhil/
├── Makefile                  # root orchestration
├── .env.example              # environment variable template
├── docker-compose.yml        # container setup
│
├── backend/
│   ├── main.py               # FastAPI entrypoint
│   ├── config.py             # Pydantic settings (Google Cloud, Supabase)
│   ├── agent/                # ADK root agent, tools, instructions
│   │   ├── root_agent.py     # Gemini agent with persona + 5 tools
│   │   ├── live_session.py   # session lifecycle + Supabase persistence
│   │   ├── instructions.py   # persona loader + context builder
│   │   └── tools/            # search, projects, experience, timeline, links
│   ├── retrieval/            # Supabase-backed knowledge search
│   │   ├── search.py         # keyword search over knowledge_chunks table
│   │   └── chunk_builder.py  # builds chunks from source tables
│   ├── evaluation/           # answer quality evaluation
│   │   └── gap_detector.py   # flags weak/missing answers
│   ├── storage/              # Supabase clients + conversation persistence
│   │   ├── supabase_client.py
│   │   └── conversation_store.py
│   ├── routes/               # API endpoints
│   │   ├── health.py         # health check
│   │   ├── session.py        # session create/end
│   │   ├── websocket.py      # live WebSocket handler
│   │   ├── auth.py           # admin login/refresh/me
│   │   └── admin.py          # dashboard API (sessions, flagged, profile, stats)
│   ├── prompts/persona.md    # agent personality definition
│   ├── scripts/              # one-time setup scripts
│   │   ├── create_admin.py
│   │   └── rebuild_chunks.py
│   └── supabase/migrations/  # SQL migration files
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # boot terminal (start/game/login)
│   │   ├── talk/page.tsx     # live conversation page
│   │   ├── admin/page.tsx    # admin dashboard
│   │   └── game/page.tsx     # dino runner game
│   ├── components/           # UI components + admin components
│   ├── hooks/                # useMicInput, useAudioAnalyzer, useLiveSession
│   └── lib/                  # api, stores, types, websocket client
│
├── data/                     # source knowledge (JSON + Markdown)
│   ├── profile.json
│   ├── experience.json
│   ├── projects.json
│   ├── faq.json
│   ├── timeline.json
│   ├── links.json
│   └── stories/*.md
│
└── docs/
    └── architecture.md       # living architecture document
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system architecture.
