from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings

_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
_LOCAL_ENV = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    gemini_live_model: str = "gemini-2.0-flash-live-001"
    app_env: str = "development"
    allowed_origin: str = "http://localhost:3000"
    host: str = "0.0.0.0"
    port: int = 8000

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    model_config = {
        "env_file": (str(_LOCAL_ENV), str(_ROOT_ENV)),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
