from __future__ import annotations

import logging
from datetime import datetime, timezone

from storage.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class ConversationStore:
    """Persists sessions, transcript messages, and question events to Supabase."""

    def __init__(self):
        self._db = get_supabase()

    async def create_session(
        self, session_id: str, user_agent: str = "", ip_address: str = ""
    ) -> dict:
        result = (
            self._db.table("sessions")
            .insert({
                "id": session_id,
                "user_agent": user_agent,
                "ip_address": ip_address,
                "status": "active",
            })
            .execute()
        )
        logger.info(f"Session created in DB: {session_id}")
        return result.data[0] if result.data else {}

    async def end_session(self, session_id: str, turn_count: int = 0, topics: list[str] | None = None):
        self._db.table("sessions").update({
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "turn_count": turn_count,
            "topics": topics or [],
            "status": "ended",
        }).eq("id", session_id).execute()
        logger.info(f"Session ended in DB: {session_id}")

    async def add_transcript(self, session_id: str, speaker: str, content: str) -> dict:
        result = (
            self._db.table("transcript_messages")
            .insert({
                "session_id": session_id,
                "speaker": speaker,
                "content": content,
            })
            .execute()
        )
        return result.data[0] if result.data else {}

    async def add_question_event(
        self,
        session_id: str,
        user_question: str,
        ai_answer: str = "",
        topic: str = "",
        retrieval_hits: int = 0,
        retrieval_score: float = 0.0,
        confidence_score: float = 0.0,
        gap_flag: bool = False,
        gap_reason: str | None = None,
        severity: str | None = None,
    ) -> dict:
        row = {
            "session_id": session_id,
            "user_question": user_question,
            "ai_answer": ai_answer,
            "topic": topic,
            "retrieval_hits": retrieval_hits,
            "retrieval_score": retrieval_score,
            "confidence_score": confidence_score,
            "gap_flag": gap_flag,
        }
        if gap_reason:
            row["gap_reason"] = gap_reason
        if severity:
            row["severity"] = severity

        result = self._db.table("question_events").insert(row).execute()
        if gap_flag:
            logger.warning(
                f"Gap flagged: {gap_reason} | q='{user_question[:60]}' | session={session_id}"
            )
        return result.data[0] if result.data else {}

    async def get_session_transcript(self, session_id: str) -> list[dict]:
        result = (
            self._db.table("transcript_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return result.data or []

    async def get_session(self, session_id: str) -> dict | None:
        result = (
            self._db.table("sessions")
            .select("*")
            .eq("id", session_id)
            .single()
            .execute()
        )
        return result.data

    async def increment_turn_count(self, session_id: str):
        session = await self.get_session(session_id)
        if session:
            self._db.table("sessions").update({
                "turn_count": (session.get("turn_count", 0) or 0) + 1,
            }).eq("id", session_id).execute()


conversation_store = ConversationStore()
