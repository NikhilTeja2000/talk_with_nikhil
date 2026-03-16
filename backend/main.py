from __future__ import annotations

import logging
import sys
from pathlib import Path

from dotenv import load_dotenv

_root_env = Path(__file__).resolve().parent.parent / ".env"
_local_env = Path(__file__).resolve().parent / ".env"
if _local_env.exists():
    load_dotenv(_local_env)
if _root_env.exists():
    load_dotenv(_root_env, override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import settings
from routes.health import router as health_router
from routes.session import router as session_router
from routes.websocket import router as ws_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.voice_websocket import router as voice_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

app = FastAPI(
    title="Talk with Nikhil API",
    version="0.1.0",
    description="Real-time AI portfolio backend powered by Google ADK and Gemini Live",
)

# Support comma-separated origins so production + Vercel preview URLs both work
_origins = [o.strip() for o in settings.allowed_origin.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(session_router)
app.include_router(ws_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(voice_router)


@app.on_event("startup")
async def startup():
    logging.getLogger(__name__).info(
        f"Talk with Nikhil backend starting | env={settings.app_env}"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
