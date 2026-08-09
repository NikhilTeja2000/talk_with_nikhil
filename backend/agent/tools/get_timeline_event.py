from retrieval import KnowledgeSearch
from evaluation import retrieval_context

_search = KnowledgeSearch()


def get_timeline_event(query: str) -> dict:
    """Get journey and timeline events from Nikhil's career.
    Use when the user asks about Nikhil's journey, career path,
    or timeline milestones."""
    results = _search.search_by_type(query, chunk_type="timeline", top_k=5)

    top_score = results[0].score if results else 0.0
    retrieval_context.record(
        query=query,
        hit_count=len(results),
        top_score=top_score,
        chunks=[
            {"id": r.id, "title": r.title, "source_type": r.chunk_type, "score": round(r.score, 3)}
            for r in results
        ],
    )


    if not results:
        return {"found": False, "message": "No timeline events found."}

    events = []
    for r in results:
        events.append({
            "title": r.title,
            "content": r.content,
        })

    return {"found": True, "events": events}
