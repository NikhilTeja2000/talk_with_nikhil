from retrieval import KnowledgeSearch
from evaluation import retrieval_context

_search = KnowledgeSearch()


def search_about_nikhil(query: str) -> dict:
    """Search Nikhil's knowledge base for information about his background,
    projects, experience, skills, or story. Use this when the user asks
    anything about Nikhil that requires looking up specific details."""
    results = _search.search(query, top_k=5)

    top_score = results[0].score if results else 0.0
    retrieval_context.record(
        query=query,
        hit_count=len(results),
        top_score=top_score,
    )

    if not results:
        return {"found": False, "message": "No relevant information found."}

    entries = []
    for r in results:
        entries.append({
            "title": r.title,
            "type": r.chunk_type,
            "content": r.content[:800],
            "score": round(r.score, 2),
        })

    return {"found": True, "results": entries}
