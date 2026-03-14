from __future__ import annotations

import re
import logging
import threading
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

UNCERTAINTY_PHRASES = [
    "i'm not sure",
    "i don't have enough",
    "i don't have context",
    "i can only partially",
    "i don't see that in",
    "i'm not certain",
    "i don't know",
    "i can't find",
    "i don't have information",
    "not in my current knowledge",
    "i may not have",
    "i'm unable to",
    "i don't have details",
]

SCORE_THRESHOLD = 3.0
SHORT_ANSWER_THRESHOLD = 50


@dataclass
class RetrievalStats:
    hit_count: int = 0
    top_score: float = 0.0
    query: str = ""


class RetrievalContext:
    """Thread-safe storage for retrieval metadata captured during tool execution."""

    def __init__(self):
        self._local = threading.local()

    def reset(self):
        self._local.stats_list = []

    def record(self, query: str, hit_count: int, top_score: float):
        if not hasattr(self._local, "stats_list"):
            self._local.stats_list = []
        self._local.stats_list.append(RetrievalStats(
            hit_count=hit_count,
            top_score=top_score,
            query=query,
        ))

    def get_stats(self) -> list[RetrievalStats]:
        return getattr(self._local, "stats_list", [])

    def get_best(self) -> RetrievalStats:
        stats = self.get_stats()
        if not stats:
            return RetrievalStats()
        return max(stats, key=lambda s: s.top_score)


retrieval_context = RetrievalContext()


@dataclass
class GapResult:
    gap_flag: bool = False
    gap_reason: str | None = None
    severity: str | None = None
    confidence_score: float = 1.0
    retrieval_hits: int = 0
    retrieval_score: float = 0.0
    topic: str = ""


class GapDetector:
    """Evaluates AI answer quality and flags knowledge gaps."""

    def evaluate(
        self,
        user_question: str,
        ai_answer: str,
    ) -> GapResult:
        stats = retrieval_context.get_best()
        result = GapResult(
            retrieval_hits=stats.hit_count,
            retrieval_score=stats.top_score,
        )

        answer_lower = ai_answer.lower() if ai_answer else ""

        if stats.hit_count == 0 and stats.query:
            result.gap_flag = True
            result.gap_reason = "NO_CONTEXT_FOUND"
            result.severity = "high"
            result.confidence_score = 0.1
            return result

        if stats.top_score > 0 and stats.top_score < SCORE_THRESHOLD:
            result.gap_flag = True
            result.gap_reason = "LOW_RETRIEVAL_CONFIDENCE"
            result.severity = "medium"
            result.confidence_score = min(stats.top_score / SCORE_THRESHOLD, 0.9)
            return result

        for phrase in UNCERTAINTY_PHRASES:
            if phrase in answer_lower:
                result.gap_flag = True
                result.gap_reason = "EXPLICIT_UNCERTAINTY"
                result.severity = "medium"
                result.confidence_score = 0.3
                return result

        if ai_answer and len(ai_answer.strip()) < SHORT_ANSWER_THRESHOLD:
            word_count = len(ai_answer.split())
            if word_count < 10:
                result.gap_flag = True
                result.gap_reason = "GENERIC_ANSWER"
                result.severity = "low"
                result.confidence_score = 0.5
                return result

        if stats.top_score > 0:
            result.confidence_score = min(stats.top_score / 10.0, 1.0)
        else:
            result.confidence_score = 0.7

        return result


gap_detector = GapDetector()
