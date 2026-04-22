"""
Auth router: OAuth 2.0 login flows for GitHub and Google.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
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

@router.get("/github")
async def github_login():
    """Return the GitHub OAuth authorization URL."""
    return {
        "url": (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={settings.GITHUB_CLIENT_ID}"
            f"&scope=read:user user:email repo"
            f"&redirect_uri={settings.FRONTEND_URL}/auth/callback?provider=github"
        )
    }


@router.post("/github/callback", response_model=TokenResponse)
async def github_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Exchange GitHub auth code for access token, create/update user."""

    # Exchange code for token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to get GitHub access token")

    # Fetch user profile
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        gh_user = user_resp.json()

        # Fetch primary email
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
        raise HTTPException(status_code=400, detail="Could not retrieve email from GitHub")

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
        # Existing user — update token
        oauth_account.access_token = encrypt_token(access_token)
        user_result = await db.execute(select(User).where(User.id == oauth_account.user_id))
        user = user_result.scalar_one()
    else:
        # Check if user exists by email
        user_result = await db.execute(select(User).where(User.email == primary_email))
        user = user_result.scalar_one_or_none()

        if not user:
            user = User(
                email=primary_email,
                name=gh_user.get("name") or gh_user.get("login"),
                avatar_url=gh_user.get("avatar_url"),
                role="student",
            )
            db.add(user)
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
    return TokenResponse(
        access_token=jwt_token,
        user=UserResponse.model_validate(user),
    )


# ── Google OAuth ────────────────────────────────────────────

@router.get("/google")
async def google_login():
    """Return the Google OAuth authorization URL."""
    scopes = "+".join([
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive.activity.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
    ])
    return {
        "url": (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={settings.FRONTEND_URL}/auth/callback?provider=google"
            f"&response_type=code"
            f"&scope={scopes}"
            f"&access_type=offline"
            f"&prompt=consent"
        )
    }


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Exchange Google auth code for tokens, create/update user."""

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.FRONTEND_URL}/auth/callback?provider=google",
            },
        )
        token_data = token_resp.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to get Google access token")

    # Fetch user profile
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        g_user = user_resp.json()

    email = g_user.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

    g_user_id = g_user.get("id", "")

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
    else:
        user_result = await db.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()

        if not user:
            user = User(
                email=email,
                name=g_user.get("name", ""),
                avatar_url=g_user.get("picture", ""),
                role="student",
            )
            db.add(user)
            await db.flush()

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
    return TokenResponse(
        access_token=jwt_token,
        user=UserResponse.model_validate(user),
    )


# ── Session ─────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse.model_validate(user)


@router.post("/logout")
async def logout():
    """Client should discard the JWT token."""
    return {"message": "Logged out successfully"}
