# Talk with Nikhil — Full Implementation Plan

## 1) Project idea

**Talk with Nikhil** is a real-time AI portfolio experience where users open a terminal-style website, type `start`, and begin a live, interruptible voice conversation with an AI version of Nikhil.

The product is not a normal portfolio website. It is a **live AI console** that lets recruiters, founders, collaborators, and friends talk to Nikhil's work, projects, journey, and thinking style.

---

## 2) Product goal

Build a **real-time, interruptible, voice-first AI portfolio** using:

- **Google ADK**
- **Gemini Live API**
- **Google Cloud**
- a custom terminal-inspired frontend
- a retrieval layer over Nikhil's personal knowledge base

### Core user flow

1. User opens the website.
2. A terminal-style boot sequence starts.
3. The site shows `enter command`.
4. User types `start`.
5. A live session begins.
6. The user talks naturally.
7. The agent responds in Nikhil's style.
8. The user can interrupt mid-response.
9. The UI shows speaker-reactive waves and transcript logs.
10. User can end the session and return to terminal mode.

---

## 3) MVP scope

### Must-have

- terminal-style boot screen
- `start` command input
- live voice conversation
- interruption support
- transcript console
- Nikhil-specific responses using retrieval
- end call control
- Google Cloud deployment

### Should-have

- user vs AI speaker states
- audio-reactive visuals
- context panel for project/topic info
- polished transitions

### Nice-to-have

- vision mode
- show resume / screenshot / code and ask questions
- session memory across conversations
- animated orb / lightweight 3D core

---

## 4) Tech stack

## Frontend

- **Next.js 15+**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**
- **Web Audio API** for waveform/frequency visualization
- optional **Canvas API** for audio rendering
- optional **React Three Fiber** later for center orb visuals

### Why

This keeps the UI fast, modern, and easier to control than a full Three.js-first experience.

---

## Backend

- **Python 3.11+**
- **FastAPI**
- **Google ADK**
- **Gemini Live API / Vertex AI Live**
- **WebSocket** streaming endpoint
- **Pydantic** for schema validation

### Why

Python + ADK is the best fit for the agent layer, retrieval tools, and live session orchestration.

---

## Knowledge and retrieval

- local **JSON** files for structured profile/project/experience data
- local **Markdown** files for stories and narrative content
- simple retrieval layer first
- optional vector indexing later

### Why

You do not need model training. You need a grounded knowledge base + retrieval.

---

## Deployment

- **Google Cloud Run** for backend
- **Firebase Hosting** or **Vercel** for frontend
- optional **Google Cloud Storage** for assets
- optional **Firestore** for logs and memory

---

## 5) Architecture overview

```text
User Browser
   ↓
Next.js Frontend
   ↓ WebSocket / API
FastAPI Backend
   ↓
ADK Agent
   ↓
Gemini Live API
   ↓
Tools + Retrieval Layer
   ↓
JSON / Markdown Knowledge Base
```

### Responsibility split

#### Frontend
- visual shell
- boot sequence
- transcript rendering
- live audio UI
- mic permissions
- session controls
- waveform rendering

#### Backend
- session orchestration
- ADK agent lifecycle
- live streaming bridge
- retrieval tools
- prompt assembly
- transcript/state management

#### Knowledge layer
- profile facts
- project details
- experience summaries
- timeline
- stories
- FAQs

---

## 6) Repo structure

