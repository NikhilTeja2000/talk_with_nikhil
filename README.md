# Talk with Nikhil

A real-time AI portfolio built with Google ADK and Gemini Live. It opens like a terminal, boots into a live voice console, and lets users have an interruptible conversation with an AI version of Nikhil.

## Features

- Terminal-style boot UX
- Live voice conversation with interruption support
- Transcript console with speaker states
- Nikhil-specific retrieval over projects, experience, and stories
- Audio-reactive waveform visuals
- Text chat fallback
- Google Cloud-ready deployment

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Framer Motion, Web Audio API, Zustand |
| Backend | Python 3.11+, FastAPI, Google ADK, Gemini Live API, WebSocket |
| Data | JSON + Markdown knowledge base, keyword retrieval with scoring |
| Deploy | Docker, Google Cloud Run, Vercel/Firebase Hosting |

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd talk-with-nikhil
cp .env.example .env
# fill in your Google Cloud credentials in .env
```

### 2. Install everything

```bash
make install
```

This creates the Python venv, installs pip deps, and installs npm deps — one command.

### 3. Run both servers

```bash
make dev
```

Frontend on `http://localhost:3000`, backend on `http://localhost:8000`.

### 4. Fill in your data

Edit these files with your real info:

- `data/profile.json`
- `data/experience.json`
- `data/projects.json`
- `data/timeline.json`
- `data/faq.json`
- `data/links.json`
- `data/stories/*.md`

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
├── Makefile              # root orchestration
├── backend/              # Python + FastAPI + ADK agent
│   ├── agent/            # ADK root agent, tools, instructions
│   ├── retrieval/        # knowledge base loader + search
│   ├── routes/           # health, session, websocket endpoints
│   ├── prompts/          # persona definition
│   └── memory/           # session state store
├── frontend/             # Next.js + React + Tailwind
│   ├── app/              # pages (boot + talk)
│   ├── components/       # UI components
│   ├── hooks/            # mic, audio analyzer, live session
│   └── lib/              # types, store, websocket client, api
├── data/                 # knowledge base (JSON + Markdown)
│   ├── profile.json
│   ├── experience.json
│   ├── projects.json
│   └── stories/
└── scripts/              # dev helpers
```
