from retrieval import KnowledgeSearch

_search = KnowledgeSearch()


def get_project_details(project_name: str) -> dict:
    """Get detailed information about a specific project by name.
    Use this when the user asks about a particular project like
    'Tell me about Clinivise' or 'What is Talk with Nikhil?'"""
    results = _search.search_by_type(project_name, doc_type="project", top_k=3)
    if not results:
        return {"found": False, "message": f"No project found matching '{project_name}'."}

    project = results[0].document
    return {
        "found": True,
        "title": project.title,
        "content": project.content,
        "links": project.metadata.get("links", {}),
    }
