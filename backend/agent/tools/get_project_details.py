from retrieval import KnowledgeSearch
from evaluation import retrieval_context

_search = KnowledgeSearch()


def get_project_details(project_name: str) -> dict:
    """Get detailed information about a specific project by name.
    Use this when the user asks about a particular project like
    'Tell me about Clinivise' or 'What is Talk with Nikhil?'"""
    results = _search.search_by_type(project_name, chunk_type="project", top_k=3)

    top_score = results[0].score if results else 0.0
    retrieval_context.record(
        query=project_name,
        hit_count=len(results),
        top_score=top_score,
    )

    if not results:
        return {"found": False, "message": f"No project found matching '{project_name}'."}

    project = results[0]
    return {
        "found": True,
        "title": project.title,
        "content": project.content,
        "tags": project.tags,
    }
