from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from routes.auth import require_admin
from storage.supabase_client import get_supabase
from retrieval.chunk_builder import rebuild_all

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


class ResolveQuestionRequest(BaseModel):
    admin_answer: str
    knowledge_target: Optional[str] = None


class KnowledgeUpdateRequest(BaseModel):
    topic: str
    admin_answer: str
    target_table: str
    target_id: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    education: Optional[dict] = None
    current_focus: Optional[list[str]] = None
    core_skills: Optional[list[str]] = None
    interests: Optional[list[str]] = None
    contact: Optional[dict] = None


class PreferenceUpsertRequest(BaseModel):
    slug: str
    category: str
    title: str
    content: str
    tags: Optional[list[str]] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


@router.get("/profile")
async def get_profile(_user: dict = Depends(require_admin)):
    """Get the current profile data."""
    db = get_supabase()
    result = db.table("profiles").select("*").limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"profile": result.data[0]}


@router.put("/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    _user: dict = Depends(require_admin),
):
    """Update the profile data."""
    db = get_supabase()

    existing = db.table("profiles").select("id").limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_id = existing.data[0]["id"]
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        db.table("profiles")
        .update(updates)
        .eq("id", profile_id)
        .execute()
    )
    return {"profile": result.data[0] if result.data else {}}


@router.get("/preferences")
async def list_preferences(_user: dict = Depends(require_admin)):
    """List all preference entries (admin)."""
    db = get_supabase()
    result = (
        db.table("preferences")
        .select("*")
        .order("sort_order")
        .order("created_at", desc=False)
        .execute()
    )
    return {"preferences": result.data or []}


@router.post("/preferences")
async def create_preference(req: PreferenceUpsertRequest, _user: dict = Depends(require_admin)):
    """Create a preference entry."""
    db = get_supabase()
    existing = db.table("preferences").select("id").eq("slug", req.slug).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Preference with this slug already exists")
    result = db.table("preferences").insert(req.model_dump()).execute()
    return {"preference": result.data[0] if result.data else {}}


