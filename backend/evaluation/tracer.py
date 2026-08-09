from __future__ import annotations

import asyncio
import hashlib
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from evaluation.trace_models import (
    GapTrace,
    RetrievalTrace,
    ToolTraceItem,
    TurnTrace,
)

logger = logging.getLogger(__name__)

# Prompt version hash computed at startup
_PROMPT_VERSION: str | None = None


def get_prompt_version() -> str:
    """Compute and cache a deterministic hash of the persona prompt."""
    global _PROMPT_VERSION
    if _PROMPT_VERSION is not None:
        return _PROMPT_VERSION

    persona_path = Path(__file__).resolve().parent.parent / "prompts" / "persona.md"
    content = ""
    if persona_path.exists():
        try:
            content = persona_path.read_text(encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to read persona.md for hashing: {e}")

    # Fallback to instructions module if file is missing
    if not content:
        content = "default_persona_v1"

    sha = hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]
    _PROMPT_VERSION = f"persona_{sha}"
    return _PROMPT_VERSION


class TurnContext:
    """Tracks state and timings for a single voice/live session turn."""

    def __init__(self, session_id: str, turn_id: int, model: str):
        self.session_id = session_id
        self.turn_id = turn_id
        self.model = model
        self.prompt_version = get_prompt_version()
        self.trace_id = f"tr_{uuid.uuid4().hex[:12]}"

        self.started_at = datetime.now(timezone.utc)
        self.started_perf = time.perf_counter()

        self.user_turn_ended_at: datetime | None = None
        self.user_turn_ended_perf: float | None = None

        self.model_started_at: datetime | None = None
        self.model_started_perf: float | None = None

        self.first_audio_at: datetime | None = None
        self.first_audio_perf: float | None = None

        self.user_input: str | None = None
        self.assistant_output: str | None = None

        self.retrieval_events: list[RetrievalTrace] = []
        self.tool_calls: list[ToolTraceItem] = []
        self.guardrail_results: dict[str, Any] = {}
        self._finalized = False
        self._built_trace: TurnTrace | None = None

    def end_user_turn(self, user_text: str):
        """Mark when user finishes speaking / submits text."""
        self.user_input = user_text
        self.user_turn_ended_at = datetime.now(timezone.utc)
        self.user_turn_ended_perf = time.perf_counter()

    def start_model_turn(self):
        """Mark when model turn begins (receiving responses or tool calls)."""
        if self.model_started_at is None:
            self.model_started_at = datetime.now(timezone.utc)
            self.model_started_perf = time.perf_counter()

    def record_first_audio(self):
        """Mark the arrival of the first audio chunk from Gemini for TTFA calculation."""
        if self.first_audio_at is None:
            self.first_audio_at = datetime.now(timezone.utc)
            self.first_audio_perf = time.perf_counter()

    def record_tool_call(
        self,
        tool_name: str,
        args: dict[str, Any],
        result_summary: Any = None,
        duration_ms: int = 0,
        status: str = "success",
        error: str | None = None,
    ):
        """Record an executed tool with arguments, duration, and bounded output."""
        self.tool_calls.append(
            ToolTraceItem(
                tool_name=tool_name,
                args=args or {},
                result_summary=result_summary,
                duration_ms=duration_ms,
                status=status if status in ("success", "error") else "success",
                error=error,
            )
        )

    def record_retrieval(
        self,
        query: str,
        hit_count: int,
        top_score: float,
        duration_ms: int = 0,
        chunks: list[dict[str, Any]] | None = None,
    ):
        """Record a knowledge retrieval event within the turn."""
        self.retrieval_events.append(
            RetrievalTrace(
                query=query,
                hit_count=hit_count,
                top_score=top_score,
                duration_ms=duration_ms,
                chunks=chunks or [],
            )
        )

    def build_trace(
        self,
        assistant_output: str,
        gap_result: Any = None,
        status: str = "success",
        interrupted: bool = False,
        error: str | None = None,
    ) -> TurnTrace:
        """Construct the completed TurnTrace with calculated metrics (idempotent)."""
        if self._finalized and self._built_trace is not None:
            return self._built_trace

        completed_at = datetime.now(timezone.utc)
        completed_perf = time.perf_counter()


        total_duration_ms = max(int((completed_perf - self.started_perf) * 1000), 0)

        # Calculate dual TTFA metrics
        end_to_end_ttfa_ms: int | None = None
        if self.first_audio_perf is not None and self.user_turn_ended_perf is not None:
            end_to_end_ttfa_ms = max(
                int((self.first_audio_perf - self.user_turn_ended_perf) * 1000), 0
            )

        model_ttfa_ms: int | None = None
        if self.first_audio_perf is not None and self.model_started_perf is not None:
            model_ttfa_ms = max(
                int((self.first_audio_perf - self.model_started_perf) * 1000), 0
            )

        retrieval_latency_ms = sum(r.duration_ms for r in self.retrieval_events)
        tool_latency_ms = sum(t.duration_ms for t in self.tool_calls)

        gap_trace: GapTrace | None = None
        if gap_result:
            gap_trace = GapTrace(
                gap_flag=getattr(gap_result, "gap_flag", False),
                gap_reason=getattr(gap_result, "gap_reason", None),
                severity=getattr(gap_result, "severity", None),
                confidence_score=getattr(gap_result, "confidence_score", 1.0),
                retrieval_hits=getattr(gap_result, "retrieval_hits", 0),
                retrieval_score=getattr(gap_result, "retrieval_score", 0.0),
                topic=getattr(gap_result, "topic", ""),
            )

        trace = TurnTrace(
            trace_id=self.trace_id,
            session_id=self.session_id,
            turn_id=self.turn_id,
            started_at=self.started_at,
            user_turn_ended_at=self.user_turn_ended_at,
            model_started_at=self.model_started_at,
            first_audio_at=self.first_audio_at,
            completed_at=completed_at,
            model=self.model,
            prompt_version=self.prompt_version,
            user_input=self.user_input,
            assistant_output=assistant_output,
            end_to_end_ttfa_ms=end_to_end_ttfa_ms,
            model_ttfa_ms=model_ttfa_ms,
            retrieval_latency_ms=retrieval_latency_ms,
            tool_latency_ms=tool_latency_ms,
            total_duration_ms=total_duration_ms,
            retrieval_events=self.retrieval_events,
            tool_calls=self.tool_calls,
            gap_detection=gap_trace,
            guardrail_results=self.guardrail_results,
            status=status if status in ("success", "interrupted", "cancelled", "error") else "success",
            interrupted=interrupted,
            error=error,
        )
        self._built_trace = trace
        self._finalized = True
        return trace



