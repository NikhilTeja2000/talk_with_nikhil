from retrieval import KnowledgeSearch

_search = KnowledgeSearch()


def get_timeline_event(query: str) -> dict:
    """Get journey and timeline events from Nikhil's career.
    Use when the user asks about Nikhil's journey, career path,
    or timeline milestones."""
    results = _search.search_by_type(query, doc_type="timeline", top_k=5)
    if not results:
        return {"found": False, "message": "No timeline events found."}

    events = []
    for r in results:
        events.append({
            "title": r.document.title,
            "content": r.document.content,
        })

    return {"found": True, "events": events}
