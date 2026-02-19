from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import secrets
from typing import Optional, List

from database import get_db
from models import Share, User, Project, TestStrategy
from schemas import ShareCreate, ShareResponse, ShareUpdate, ShareListResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/shares", tags=["Sharing"])


def generate_share_token() -> str:
    """Generate a unique share token"""
    return secrets.token_urlsafe(32)


def get_authenticated_user(authorization: str, db: Session) -> User:
    """Helper to get authenticated user from header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return user


# ============== Create Share ==============

@router.post("", response_model=ShareResponse)
def create_share(
    share_data: ShareCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Create a new share (share with user or create link)"""
    user = get_authenticated_user(authorization, db)
    
    # Validate resource exists
    if share_data.share_type == "project":
        if not share_data.project_id:
            raise HTTPException(status_code=400, detail="project_id required")
        resource = db.query(Project).filter(Project.id == share_data.project_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Project not found")
    
    elif share_data.share_type == "strategy":
        if not share_data.strategy_id:
            raise HTTPException(status_code=400, detail="strategy_id required")
        resource = db.query(TestStrategy).filter(TestStrategy.id == share_data.strategy_id).first()
        if not resource:
            raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Find user to share with (if email provided)
    shared_with_user = None
    if share_data.shared_with_email:
        shared_with_user = db.query(User).filter(
            User.email == share_data.shared_with_email.lower()
        ).first()
    
    # Calculate expiration if specified
    link_expires_at = None
    if share_data.expires_in_days:
        link_expires_at = datetime.utcnow() + timedelta(days=share_data.expires_in_days)
    
    # Generate share token for links
    share_token = generate_share_token() if share_data.is_public_link else None
    
    # Create share
    db_share = Share(
        share_type=share_data.share_type,
        project_id=share_data.project_id,
        strategy_id=share_data.strategy_id,
        shared_by_id=user.id,
        shared_with_id=shared_with_user.id if shared_with_user else None,
        shared_with_email=share_data.shared_with_email,
        permission=share_data.permission,
        share_token=share_token,
        is_public_link=share_data.is_public_link,
        link_expires_at=link_expires_at
    )
    db.add(db_share)
    db.commit()
    db.refresh(db_share)
    
    return build_share_response(db_share, user)


def build_share_response(share: Share, current_user: User = None) -> ShareResponse:
    """Build ShareResponse from Share model"""
    share_url = None
    if share.share_token:
        # In production, use actual domain
        share_url = f"/shared/{share.share_token}"
    
    return ShareResponse(
        id=share.id,
        share_type=share.share_type,
        project_id=share.project_id,
        strategy_id=share.strategy_id,
        shared_by_id=share.shared_by_id,
        shared_by_name=share.shared_by.name if share.shared_by else None,
        shared_with_id=share.shared_with_id,
        shared_with_email=share.shared_with_email,
        shared_with_name=share.shared_with.name if share.shared_with else None,
        permission=share.permission,
        share_token=share.share_token,
        share_url=share_url,
        is_public_link=share.is_public_link,
        link_expires_at=share.link_expires_at,
        created_at=share.created_at,
        is_active=share.is_active
    )


# ============== Get Shares ==============

@router.get("/project/{project_id}", response_model=ShareListResponse)
def get_project_shares(
    project_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get all shares for a project"""
    user = get_authenticated_user(authorization, db)
    
    shares = db.query(Share).options(
        joinedload(Share.shared_by),
        joinedload(Share.shared_with)
    ).filter(
        Share.project_id == project_id,
        Share.is_active == True
    ).all()
    
    return ShareListResponse(
        shares=[build_share_response(s, user) for s in shares],
        total=len(shares)
    )


@router.get("/strategy/{strategy_id}", response_model=ShareListResponse)
def get_strategy_shares(
    strategy_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get all shares for a strategy"""
    user = get_authenticated_user(authorization, db)
    
    shares = db.query(Share).options(
        joinedload(Share.shared_by),
        joinedload(Share.shared_with)
    ).filter(
        Share.strategy_id == strategy_id,
        Share.is_active == True
    ).all()
    
    return ShareListResponse(
        shares=[build_share_response(s, user) for s in shares],
        total=len(shares)
    )


@router.get("/shared-with-me", response_model=ShareListResponse)
def get_shares_with_me(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get all resources shared with current user"""
    user = get_authenticated_user(authorization, db)
    
    shares = db.query(Share).options(
        joinedload(Share.shared_by),
        joinedload(Share.project),
        joinedload(Share.strategy)
    ).filter(
        (Share.shared_with_id == user.id) | (Share.shared_with_email == user.email),
        Share.is_active == True
    ).all()
    
    return ShareListResponse(
        shares=[build_share_response(s, user) for s in shares],
        total=len(shares)
    )


# ============== Access via Share Link ==============

@router.get("/access/{share_token}")
def access_shared_resource(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Access a shared resource via token"""
    share = db.query(Share).options(
        joinedload(Share.project),
        joinedload(Share.strategy)
    ).filter(
        Share.share_token == share_token,
        Share.is_active == True
    ).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found or expired")
    
    # Check expiration
    if share.link_expires_at and share.link_expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")
    
    # Update accessed timestamp
    share.accessed_at = datetime.utcnow()
    db.commit()
    
    # Return resource info
    result = {
        "share_type": share.share_type,
        "permission": share.permission,
        "shared_by": share.shared_by.name if share.shared_by else None
    }
    
    if share.project:
        result["project"] = {
            "id": share.project.id,
            "name": share.project.name,
            "description": share.project.description
        }
    
    if share.strategy:
        result["strategy"] = {
            "id": share.strategy.id,
            "title": share.strategy.title,
            "status": share.strategy.status
        }
    
    return result


# ============== Update & Delete Shares ==============

@router.put("/{share_id}", response_model=ShareResponse)
def update_share(
    share_id: int,
    update_data: ShareUpdate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Update share permissions"""
    user = get_authenticated_user(authorization, db)
    
    share = db.query(Share).filter(Share.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    
    # Only owner can update
    if share.shared_by_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this share")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(share, key, value)
    
    db.commit()
    db.refresh(share)
    
    return build_share_response(share, user)


@router.delete("/{share_id}", status_code=204)
def delete_share(
    share_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Remove a share"""
    user = get_authenticated_user(authorization, db)
    
    share = db.query(Share).filter(Share.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    
    # Only owner can delete
    if share.shared_by_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this share")
    
    db.delete(share)
    db.commit()
    return None