class TraceCollector:
    """Decoupled in-memory queue + worker for non-blocking trace persistence."""

    def __init__(self, maxsize: int = 1000):
        self._queue: asyncio.Queue[TurnTrace] = asyncio.Queue(maxsize=maxsize)
        self._worker_task: asyncio.Task | None = None
        self._running = False

        # Operational metrics
        self.enqueued_count = 0
        self.persisted_count = 0
        self.failed_count = 0
        self.dropped_count = 0

    def enqueue_trace(self, trace: TurnTrace) -> bool:
        """Non-blocking enqueue on the voice loop. Never blocks audio processing."""
        try:
            self._queue.put_nowait(trace)
            self.enqueued_count += 1
            return True
        except asyncio.QueueFull:
            self.dropped_count += 1
            logger.warning(
                f"Trace queue full ({self._queue.maxsize}). Dropped trace {trace.trace_id} "
                f"for session {trace.session_id[:8]} turn {trace.turn_id}."
            )
            return False

    def start_worker(self):
        """Start the background consumer task."""
        if not self._running:
            self._running = True
            self._worker_task = asyncio.create_task(
                self._worker_loop(), name="trace_collector_worker"
            )
            logger.info("TraceCollector background worker started.")

    async def stop_worker(self, timeout: float = 3.0):
        """Gracefully drain remaining traces on container shutdown."""
        if not self._running:
            return

        self._running = False
        logger.info(f"Draining TraceCollector queue ({self._queue.qsize()} items remaining)...")

        try:
            start_time = time.time()
            while not self._queue.empty() and (time.time() - start_time) < timeout:
                await asyncio.sleep(0.05)
        except Exception as e:
            logger.warning(f"Error while draining trace queue: {e}")

        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None

        logger.info(
            f"TraceCollector stopped. Stats: enqueued={self.enqueued_count}, "
            f"persisted={self.persisted_count}, failed={self.failed_count}, "
            f"dropped={self.dropped_count}"
        )

    async def _worker_loop(self):
        """Background loop consuming traces and writing to Supabase."""
        from storage.conversation_store import conversation_store

        while self._running or not self._queue.empty():
            try:
                try:
                    trace = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue

                try:
                    payload = trace.to_supabase_dict()
                    await conversation_store.insert_turn_trace(payload)
                    self.persisted_count += 1
                    logger.debug(
                        f"Persisted trace {trace.trace_id} | session={trace.session_id[:8]} "
                        f"turn={trace.turn_id} status={trace.status} e2e_ttfa={trace.end_to_end_ttfa_ms}ms"
                    )
                except Exception as e:
                    self.failed_count += 1
                    logger.error(
                        f"Failed to persist trace {trace.trace_id} for session {trace.session_id[:8]}: {e}"
                    )
                finally:
                    self._queue.task_done()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in trace worker loop: {e}")
                await asyncio.sleep(0.5)

    @property
    def metrics(self) -> dict[str, int]:
        return {
            "enqueued": self.enqueued_count,
            "persisted": self.persisted_count,
            "failed": self.failed_count,
            "dropped": self.dropped_count,
            "queue_depth": self._queue.qsize(),
        }


# Global singleton instance
trace_collector = TraceCollector(maxsize=1000)