```text
talk-with-nikhil/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── public/
│   │   ├── favicon.ico
│   │   └── og-image.png
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── talk/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── ConsoleShell.tsx
│   │   ├── BootSequence.tsx
│   │   ├── CommandInput.tsx
│   │   ├── SessionStatusBar.tsx
│   │   ├── VoiceCore.tsx
│   │   ├── AudioVisualizer.tsx
│   │   ├── TranscriptConsole.tsx
│   │   ├── ContextPanel.tsx
│   │   └── CallControls.tsx
│   │
│   ├── hooks/
│   │   ├── useAudioAnalyzer.ts
│   │   ├── useMicInput.ts
│   │   └── useLiveSession.ts
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   ├── constants.ts
│   │   └── types.ts
│   │
│   └── styles/
│       └── globals.css
│
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── main.py
│   ├── config.py
│   │
│   ├── prompts/
│   │   └── persona.md
│   │
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── root_agent.py
│   │   ├── live_session.py
│   │   ├── instructions.py
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── search_about_nikhil.py
│   │       ├── get_project_details.py
│   │       ├── get_experience_details.py
│   │       ├── get_timeline_event.py
│   │       └── get_links.py
│   │
│   ├── retrieval/
│   │   ├── __init__.py
│   │   ├── loader.py
│   │   ├── chunker.py
│   │   ├── search.py
│   │   └── ranker.py
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── session_store.py
│   │   └── user_memory.py
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── session.py
│   │   └── websocket.py
│   │
│   └── utils/
│       ├── logger.py
│       ├── formatting.py
│       └── validators.py
│
├── data/
│   ├── profile.json
│   ├── experience.json
│   ├── projects.json
│   ├── timeline.json
│   ├── faq.json
│   ├── links.json
│   └── stories/
│       ├── about-me.md
│       ├── proudest-project.md
│       ├── why-startups.md
│       ├── why-ai-agents.md
│       ├── soti.md
│       ├── itsc.md
│       └── clinivise.md
│
├── docs/
│   ├── architecture.md
│   ├── frontend-spec.md
│   ├── backend-spec.md
│   ├── retrieval-plan.md
│   ├── deployment.md
│   └── demo-script.md
│
└── scripts/
    ├── validate_data.py
    ├── seed_data.py
    └── dev.sh
```

---

## 7) Frontend implementation

## Visual design

### Theme
- black / charcoal background
- terminal-style typography
- subtle glow
- cinematic transitions
- no dashboard cards everywhere
- minimal and immersive

### UX flow

#### Screen A: boot
Show animated terminal logs:

```bash
> booting talk-with-nikhil...
> loading profile...
> loading projects...
> loading experience...
> voice interface ready
> enter command: _
```

#### Screen B: connect
After user types `start`:
- boot fades out
- status becomes connecting
- central pulse appears
- transcript and controls fade in

#### Screen C: live
Three-column layout:
- left: transcript console
- center: wave / orb / audio-reactive visualization
- right: context panel
- bottom-right: end/mute/mic

---

## Frontend pages

### `frontend/app/page.tsx`
Landing + boot shell.

Responsibilities:
- show boot sequence
- accept `start`
- navigate to live experience or activate live mode inline

### `frontend/app/talk/page.tsx`
Main conversation screen.

Responsibilities:
- start session
- manage live UI
- render transcript and speaker visuals

---

## Frontend components

### `ConsoleShell.tsx`
Frame layout, top status bar, global shell styling.

### `BootSequence.tsx`
Fake terminal typing animation.

### `CommandInput.tsx`
Handles `start` command.

### `SessionStatusBar.tsx`
Displays:
- booting
- ready
- connecting
- live
- listening
- ai speaking
- user speaking
- interrupted
- ended

### `VoiceCore.tsx`
Main animated center visual.

### `AudioVisualizer.tsx`
Reads analyser data and renders waveform/frequency visuals.

### `TranscriptConsole.tsx`
Shows transcript lines like terminal logs.

### `ContextPanel.tsx`
Shows:
- current topic
- highlighted project
- skills mentioned
- links

### `CallControls.tsx`
Displays:
- mic
- mute
- end
- optional transcript toggle

---

## Frontend state model

```ts
export type SessionState =
  | "booting"
  | "ready"
  | "connecting"
  | "live"
  | "listening"
  | "ai_speaking"
  | "user_speaking"
  | "interrupted"
  | "ended";

export type SpeakerState = "none" | "user" | "ai";
```

---

## Frontend hooks

### `useMicInput.ts`
- request mic access
- expose audio stream
- expose permission state

### `useAudioAnalyzer.ts`
- create analyser node
- return time-domain and frequency-domain data
- calculate intensity metrics for UI animation

### `useLiveSession.ts`
- create socket session
- send/receive events
- manage transcript
- manage state transitions

---

## 8) Backend implementation

## `backend/main.py`
FastAPI entrypoint.

Responsibilities:
- create app
- register routers
- health endpoint
- websocket endpoint
- startup config

---

## `backend/config.py`
Stores env config:
- project ID
- region
- model name
- API keys if needed
- CORS origin
- runtime flags

---

## `backend/prompts/persona.md`
Defines how Nikhil AI should behave.

### Example content