@router.put("/preferences/{preference_id}")
async def update_preference(
    preference_id: str,
    req: PreferenceUpsertRequest,
    _user: dict = Depends(require_admin),
):
    """Update a preference entry."""
    db = get_supabase()
    result = (
        db.table("preferences")
        .update(req.model_dump())
        .eq("id", preference_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Preference not found")
    return {"preference": result.data[0]}


@router.delete("/preferences/{preference_id}")
async def delete_preference(preference_id: str, _user: dict = Depends(require_admin)):
    """Delete a preference entry."""
    db = get_supabase()
    db.table("preferences").delete().eq("id", preference_id).execute()
    return {"status": "deleted", "id": preference_id}


@router.get("/sessions")
async def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(require_admin),
):
    """List all conversation sessions, newest first."""
    db = get_supabase()
    result = (
        db.table("sessions")
        .select("*")
        .order("started_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"sessions": result.data or [], "count": len(result.data or [])}


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str, _user: dict = Depends(require_admin)):
    """Get a single session with its transcript."""
    db = get_supabase()
    session = db.table("sessions").select("*").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = (
        db.table("transcript_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )

    questions = (
        db.table("question_events")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )

    return {
        "session": session.data,
        "transcript": transcript.data or [],
        "questions": questions.data or [],
    }


@router.get("/flagged")
async def list_flagged_questions(
    status: str = Query("open", pattern="^(open|reviewed|resolved)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _user: dict = Depends(require_admin),
):
    """List flagged questions filtered by status."""
    db = get_supabase()
    result = (
        db.table("question_events")
        .select("*, sessions(started_at, user_agent)")
        .eq("gap_flag", True)
        .eq("status", status)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return {"questions": result.data or [], "count": len(result.data or [])}


@router.post("/flagged/{question_id}/resolve")
async def resolve_flagged_question(
    question_id: str,
    req: ResolveQuestionRequest,
    _user: dict = Depends(require_admin),
):
    """Resolve a flagged question by providing the correct answer."""
    db = get_supabase()

    question = (
        db.table("question_events")
        .select("*")
        .eq("id", question_id)
        .single()
        .execute()
    )
    if not question.data:
        raise HTTPException(status_code=404, detail="Question not found")

    db.table("question_events").update({
        "admin_answer": req.admin_answer,
        "knowledge_target": req.knowledge_target,
        "status": "resolved",
        "resolution_type": "resolved_dashboard",
        "resolved_at": "now()",
    }).eq("id", question_id).execute()

    if req.knowledge_target:
        db.table("knowledge_updates").insert({
            "source_question_id": question_id,
            "topic": question.data.get("topic", ""),
            "admin_answer": req.admin_answer,
            "target_table": req.knowledge_target,
        }).execute()

    logger.info(f"Question {question_id} resolved by admin")
    return {"status": "resolved", "question_id": question_id}


@router.get("/stats")
async def dashboard_stats(_user: dict = Depends(require_admin)):
    """Return summary stats for the admin dashboard."""
    db = get_supabase()

    total_sessions = db.table("sessions").select("id", count="exact").execute()
    active_sessions = (
        db.table("sessions").select("id", count="exact").eq("status", "active").execute()
    )
    open_flags = (
        db.table("question_events")
        .select("id", count="exact")
        .eq("gap_flag", True)
        .eq("status", "open")
        .execute()
    )
    total_questions = db.table("question_events").select("id", count="exact").execute()

    return {
        "total_sessions": total_sessions.count or 0,
        "active_sessions": active_sessions.count or 0,
        "open_flags": open_flags.count or 0,
        "total_questions": total_questions.count or 0,
    }


@router.get("/knowledge-updates")
async def list_knowledge_updates(
    status: str = Query("pending", pattern="^(pending|applied|rejected)$"),
    _user: dict = Depends(require_admin),
):
    """List knowledge updates by status."""
    db = get_supabase()
    result = (
        db.table("knowledge_updates")
        .select("*, question_events(user_question, ai_answer)")
        .eq("status", status)
        .order("created_at", desc=True)
        .execute()
    )
    return {"updates": result.data or []}


@router.post("/knowledge-updates/{update_id}/apply")
async def apply_knowledge_update(
    update_id: str,
    _user: dict = Depends(require_admin),
):
    """Apply a knowledge update: insert into the target source table as a new FAQ, then rebuild chunks."""
    db = get_supabase()

    update = (
        db.table("knowledge_updates")
        .select("*, question_events(user_question)")
        .eq("id", update_id)
        .single()
        .execute()
    )
    if not update.data:
        raise HTTPException(status_code=404, detail="Update not found")

    data = update.data
    target = data.get("target_table", "faqs")
    admin_answer = data.get("admin_answer", "")
    topic = data.get("topic", "")
    question_text = ""
    if data.get("question_events") and isinstance(data["question_events"], dict):
        question_text = data["question_events"].get("user_question", "")

    if target == "faqs" and question_text:
        slug = question_text.lower().replace(" ", "-")[:50].rstrip("-")
        db.table("faqs").insert({
            "slug": f"auto-{slug}",
            "question": question_text,
            "answer": admin_answer,
            "topic": topic or "general",
        }).execute()
        logger.info(f"Inserted new FAQ from knowledge update {update_id}")

    db.table("knowledge_updates").update({
        "status": "applied",
        "applied_at": "now()",
    }).eq("id", update_id).execute()

    try:
        chunk_count = rebuild_all(db)
        logger.info(f"Knowledge chunks rebuilt: {chunk_count}")
    except Exception as e:
        logger.error(f"Failed to rebuild chunks after applying update: {e}")

    return {"status": "applied", "update_id": update_id}


@router.post("/rebuild-chunks")
async def trigger_rebuild_chunks(_user: dict = Depends(require_admin)):
    """Manually trigger a rebuild of all knowledge chunks."""
    db = get_supabase()
    try:
        count = rebuild_all(db)
        return {"status": "ok", "chunks_rebuilt": count}
    except Exception as e:
        logger.error(f"Chunk rebuild failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
