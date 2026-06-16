from __future__ import annotations

import os
import logging

from fastapi import APIRouter
from config import settings

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "talk-with-nikhil"}


@router.get("/readiness")
async def readiness_check():
    """Check that all required services are configured and reachable."""
    checks = {}

    # Test Gemini -- supports both Vertex AI and API key modes
    try:
        from google import genai as google_genai

        use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").upper() == "TRUE"

        if use_vertex:
            project = os.environ.get("GOOGLE_CLOUD_PROJECT", settings.google_cloud_project)
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", settings.google_cloud_location)
            if not project:
                raise ValueError("GOOGLE_CLOUD_PROJECT not set")
            client = google_genai.Client(vertexai=True, project=project, location=location)
            method = "vertex_ai"
        else:
            api_key = os.environ.get("GOOGLE_API_KEY", "")
            if not api_key:
                raise ValueError("No GOOGLE_API_KEY set")
            client = google_genai.Client(api_key=api_key)
            method = "api_key"

        client.models.generate_content(
            model=settings.gemini_live_model,
            contents="hi",
        )
        checks["gemini"] = {"ok": True, "method": method}
    except Exception as e:
        logger.warning(f"Gemini check failed: {e}")
        checks["gemini"] = {"ok": False, "method": "missing", "error": str(e)[:120]}

    # Supabase connectivity (wakes paused free-tier projects on first request)
    try:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        from storage.supabase_client import get_supabase
        db = get_supabase()
        db.table("profiles").select("id").limit(1).execute()
        checks["supabase"] = {"ok": True}
    except Exception as e:
        logger.warning(f"Supabase check failed: {e}")
        checks["supabase"] = {"ok": False, "error": str(e)[:120]}

    # Knowledge base check
    try:
        from storage.supabase_client import get_supabase
        db = get_supabase()
        result = (
            db.table("knowledge_chunks")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        chunk_count = result.count or 0
        checks["knowledge_base"] = {"ok": chunk_count > 0, "chunks": chunk_count}
    except Exception as e:
        checks["knowledge_base"] = {"ok": False, "error": str(e)[:120]}

    all_ok = all(c["ok"] for c in checks.values())
    return {"ready": all_ok, "checks": checks}