```md
You are Talk with Nikhil, a live AI version of Nikhil Teja Chilakabattina.

Speak naturally and conversationally.
Use first person when discussing Nikhil's story, projects, work, and goals.
Stay grounded and accurate.
Do not invent roles, projects, achievements, or facts.
Prefer clear, thoughtful, direct answers.
Sound like a real builder, not a marketing bot.
When relevant, use retrieved project, experience, and story context.
```

---

## `backend/agent/root_agent.py`
Builds the ADK root agent.

Responsibilities:
- load persona
- attach tools
- configure live behavior
- prepare instructions

---

## `backend/agent/instructions.py`
Builds system instructions from:
- persona
- session context
- current conversation state

---

## `backend/agent/live_session.py`
Handles live session helpers:
- initialize session
- manage interruptions
- map session events
- route transcript updates

---

## Tools

### `search_about_nikhil.py`
Search all knowledge sources by query.

### `get_project_details.py`
Return project details for a named project.

### `get_experience_details.py`
Return job/role details.

### `get_timeline_event.py`
Return journey/timeline snippets.

### `get_links.py`
Return GitHub, LinkedIn, demo, resume links.

---

## Routes

### `routes/health.py`
Health check.

### `routes/session.py`
Create/close sessions.

### `routes/websocket.py`
Main live connection route.

Responsibilities:
- receive client events
- stream model responses
- send transcript updates
- send speaker state events
- send context highlights

---

## 9) Knowledge base design

You do **not** train the model on yourself.

You create a **knowledge base about you**.

---

## `data/profile.json`
Contains:
- name
- headline
- location
- current focus
- core skills
- interests

### Example

```json
{
  "name": "Nikhil Teja Chilakabattina",
  "product_name": "Talk with Nikhil",
  "headline": "Full-stack developer and AI builder focused on intelligent real-world products",
  "location": "San Jose, California",
  "current_focus": [
    "AI agents",
    "real-time multimodal systems",
    "healthcare analytics",
    "browser automation"
  ],
  "core_skills": [
    "React",
    "Next.js",
    "TypeScript",
    "Python",
    "FastAPI",
    "Node.js",
    "SQL",
    "AWS",
    "Supabase",
    "Google Cloud"
  ]
}
```

---

## `data/experience.json`
Contains each role with:
- company
- role
- period
- summary
- highlights
- stack

---

## `data/projects.json`
Contains each project with:
- name
- summary
- problem
- solution
- stack
- features
- architecture notes
- links
- lessons learned

---

## `data/timeline.json`
Contains journey milestones.

Example:
- VIT
- SOTI
- UC
- ITSC
- Clinivise
- hackathons
- AI/agent exploration

---

## `data/faq.json`
Pre-written answer anchors for common questions:
- tell me about yourself
- what are you working on now
- why startups
- what are your strengths
- what are your proudest projects
- what kind of roles are you looking for

---

## `data/stories/*.md`
Long-form narrative content.

Use for:
- personal story
- challenges
- decisions
- lessons
- startup motivations

---

## 10) Retrieval system

## Goal
Provide the model with only the most relevant personal context at runtime.

### MVP retrieval approach

1. Load all JSON and markdown files.
2. Convert them into chunks.
3. Search using simple keyword + scoring.
4. Return top matches.
5. Feed matches into tool output / prompt context.

### Later upgrade
- embeddings
- vector store
- reranking
- session memory merge

---

## `retrieval/loader.py`
- load JSON files
- load markdown files
- normalize documents

## `retrieval/chunker.py`
- split markdown into chunks
- preserve titles and source names

## `retrieval/search.py`
- keyword match
- exact phrase bonus
- title bonus
- skill/tag bonus

## `retrieval/ranker.py`
- order chunks
- cap top N

---

## 11) Session and memory model

## Session memory
Use for current conversation only.

Store:
- current topic
- active project
- recent questions
- turn history
- current speaker state

## Long-term memory
Optional later.

Possible use:
- user returned again
- remember recruiter preferences
- remember what they asked last time

### MVP recommendation
Use:
- simple session state first
- no heavy memory system at the start

---

## 12) WebSocket event model

Suggested client/server events:

### Client → server
- `session.start`
- `audio.chunk`
- `session.interrupt`
- `session.end`
- `transcript.user`

