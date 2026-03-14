from fastapi import APIRouter, HTTPException

from agent.live_session import live_session_manager

router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("/create")
async def create_session():
    state = await live_session_manager.create_session()
    return {
        "session_id": state.session_id,
        "status": state.status,
    }


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    state = live_session_manager.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    await live_session_manager.end_session(session_id)
    return {"session_id": session_id, "status": "ended"}


@router.get("/{session_id}/state")
async def get_session_state(session_id: str):
    state = live_session_manager.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": state.session_id,
        "status": state.status,
        "turn_count": state.turn_count,
        "current_topic": state.current_topic,
    }
