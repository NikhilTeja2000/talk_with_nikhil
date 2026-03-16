from __future__ import annotations

import re
import logging
from dataclasses import dataclass

from storage.supabase_client import get_supabase

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    id: str
    chunk_type: str
    title: str
    content: str
    tags: list[str]
    score: float
    source_table: str
    source_id: str


class KnowledgeSearch:
    """Searches the knowledge_chunks table in Supabase."""

    STOP_WORDS = {
        "a", "an", "the", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "can", "shall",
        "to", "of", "in", "for", "on", "with", "at", "by", "from",
        "as", "into", "about", "between", "through", "and", "or",
        "but", "not", "so", "if", "then", "than", "too", "very",
        "just", "that", "this", "it", "i", "me", "my", "you", "your",
        "what", "which", "who", "how", "when", "where", "why",
        "tell", "know", "think", "want", "like", "get",
    }

    TYPE_WEIGHTS = {
        "faq": 1.5,
        "project": 1.3,
        "experience": 1.2,
        "profile": 1.1,
        "story": 1.0,
        "timeline": 0.9,
        "preference": 0.9,
        "link": 0.5,
    }

    def __init__(self):
        self._db = get_supabase()

    def search(self, query: str, top_k: int = 5) -> list[SearchResult]:
        terms = self._extract_terms(query.lower())
        if not terms:
            return []

        or_filter = ",".join(
            f"content.ilike.%{t}%,title.ilike.%{t}%" for t in terms
        )

        result = (
            self._db.table("knowledge_chunks")
            .select("*")
            .eq("is_active", True)
            .or_(or_filter)
            .limit(30)
            .execute()
        )

        if not result.data:
            return []

        scored = []
        for row in result.data:
            score = self._score(row, query.lower(), terms)
            if score > 0:
                scored.append(SearchResult(
                    id=row["id"],
                    chunk_type=row["chunk_type"],
                    title=row["title"],
                    content=row["content"],
                    tags=row.get("tags") or [],
                    score=score,
                    source_table=row["source_table"],
                    source_id=row["source_id"],
                ))

        scored.sort(key=lambda r: r.score, reverse=True)
        return scored[:top_k]

    def search_by_type(self, query: str, chunk_type: str, top_k: int = 5) -> list[SearchResult]:
        results = self.search(query, top_k=30)
        filtered = [r for r in results if r.chunk_type == chunk_type]
        return filtered[:top_k]

    def _extract_terms(self, query: str) -> list[str]:
        words = re.findall(r"[a-z0-9]+(?:[-'.][a-z0-9]+)*", query)
        return [w for w in words if w not in self.STOP_WORDS and len(w) > 1]

    def _score(self, row: dict, query: str, terms: list[str]) -> float:
        score = 0.0
        content = (row.get("content") or "").lower()
        title = (row.get("title") or "").lower()
        tags = [t.lower() for t in (row.get("tags") or [])]

        for term in terms:
            if term in content:
                score += content.count(term)
            if term in title:
                score += 3.0
            for tag in tags:
                if term in tag:
                    score += 2.0
                    break

        if len(query) > 3 and query in content:
            score += 5.0

        weight = self.TYPE_WEIGHTS.get(row.get("chunk_type", ""), 1.0)
        score *= weight
        return score
