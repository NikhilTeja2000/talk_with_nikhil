from retrieval import KnowledgeSearch

_search = KnowledgeSearch()


def get_links(query: str = "links") -> dict:
    """Get Nikhil's links — GitHub, LinkedIn, portfolio, resume, or project links.
    Use when the user asks for links, contact info, or where to find Nikhil online."""
    results = _search.search_by_type(query, doc_type="links", top_k=1)
    if not results:
        return {"found": False, "message": "No links available."}

    return {
        "found": True,
        "content": results[0].document.content,
    }
