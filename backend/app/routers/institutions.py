"""
Institutions router.
CRUD for institutions and institution members.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Institution, InstitutionMember, User
from app.schemas.project import InstitutionResponse, InstitutionCreate
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("", response_model=list[InstitutionResponse])
async def list_institutions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all institutions (or those the user is a member of)."""
    result = await db.execute(select(Institution))
    return [InstitutionResponse.model_validate(i) for i in result.scalars().all()]


@router.post("", response_model=InstitutionResponse, status_code=201)
async def create_institution(
    data: InstitutionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new institution (admin only)."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create institutions",
        )

    # Check if slug already exists
    existing = await db.execute(
        select(Institution).where(Institution.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Institution with this slug already exists",
        )

    institution = Institution(
        name=data.name,
        slug=data.slug,
    )
    db.add(institution)
    await db.commit()
    await db.refresh(institution)
    return InstitutionResponse.model_validate(institution)


@router.get("/{institution_id}", response_model=InstitutionResponse)
async def get_institution(
    institution_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single institution by ID."""
    result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    institution = result.scalar_one_or_none()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found")
    return InstitutionResponse.model_validate(institution)


@router.post("/{institution_id}/members", status_code=201)
async def add_institution_member(
    institution_id: UUID,
    user_id: UUID,
    member_role: str = "educator",  # default role
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to an institution (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can add institution members",
        )

    # Verify institution exists
    inst_result = await db.execute(
        select(Institution).where(Institution.id == institution_id)
    )
    if not inst_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Institution not found")

    # Verify user exists
    user_result = await db.execute(select(User).where(User.id == user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = await db.execute(
        select(InstitutionMember).where(
            InstitutionMember.institution_id == institution_id,
            InstitutionMember.user_id == user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already an institution member",
        )

    member = InstitutionMember(
        institution_id=institution_id,
        user_id=user_id,
        role=member_role,
    )
    db.add(member)
    await db.commit()
    return {"message": "Member added successfully"}


@router.delete("/{institution_id}/members/{user_id}", status_code=204)
async def remove_institution_member(
    institution_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from an institution (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove institution members",
        )

    result = await db.execute(
        select(InstitutionMember).where(
            InstitutionMember.institution_id == institution_id,
            InstitutionMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=404,
            detail="Institution member not found",
        )

    await db.delete(member)
    await db.commit()
