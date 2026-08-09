from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


SENSITIVE_KEY_PATTERNS = re.compile(
    r"(api_?key|auth|token|secret|password|private_?key|service_?role|credential)",
    re.IGNORECASE,
)
MAX_STR_LEN = 1024
MAX_LIST_LEN = 20
MAX_DEPTH = 6


def sanitize_value(val: Any, depth: int = 0) -> Any:
    """Recursively scrub sensitive keys and bound payload sizes."""
    if depth > MAX_DEPTH:
        return "[Max depth exceeded]"

    if isinstance(val, dict):
        cleaned = {}
        for k, v in val.items():
            k_str = str(k)
            if SENSITIVE_KEY_PATTERNS.search(k_str):
                cleaned[k_str] = "[REDACTED]"
            else:
                cleaned[k_str] = sanitize_value(v, depth + 1)
        return cleaned

    if isinstance(val, (list, tuple, set)):
        items = list(val)
        if len(items) > MAX_LIST_LEN:
            truncated = [sanitize_value(x, depth + 1) for x in items[:MAX_LIST_LEN]]
            truncated.append(f"...[{len(items) - MAX_LIST_LEN} more items truncated]")
            return truncated
        return [sanitize_value(x, depth + 1) for x in items]

    if isinstance(val, str):
        if len(val) > MAX_STR_LEN:
            return val[:MAX_STR_LEN] + f"...[truncated {len(val) - MAX_STR_LEN} chars]"
        return val

    if isinstance(val, (int, float, bool)) or val is None:
        return val

    if isinstance(val, datetime):
        return val.isoformat()

    return str(val)


class ToolTraceItem(BaseModel):
    tool_name: str
    args: Dict[str, Any] = Field(default_factory=dict)
    result_summary: Any = None
    duration_ms: int = 0
    status: Literal["success", "error"] = "success"
    error: Optional[str] = None

    def sanitized(self) -> Dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "args": sanitize_value(self.args),
            "result_summary": sanitize_value(self.result_summary),
            "duration_ms": self.duration_ms,
            "status": self.status,
            "error": sanitize_value(self.error) if self.error else None,
        }


class RetrievalTrace(BaseModel):
    query: str
    hit_count: int = 0
    top_score: float = 0.0
    duration_ms: int = 0
    chunks: List[Dict[str, Any]] = Field(default_factory=list)

    def sanitized(self) -> Dict[str, Any]:
        return {
            "query": sanitize_value(self.query),
            "hit_count": self.hit_count,
            "top_score": round(self.top_score, 3),
            "duration_ms": self.duration_ms,
            "chunks": sanitize_value(self.chunks),
        }


class GapTrace(BaseModel):
    gap_flag: bool = False
    gap_reason: Optional[str] = None
    severity: Optional[str] = None
    confidence_score: float = 1.0
    retrieval_hits: int = 0
    retrieval_score: float = 0.0
    topic: str = ""

    def sanitized(self) -> Dict[str, Any]:
        return {
            "gap_flag": self.gap_flag,
            "gap_reason": self.gap_reason,
            "severity": self.severity,
            "confidence_score": round(self.confidence_score, 3),
            "retrieval_hits": self.retrieval_hits,
            "retrieval_score": round(self.retrieval_score, 3),
            "topic": self.topic,
        }


class TurnTrace(BaseModel):
    trace_id: str
    session_id: str
    turn_id: int

    started_at: datetime
    user_turn_ended_at: Optional[datetime] = None
    model_started_at: Optional[datetime] = None
    first_audio_at: Optional[datetime] = None
    completed_at: datetime

    model: str
    prompt_version: str

    user_input: Optional[str] = None
    assistant_output: Optional[str] = None

    end_to_end_ttfa_ms: Optional[int] = None
    model_ttfa_ms: Optional[int] = None
    retrieval_latency_ms: int = 0
    tool_latency_ms: int = 0
    total_duration_ms: int = 0

    retrieval_events: List[RetrievalTrace] = Field(default_factory=list)
    tool_calls: List[ToolTraceItem] = Field(default_factory=list)
    gap_detection: Optional[GapTrace] = None
    guardrail_results: Dict[str, Any] = Field(default_factory=dict)

    status: Literal["success", "interrupted", "cancelled", "error"] = "success"
    interrupted: bool = False
    error: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_supabase_dict(self) -> Dict[str, Any]:
        """Convert to a database-ready dict with hybrid columns and sanitized JSONB payloads."""
        return {
            "trace_id": self.trace_id,
            "session_id": self.session_id,
            "turn_id": self.turn_id,
            "started_at": self.started_at.isoformat(),
            "user_turn_ended_at": self.user_turn_ended_at.isoformat() if self.user_turn_ended_at else None,
            "model_started_at": self.model_started_at.isoformat() if self.model_started_at else None,
            "first_audio_at": self.first_audio_at.isoformat() if self.first_audio_at else None,
            "completed_at": self.completed_at.isoformat(),
            "model": self.model,
            "prompt_version": self.prompt_version,
            "user_input": sanitize_value(self.user_input) if self.user_input else None,
            "assistant_output": sanitize_value(self.assistant_output) if self.assistant_output else None,
            "end_to_end_ttfa_ms": self.end_to_end_ttfa_ms,
            "model_ttfa_ms": self.model_ttfa_ms,
            "retrieval_latency_ms": self.retrieval_latency_ms,
            "tool_latency_ms": self.tool_latency_ms,
            "total_duration_ms": self.total_duration_ms,
            "retrieval_events": [r.sanitized() for r in self.retrieval_events],
            "tool_calls": [t.sanitized() for t in self.tool_calls],
            "gap_detection": self.gap_detection.sanitized() if self.gap_detection else None,
            "guardrail_results": sanitize_value(self.guardrail_results),
            "status": self.status,
            "interrupted": self.interrupted,
            "error": sanitize_value(self.error) if self.error else None,
            "created_at": self.created_at.isoformat(),
        }
