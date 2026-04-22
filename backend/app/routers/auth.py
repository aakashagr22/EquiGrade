"""
Auth router: OAuth 2.0 login flows for GitHub and Google.

Flow:
  1. Frontend calls GET /api/auth/github (or /google) → receives OAuth authorize URL
  2. Frontend redirects browser to the OAuth provider
  3. Provider redirects to GET /api/auth/github/callback?code=xxx on the BACKEND
  4. Backend exchanges code → creates/updates user → mints JWT
  5. Backend issues RedirectResponse to {FRONTEND_URL}/auth/callback?token=xxx
  6. Frontend callback page stores the JWT and routes the user to a dashboard
"""

import json
import httpx
from urllib.parse import urlencode, quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.models.models import User, OAuthAccount
from app.schemas.auth import TokenResponse, UserResponse
from app.middleware.auth_middleware import create_access_token, get_current_user
from app.utils.crypto import encrypt_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


# ── GitHub OAuth ────────────────────────────────────────────

GITHUB_CALLBACK_URL = f"{settings.BACKEND_URL}/api/auth/github/callback"


@router.get("/github")
async def github_login(role: str = Query("student")):
    """Return the GitHub OAuth authorization URL."""
    # Embed the selected role in the OAuth state parameter
    state = quote(json.dumps({"role": role}))
    params = urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "scope": "read:user user:email repo",
        "redirect_uri": GITHUB_CALLBACK_URL,
        "state": state,
    })
    return {"url": f"https://github.com/login/oauth/authorize?{params}"}


@router.get("/github/callback")
async def github_callback(code: str = Query(...), state: str = Query(""), db: AsyncSession = Depends(get_db)):
    """
    GitHub redirects here with ?code=xxx.
    Exchange code → fetch user → create/update → redirect to frontend with JWT.
    """
    # Exchange code for token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_CALLBACK_URL,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()

    access_token = token_data.get("access_token")
    if not access_token:
        error_desc = token_data.get("error_description", "Unknown error")
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/auth/callback?error={error_desc}"
        )

    # Fetch user profile + primary email
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        gh_user = user_resp.json()

        email_resp = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        emails = email_resp.json()
        primary_email = next(
            (e["email"] for e in emails if e.get("primary")),
            gh_user.get("email", ""),
        )

    if not primary_email:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/auth/callback?error=Could+not+retrieve+email+from+GitHub"
        )

    # Extract role from state parameter
    requested_role = "student"
    if state:
        try:
            state_data = json.loads(state)
            if state_data.get("role") in ("student", "educator", "admin"):
                requested_role = state_data["role"]
        except (json.JSONDecodeError, TypeError):
            pass

    # Find or create user
    gh_user_id = str(gh_user["id"])
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == "github",
            OAuthAccount.provider_user_id == gh_user_id,
        )
    )
    oauth_account = result.scalar_one_or_none()

    if oauth_account:
        # Existing user — update token and role
        oauth_account.access_token = encrypt_token(access_token)
        user_result = await db.execute(select(User).where(User.id == oauth_account.user_id))
        user = user_result.scalar_one()
        # Update role if explicitly selected (allows role switching)
        user.role = requested_role
    else:
        # Check if user exists by email
        user_result = await db.execute(select(User).where(User.email == primary_email))
        user = user_result.scalar_one_or_none()

        if not user:
            user = User(
                email=primary_email,
                name=gh_user.get("name") or gh_user.get("login"),
                avatar_url=gh_user.get("avatar_url"),
                role=requested_role,
            )
            db.add(user)
        else:
            user.role = requested_role
            await db.flush()

        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="github",
            provider_user_id=gh_user_id,
            access_token=encrypt_token(access_token),
            scope="read:user,user:email,repo",
        )
        db.add(oauth_account)

    await db.commit()
    await db.refresh(user)

    jwt_token = create_access_token(str(user.id), user.role)
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}")


# ── Google OAuth ────────────────────────────────────────────

GOOGLE_CALLBACK_URL = f"{settings.BACKEND_URL}/api/auth/google/callback"


@router.get("/google")
async def google_login(role: str = Query("student")):
    """Return the Google OAuth authorization URL."""
    scopes = " ".join([
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive.activity.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
    ])
    state = quote(json.dumps({"role": role}))
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_CALLBACK_URL,
        "response_type": "code",
        "scope": scopes,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.get("/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(""), db: AsyncSession = Depends(get_db)):
    """
    Google redirects here with ?code=xxx.
    Exchange code → fetch user → create/update → redirect to frontend with JWT.
    """
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_CALLBACK_URL,
            },
        )
        token_data = token_resp.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token", "")
    if not access_token:
        error_desc = token_data.get("error_description", "Failed to get Google access token")
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/auth/callback?error={error_desc}"
        )

    # Fetch user profile
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        g_user = user_resp.json()

    email = g_user.get("email", "")
    if not email:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/auth/callback?error=Could+not+retrieve+email+from+Google"
        )

    g_user_id = g_user.get("id", "")

    # Extract role from state parameter
    requested_role = "student"
    if state:
        try:
            state_data = json.loads(state)
            if state_data.get("role") in ("student", "educator", "admin"):
                requested_role = state_data["role"]
        except (json.JSONDecodeError, TypeError):
            pass

    # Find or create user
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_user_id == g_user_id,
        )
    )
    oauth_account = result.scalar_one_or_none()

    if oauth_account:
        oauth_account.access_token = encrypt_token(access_token)
        if refresh_token:
            oauth_account.refresh_token = encrypt_token(refresh_token)
        user_result = await db.execute(select(User).where(User.id == oauth_account.user_id))
        user = user_result.scalar_one()
        user.role = requested_role
    else:
        user_result = await db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                name=g_user.get("name", ""),
                avatar_url=g_user.get("picture", ""),
                role=requested_role,
            )
            db.add(user)
            await db.flush()
        else:
            user.role = requested_role

        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=g_user_id,
            access_token=encrypt_token(access_token),
            refresh_token=encrypt_token(refresh_token) if refresh_token else None,
            scope="openid,email,profile,drive.activity.readonly,drive.metadata.readonly",
        )
        db.add(oauth_account)

    await db.commit()
    await db.refresh(user)

    jwt_token = create_access_token(str(user.id), user.role)
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}")


# ── Session ─────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout():
    """Client should discard the JWT token."""
    return {"message": "Logged out successfully"}
