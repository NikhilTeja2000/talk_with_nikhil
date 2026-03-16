from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from agent.live_voice_session import handle_voice_session

router = APIRouter(tags=["voice"])
logger = logging.getLogger(__name__)


@router.websocket("/ws/voice")
async def voice_websocket(ws: WebSocket):
    await ws.accept()
    logger.info("Voice WebSocket connected")
    try:
        await handle_voice_session(ws)
    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
