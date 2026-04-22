"""
Pydantic schemas for auth endpoints.
"""

from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Literal["student", "educator", "admin"]
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class OAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None
