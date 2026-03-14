from retrieval import KnowledgeSearch

_search = KnowledgeSearch()


def search_about_nikhil(query: str) -> dict:
    """Search Nikhil's knowledge base for information about his background,
    projects, experience, skills, or story. Use this when the user asks
    anything about Nikhil that requires looking up specific details."""
    results = _search.search(query, top_k=5)
    if not results:
        return {"found": False, "message": "No relevant information found."}

    entries = []
    for r in results:
        entries.append({
            "title": r.document.title,
            "type": r.document.doc_type,
            "content": r.document.content[:800],
            "score": round(r.score, 2),
        })

    return {"found": True, "results": entries}
