from retrieval import KnowledgeSearch
from evaluation import retrieval_context

_search = KnowledgeSearch()


def get_experience_details(company_or_role: str) -> dict:
    """Get details about a specific work experience or role.
    Use this when the user asks about a job, company, or role like
    'What did you do at SOTI?' or 'Tell me about your work experience.'"""
    results = _search.search_by_type(
        company_or_role, chunk_type="experience", top_k=3
    )

    top_score = results[0].score if results else 0.0
    retrieval_context.record(
        query=company_or_role,
        hit_count=len(results),
        top_score=top_score,
        chunks=[
            {"id": r.id, "title": r.title, "source_type": r.chunk_type, "score": round(r.score, 3)}
            for r in results
        ],
    )


    if not results:
        return {
            "found": False,
            "message": f"No experience found matching '{company_or_role}'.",
        }

    entries = []
    for r in results:
        entries.append({
            "title": r.title,
            "content": r.content,
        })

    return {"found": True, "results": entries}
