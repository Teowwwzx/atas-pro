from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.follows_model import Follow
from app.schemas.follows_schema import FollowDetails, FollowCreate
from typing import List
import uuid
from app.dependencies import get_current_user
from app.models.user_model import User

router = APIRouter()

@router.get("/follows", response_model=List[FollowDetails])
def get_all_follows(db: Session = Depends(get_db)):
    follows = db.query(Follow).all()
    return follows

@router.get("/follows/me", response_model=List[FollowDetails])
def get_my_follows(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Who I am following"""
    items = db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    return items

@router.get("/followers/me", response_model=List[FollowDetails])
def get_my_followers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Who follows me"""
    items = db.query(Follow).filter(Follow.followee_id == current_user.id).all()
    return items

@router.get("/users/{user_id}/follows", response_model=List[FollowDetails])
def get_user_follows(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Who this user is following"""
    items = db.query(Follow).filter(Follow.follower_id == user_id).all()
    return items

@router.get("/users/{user_id}/followers", response_model=List[FollowDetails])
def get_user_followers(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Who follows this user"""
    items = db.query(Follow).filter(Follow.followee_id == user_id).all()
    return items

@router.post("/follows", response_model=FollowDetails)
def follow_target(body: FollowCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_id = body.followee_id or body.org_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Must provide followee_id or org_id")

    if body.followee_id:
        if body.followee_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        existing = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.followee_id == body.followee_id).first()
        if existing: return existing
        relation = Follow(follower_id=current_user.id, followee_id=body.followee_id)
        db.add(relation)
        db.commit()
        db.refresh(relation)
        return relation

    if body.org_id:
        # Check org exists logic? Foreign key handles it but good to be explicit or catching IntegrityError.
        # Check simple existence:
        from app.models.organization_model import Organization
        org = db.query(Organization).filter(Organization.id == body.org_id).first()
        if not org:
             raise HTTPException(status_code=404, detail="Organization not found")
        
        existing = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.org_id == body.org_id).first()
        if existing: return existing
        relation = Follow(follower_id=current_user.id, org_id=body.org_id)
        db.add(relation)
        db.commit()
        db.refresh(relation)
        return relation

@router.delete("/follows/{target_id}", status_code=204)
def unfollow_target(target_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Try user follow first
    relation = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.followee_id == target_id).first()
    if not relation:
        # Try org follow
        relation = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.org_id == target_id).first()
    
    if relation is None:
        raise HTTPException(status_code=404, detail="Follow relationship not found")
    
    db.delete(relation)
    db.commit()
    return

@router.get("/organizations/{org_id}/followers", response_model=List[FollowDetails])
def list_org_followers(org_id: uuid.UUID, db: Session = Depends(get_db)):
    items = db.query(Follow).filter(Follow.org_id == org_id).all()
    return items

@router.get("/organizations/{org_id}/followers/me")
def get_my_org_follow_status(org_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Check if I am following an organization"""
    existing = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.org_id == org_id).first()
    return {"is_following": existing is not None}
