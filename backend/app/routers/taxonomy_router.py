from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import uuid

from app.database.database import get_db
from app.models.skill_model import Skill
from app.models.profile_model import Tag
from app.schemas.profile_schema import SkillCreate, SkillResponse, TagCreate, TagResponse
from app.dependencies import require_roles, get_current_user
from app.models.user_model import User

router = APIRouter()

# --- Skills ---

@router.get("/skills", response_model=list[SkillResponse])
def list_skills(db: Session = Depends(get_db)):
    return db.query(Skill).order_by(Skill.name.asc()).all()

@router.post("/skills", response_model=SkillResponse)
def create_skill(body: SkillCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    existing = db.query(Skill).filter(func.lower(Skill.name) == func.lower(body.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists")
    item = Skill(name=body.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/skills/{skill_id}", response_model=SkillResponse)
def update_skill(skill_id: uuid.UUID, body: SkillCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = db.query(Skill).filter(Skill.id == skill_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    existing = (
        db.query(Skill)
        .filter(func.lower(Skill.name) == func.lower(body.name), Skill.id != skill_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists")
    item.name = body.name
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = db.query(Skill).filter(Skill.id == skill_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(item)
    db.commit()
    return

# --- Tags ---

@router.get("/tags", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    return db.query(Tag).order_by(Tag.name.asc()).all()

@router.post("/tags", response_model=TagResponse)
def create_tag(body: TagCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Tag).filter(func.lower(Tag.name) == func.lower(body.name)).first()
    if existing:
        return existing  # Return existing tag if it already exists, instead of 400
    item = Tag(name=body.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/tags/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: uuid.UUID, body: TagCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = db.query(Tag).filter(Tag.id == tag_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    existing = (
        db.query(Tag)
        .filter(func.lower(Tag.name) == func.lower(body.name), Tag.id != tag_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    item.name = body.name
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = db.query(Tag).filter(Tag.id == tag_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(item)
    db.commit()
    return

