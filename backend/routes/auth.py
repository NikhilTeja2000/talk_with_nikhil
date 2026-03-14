from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from storage.supabase_client import get_supabase_anon, get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str


async def require_admin(authorization: str = Header(...)) -> dict:
    """Dependency that validates a Supabase JWT and returns the user."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.removeprefix("Bearer ")
    db = get_supabase()

    try:
        user_response = db.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user.id, "email": user.email}
    except Exception as e:
        logger.warning(f"Auth failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Authenticate admin with email/password via Supabase Auth."""
    anon = get_supabase_anon()
    try:
        result = anon.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not result.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return LoginResponse(
            access_token=result.session.access_token,
            refresh_token=result.session.refresh_token,
            user_id=result.user.id,
            email=result.user.email,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh an expired access token."""
    anon = get_supabase_anon()
    try:
        result = anon.auth.refresh_session(refresh_token)
        if not result.session:
            raise HTTPException(status_code=401, detail="Could not refresh token")
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me")
async def get_current_user(user: dict = Depends(require_admin)):
    """Return the currently authenticated admin user."""
    return user
