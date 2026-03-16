from retrieval import KnowledgeSearch
from evaluation import retrieval_context

_search = KnowledgeSearch()


def get_preferences(query: str) -> dict:
    """Get Nikhil's personal preferences (movies/anime/music/food/etc.) from the knowledge base.

    Use when the user asks what Nikhil likes, watches, listens to, or prefers.
    """
    results = _search.search_by_type(query, chunk_type="preference", top_k=5)

    top_score = results[0].score if results else 0.0
    retrieval_context.record(
        query=query,
        hit_count=len(results),
        top_score=top_score,
    )

    if not results:
        return {
            "found": False,
            "message": "No preferences are set yet in the knowledge base.",
        }

    prefs = []
    for r in results:
        prefs.append({
            "title": r.title,
            "content": r.content,
            "tags": r.tags,
        })

    return {"found": True, "preferences": prefs}

