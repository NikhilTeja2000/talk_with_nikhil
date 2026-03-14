from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from agent.live_session import live_session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    session_id: str | None = None

    user_agent = ""
    ip_address = ""
    for header_name, header_value in ws.headers.items():
        if header_name.lower() == "user-agent":
            user_agent = header_value
    ip_address = ws.client.host if ws.client else ""

    try:
        while True:
            raw = await ws.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "content": "Invalid JSON"})
                continue

            event_type = message.get("type", "")

            if event_type == "session.start":
                state = await live_session_manager.create_session(
                    user_agent=user_agent,
                    ip_address=ip_address,
                )
                session_id = state.session_id
                await ws.send_json({
                    "type": "session.ready",
                    "session_id": session_id,
                })

            elif event_type == "transcript.user":
                if not session_id:
                    await ws.send_json({
                        "type": "error",
                        "content": "No active session. Send session.start first.",
                    })
                    continue

                text = message.get("content", "").strip()
                if not text:
                    continue

                await ws.send_json({
                    "type": "speaker.state",
                    "speaker": "ai",
                    "state": "processing",
                })

                responses = await live_session_manager.process_text(
                    session_id, text
                )

                await ws.send_json({
                    "type": "speaker.state",
                    "speaker": "ai",
                    "state": "speaking",
                })

                for resp in responses:
                    await ws.send_json(resp)

                await ws.send_json({
                    "type": "speaker.state",
                    "speaker": "none",
                    "state": "idle",
                })

            elif event_type == "session.end":
                if session_id:
                    await live_session_manager.end_session(session_id)
                await ws.send_json({"type": "session.ended"})
                break

            else:
                await ws.send_json({
                    "type": "error",
                    "content": f"Unknown event type: {event_type}",
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
        if session_id:
            await live_session_manager.end_session(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if session_id:
            await live_session_manager.end_session(session_id)
        try:
            await ws.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
