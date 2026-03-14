from __future__ import annotations

import uuid
import logging
from dataclasses import dataclass, field

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from .root_agent import create_agent
from storage.conversation_store import conversation_store
from evaluation import retrieval_context
from evaluation.gap_detector import gap_detector

logger = logging.getLogger(__name__)


@dataclass
class SessionState:
    session_id: str
    status: str = "created"
    current_topic: str = ""
    active_project: str = ""
    recent_questions: list[str] = field(default_factory=list)
    topics_discussed: list[str] = field(default_factory=list)
    turn_count: int = 0


class LiveSessionManager:
    """Manages ADK agent sessions for live conversations."""

    def __init__(self):
        self._sessions: dict[str, SessionState] = {}
        self._runners: dict[str, Runner] = {}
        self._session_service = InMemorySessionService()

    async def create_session(self, user_agent: str = "", ip_address: str = "") -> SessionState:
        session_id = str(uuid.uuid4())
        state = SessionState(session_id=session_id, status="ready")
        self._sessions[session_id] = state

        agent = create_agent()
        runner = Runner(
            agent=agent,
            app_name="talk_with_nikhil",
            session_service=self._session_service,
        )
        self._runners[session_id] = runner

        await self._session_service.create_session(
            app_name="talk_with_nikhil",
            user_id=session_id,
            session_id=session_id,
        )

        try:
            await conversation_store.create_session(session_id, user_agent, ip_address)
        except Exception as e:
            logger.warning(f"Failed to persist session to Supabase: {e}")

        logger.info(f"Session created: {session_id}")
        return state

    async def process_text(self, session_id: str, text: str) -> list[dict]:
        state = self._sessions.get(session_id)
        runner = self._runners.get(session_id)
        if not state or not runner:
            return [{"type": "error", "content": "Session not found."}]

        state.status = "processing"
        state.turn_count += 1
        state.recent_questions.append(text)
        if len(state.recent_questions) > 10:
            state.recent_questions = state.recent_questions[-10:]

        try:
            await conversation_store.add_transcript(session_id, "user", text)
            await conversation_store.increment_turn_count(session_id)
        except Exception as e:
            logger.warning(f"Failed to persist user transcript: {e}")

        retrieval_context.reset()

        user_content = types.Content(
            role="user",
            parts=[types.Part.from_text(text=text)],
        )

        responses = []
        ai_full_text = ""
        try:
            async for event in runner.run_async(
                user_id=session_id,
                session_id=session_id,
                new_message=user_content,
            ):
                if event.is_final_response():
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                ai_full_text += part.text
                                responses.append({
                                    "type": "transcript.final",
                                    "speaker": "ai",
                                    "content": part.text,
                                })
        except Exception as e:
            logger.error(f"Error processing text for {session_id}: {e}")
            responses.append({"type": "error", "content": str(e)})

        if ai_full_text:
            try:
                await conversation_store.add_transcript(session_id, "ai", ai_full_text)
            except Exception as e:
                logger.warning(f"Failed to persist AI transcript: {e}")

        try:
            gap_result = gap_detector.evaluate(text, ai_full_text)
            await conversation_store.add_question_event(
                session_id=session_id,
                user_question=text,
                ai_answer=ai_full_text,
                retrieval_hits=gap_result.retrieval_hits,
                retrieval_score=gap_result.retrieval_score,
                confidence_score=gap_result.confidence_score,
                gap_flag=gap_result.gap_flag,
                gap_reason=gap_result.gap_reason,
                severity=gap_result.severity,
            )
        except Exception as e:
            logger.warning(f"Failed to evaluate/persist question event: {e}")

        state.status = "ready"
        return responses

    async def end_session(self, session_id: str):
        state = self._sessions.pop(session_id, None)
        self._runners.pop(session_id, None)
        if state:
            state.status = "ended"
            try:
                await conversation_store.end_session(
                    session_id,
                    turn_count=state.turn_count,
                    topics=state.topics_discussed,
                )
            except Exception as e:
                logger.warning(f"Failed to persist session end: {e}")
            logger.info(f"Session ended: {session_id}")

    def get_state(self, session_id: str) -> SessionState | None:
        return self._sessions.get(session_id)


live_session_manager = LiveSessionManager()
