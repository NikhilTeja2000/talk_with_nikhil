from retrieval import KnowledgeSearch
from evaluation import retrieval_context

_search = KnowledgeSearch()


def get_links(query: str = "links") -> dict:
    """Get Nikhil's links -- GitHub, LinkedIn, portfolio, resume, or project links.
    Use when the user asks for links, contact info, or where to find Nikhil online."""
    results = _search.search_by_type(query, chunk_type="link", top_k=5)

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
        return {"found": False, "message": "No links available."}

    links = []
    for r in results:
        links.append({
            "title": r.title,
            "content": r.content,
        })

    return {"found": True, "links": links}