### Server → client
- `session.ready`
- `session.state`
- `speaker.state`
- `transcript.partial`
- `transcript.final`
- `context.update`
- `error`
- `session.ended`

---

## 13) Visual behavior rules

## Idle
- soft breathing pulse
- low ambient waveform
- status = ready or awaiting input

## User speaking
- sharper, more reactive waveform
- warmer/brighter visuals
- status = listening

## AI speaking
- smoother wave pulses
- cooler/cyan visuals
- status = Nikhil responding

## Interrupted
- AI wave cuts
- user wave takes over
- transcript pauses and continues cleanly

---

## 14) Environment variables

## Root `.env.example`

```env
# frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/live

# backend
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_LIVE_MODEL=gemini-live-model-name
APP_ENV=development
ALLOWED_ORIGIN=http://localhost:3000
```

---

## 15) README.md

```md
# Talk with Nikhil

Talk with Nikhil is a real-time AI portfolio built with Google ADK and Gemini Live.
It opens like a terminal, boots into a live voice console, and lets users have an interruptible conversation with an AI version of Nikhil.

## Features

- terminal-style boot UX
- live voice conversation
- interruption support
- transcript console
- Nikhil-specific retrieval over projects, experience, and stories
- Google Cloud-ready deployment

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Web Audio API

### Backend
- Python
- FastAPI
- Google ADK
- Gemini Live API
- WebSocket streaming

### Data
- JSON
- Markdown
- retrieval tools

## Project Structure

See the repo tree in this document.

## Local Development

### 1. Clone repo
```bash
git clone <repo-url>
cd talk-with-nikhil
```

### 2. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Add your data
Fill these files:
- `data/profile.json`
- `data/experience.json`
- `data/projects.json`
- `data/timeline.json`
- `data/faq.json`
- `data/stories/*.md`

### 5. Run the app
- frontend on port 3000
- backend on port 8000

## MVP Milestones

1. boot terminal UI
2. start command
3. backend live session
4. transcript + speaker states
5. retrieval-grounded responses
6. deploy to Cloud Run

## Vision

This project turns a static portfolio into a live, natural conversation.
Instead of reading about Nikhil, people can talk to him.
```

---

## 16) Build order

## Phase 1 — repo and knowledge base

### Do first
- create folder structure
- write `persona.md`
- fill `profile.json`
- fill `experience.json`
- fill `projects.json`
- write `about-me.md`

### Goal
Get the content layer ready.

---

## Phase 2 — retrieval

### Build
- `loader.py`
- `chunker.py`
- `search.py`
- `search_about_nikhil.py`

### Goal
Given a question like `tell me about your best project`, return the right chunks.

---

## Phase 3 — backend live agent

### Build
- FastAPI app
- session route
- websocket route
- ADK root agent
- live session helper

### Goal
Get a backend that can manage live conversations.

---

## Phase 4 — frontend shell

### Build
- boot sequence
- command input
- shell layout
- transcript UI
- call controls

### Goal
Get the product feeling right.

---

## Phase 5 — audio-reactive visuals

### Build
- mic capture
- analyser node hook
- waveform renderer
- AI/user speaker states

### Goal
Make the conversation feel alive.

---

## Phase 6 — integration

### Build
- wire frontend to backend
- session lifecycle
- transcript streaming
- interruption handling
- end call

### Goal
User can actually talk to Nikhil AI.

---

## Phase 7 — deployment

### Build
- backend Dockerfile
- Cloud Run deploy
- frontend hosting
- env config
- prod testing

### Goal
Hackathon-ready demo.

---

## 17) First files to write now

### Highest priority

1. `backend/prompts/persona.md`
2. `data/profile.json`
3. `data/experience.json`
4. `data/projects.json`
5. `data/stories/about-me.md`
6. `backend/retrieval/loader.py`
7. `backend/retrieval/search.py`
8. `backend/agent/tools/search_about_nikhil.py`

---

## 18) Suggested future additions

After MVP works:
- camera/screen input
- resume upload and live explanation
- auto-surfaced project cards
- long-term memory
- voice customization
- lightweight central 3D orb
- recruiter mode / founder mode / friend mode

---

## 19) Final product statement

**Talk with Nikhil** is a terminal-style, real-time AI portfolio built with ADK and Gemini Live, where users can interrupt, ask questions naturally, and explore Nikhil's projects, story, and work through a live conversation instead of a static website.

