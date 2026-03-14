from __future__ import annotations

import logging

from storage.supabase_client import get_supabase

logger = logging.getLogger(__name__)


def build_chunks_from_db(db=None) -> list[dict]:
    """Build knowledge chunks from all source tables. Uses service-role client by default."""
    if db is None:
        db = get_supabase()

    chunks = []

    profile = db.table("profiles").select("*").limit(1).execute()
    if profile.data:
        p = profile.data[0]
        chunks.append({
            "source_table": "profiles",
            "source_id": p["id"],
            "chunk_type": "profile",
            "title": p.get("name", "Profile"),
            "content": _build_profile_content(p),
            "tags": (p.get("core_skills") or []) + (p.get("current_focus") or []),
            "is_active": True,
        })

    experiences = db.table("experiences").select("*").eq("is_active", True).execute()
    for exp in (experiences.data or []):
        chunks.append({
            "source_table": "experiences",
            "source_id": exp["id"],
            "chunk_type": "experience",
            "title": f"{exp['role']} at {exp['company']}",
            "content": _build_experience_content(exp),
            "tags": (exp.get("stack") or []) + (exp.get("focus") or []),
            "is_active": True,
        })

    projects = db.table("projects").select("*").eq("is_active", True).execute()
    for proj in (projects.data or []):
        chunks.append({
            "source_table": "projects",
            "source_id": proj["id"],
            "chunk_type": "project",
            "title": proj["name"],
            "content": _build_project_content(proj),
            "tags": (proj.get("stack") or []) + (proj.get("focus_areas") or []),
            "is_active": True,
        })

    faqs = db.table("faqs").select("*").eq("is_active", True).execute()
    for faq in (faqs.data or []):
        chunks.append({
            "source_table": "faqs",
            "source_id": faq["id"],
            "chunk_type": "faq",
            "title": faq["question"],
            "content": f"Q: {faq['question']}\nA: {faq['answer']}",
            "tags": [faq["topic"]] if faq.get("topic") else [],
            "is_active": True,
        })

    timeline = db.table("timeline_events").select("*").eq("is_active", True).execute()
    for ev in (timeline.data or []):
        chunks.append({
            "source_table": "timeline_events",
            "source_id": ev["id"],
            "chunk_type": "timeline",
            "title": ev["title"],
            "content": f"{ev.get('period', '')}: {ev['title']}. {ev.get('summary', '')}",
            "tags": [],
            "is_active": True,
        })

    stories = db.table("stories").select("*").eq("is_active", True).execute()
    for story in (stories.data or []):
        chunks.append({
            "source_table": "stories",
            "source_id": story["id"],
            "chunk_type": "story",
            "title": story["title"],
            "content": story["body"][:2000],
            "tags": [story["topic"]] if story.get("topic") else [],
            "is_active": True,
        })

    links = db.table("links").select("*").eq("is_active", True).execute()
    for link in (links.data or []):
        chunks.append({
            "source_table": "links",
            "source_id": link["id"],
            "chunk_type": "link",
            "title": link["label"],
            "content": f"{link['label']}: {link['url']}",
            "tags": [link["category"]] if link.get("category") else [],
            "is_active": True,
        })

    return chunks


def rebuild_all(db=None) -> int:
    """Clear and rebuild all knowledge_chunks. Returns chunk count."""
    if db is None:
        db = get_supabase()

    chunks = build_chunks_from_db(db)

    db.table("knowledge_chunks").delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()

    for i in range(0, len(chunks), 10):
        batch = chunks[i:i + 10]
        db.table("knowledge_chunks").insert(batch).execute()

    logger.info(f"Rebuilt {len(chunks)} knowledge chunks")
    return len(chunks)


def _build_profile_content(p: dict) -> str:
    parts = [p.get("name", ""), p.get("headline", "")]
    if p.get("location"):
        parts.append(f"Location: {p['location']}")
    if p.get("current_focus"):
        parts.append(f"Current focus: {', '.join(p['current_focus'])}")
    if p.get("core_skills"):
        parts.append(f"Skills: {', '.join(p['core_skills'])}")
    if p.get("interests"):
        parts.append(f"Interests: {', '.join(p['interests'])}")
    if p.get("education") and isinstance(p["education"], dict):
        edu = p["education"]
        parts.append(f"Education: {edu.get('degree', '')} from {edu.get('university', '')} ({edu.get('year', '')})")
    return "\n".join(parts)


def _build_experience_content(exp: dict) -> str:
    parts = [
        f"{exp['role']} at {exp['company']}",
        f"Period: {exp.get('period', '')}",
    ]
    if exp.get("summary"):
        parts.append(exp["summary"])
    if exp.get("highlights"):
        parts.append("Highlights: " + "; ".join(exp["highlights"]))
    if exp.get("stack"):
        parts.append("Stack: " + ", ".join(exp["stack"]))
    if exp.get("why_it_matters"):
        parts.append(exp["why_it_matters"])
    return "\n".join(parts)


def _build_project_content(proj: dict) -> str:
    parts = [proj["name"]]
    if proj.get("one_liner"):
        parts.append(proj["one_liner"])
    if proj.get("problem"):
        parts.append(f"Problem: {proj['problem']}")
    if proj.get("solution"):
        parts.append(f"Solution: {proj['solution']}")
    if proj.get("stack"):
        parts.append("Stack: " + ", ".join(proj["stack"]))
    if proj.get("why_it_matters"):
        parts.append(proj["why_it_matters"])
    return "\n".join(parts)
