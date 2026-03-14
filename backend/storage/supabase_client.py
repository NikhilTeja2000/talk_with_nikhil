from __future__ import annotations

from functools import lru_cache

from supabase import create_client, Client

from config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Returns a Supabase client using the service role key (bypasses RLS)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache(maxsize=1)
def get_supabase_anon() -> Client:
    """Returns a Supabase client using the anon key (respects RLS)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
