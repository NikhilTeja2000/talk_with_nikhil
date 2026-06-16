# Knowledge organization (for the AI agent)

How LinkedIn posts and recent activity are structured so **Talk with Nikhil** can answer correctly—not confuse a hackathon win with a job, or a shared news post with a credential.

## Source of truth

| File | Role |
|------|------|
| `data/updates.json` | Curated recent activity (LinkedIn → structured facts) |
| `data/projects.json` | Long-lived portfolio projects |
| `data/timeline.json` | Career arc (education → jobs → direction) |
| `data/faq.json` | Stable personality / background Q&A |

**Pipeline:** `sync_data_to_supabase.py` → Supabase tables → `rebuild_chunks.py` → `knowledge_chunks` (what retrieval searches).

## Activity types (`updates.json` → `type`)

| `type` | Meaning | Agent should… |
|--------|---------|----------------|
| `cohort` | Joined a program (FlowHouse, accelerator) | Say "selected for / in cohort", not "built the program" |
| `hackathon_project` | Shipped submission for a hackathon | Link to **project** slug; describe what was built |
| `hackathon_outcome` | Win, board, credits (same hackathon arc) | Be precise on prize level; tie to `related_project_slug` |
| `project_launch` | Shipped product (Ramudu-Sita, etc.) | Treat as **portfolio project** |
| `learning` | **Nikhil completed** course/badge | OK to say he earned/learned it |
| `learning_share` | Post about **industry news** | **Do not** attribute cert to Nikhil |
| `event` | Attended workshop/meetup | Say attended/demoed, not "founded the event" |
| `side_build` | Quick experiment | Lower priority vs core projects |

## `entity_kind` (finer grain)

Used inside FAQ answers for disambiguation: `portfolio_project`, `achievement`, `program_selection`, `certification`, `industry_news`, `community_event`, `experiment`.

## Linking rules

- **`related_project_slug`** — When set, prefer `get_project_details` / project chunks for depth.
- **Same hackathon, multiple posts** — `amazon-nova-hackathon-*` entries share `medicaid-analytics-agent`; agent merges into one story.
- **`learning_share`** — Never merge into Nikhil's credentials.

## What gets synced where

| Update field | Supabase target |
|--------------|-----------------|
| `project_payload` present | `projects` (by `slug`) |
| Every entry | `faqs` slug `update-{id}`, topic `recent_{type}` |
| (auto) | FAQ `recent-activity-summary` — rollup for "what are you up to?" |

## Adding a new LinkedIn post

You do **not** need to design the JSON structure yourself — paste the post (or embed URL) and add one object to `data/updates.json`, or ask Cursor to draft the entry using the types above.

### Steps

1. **Paste** the LinkedIn post text or embed URL.
2. **Add** one entry to `data/updates.json`:
   - Pick `type` from the table above (`cohort`, `hackathon_project`, `learning_share`, etc.).
   - Write a short factual `summary` (no hashtag spam).
   - Fill `agent_guidance` (`when_to_mention`, `do_not_say`, `clarify`).
   - Set `related_project_slug` if it ties to an existing/new project.
   - Add `project_payload` **only** for real portfolio builds.
3. **Sync to Supabase** (one command from repo root):
   ```bash
   make sync-knowledge
   ```
   Or manually:
   ```bash
   cd backend && source .venv/bin/activate
   PYTHONPATH=. python scripts/sync_data_to_supabase.py
   PYTHONPATH=. python scripts/rebuild_chunks.py
   ```

### What sync does

| Step | Effect |
|------|--------|
| `sync_data_to_supabase.py` | Upserts FAQs (`update-{id}`), projects (`project_payload`), rollup FAQ |
| `rebuild_chunks.py` | Refreshes `knowledge_chunks` so the voice agent can retrieve new facts |

Without step 3, the agent **will not** know about the new post.

## Current rollup (maintained in sync)

See `recent-activity-summary` FAQ after sync—covers FlowHouse, Amazon Nova hackathon + Medicaid agent, Ramudu-Sita, Google ADK badge, workshops, and experiments.
