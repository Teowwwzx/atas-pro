from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import uuid
from sqlalchemy.sql import func
from app.database.database import get_db
from app.dependencies import require_roles, get_current_user
from app.models.user_model import User, UserStatus, Role
from app.models.profile_model import Profile
from app.services.user_service import (
    create_user,
    assign_role_to_user,
    remove_role_from_user,
)
from app.services.audit_service import log_admin_action

router = APIRouter()


@router.get("/me")
def users_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "roles": [r.name for r in getattr(current_user, "roles", [])],
        "is_dashboard_pro": current_user.is_dashboard_pro,
    }


@router.post("/me/enable-dashboard-pro")
def enable_dashboard_pro(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enable Dashboard Pro for the current user"""
    current_user.is_dashboard_pro = True
    db.commit()
    return {"dashboard_pro": True}


@router.delete("/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete the current user's account"""
    from datetime import datetime
    
    # Soft delete: set deleted_at timestamp and change status to inactive
    current_user.deleted_at = datetime.now()
    current_user.status = UserStatus.inactive
    db.commit()
    
    return {"message": "Account deleted successfully"}


@router.get("/{user_id}")
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "customer_support"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(u.id),
        "email": u.email,
        "is_verified": bool(u.is_verified),
        "status": (u.status.value if isinstance(u.status, UserStatus) else str(u.status)),
        "roles": [r.name for r in getattr(u, "roles", [])],
    }


@router.put("/{user_id}")
def update_user(
    user_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "customer_support"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    email = body.get("email")
    if isinstance(email, str) and email:
        u.email = email
    is_verified = body.get("is_verified")
    if isinstance(is_verified, bool):
        u.is_verified = is_verified
    status = body.get("status")
    if isinstance(status, str) and status:
        try:
            u.status = UserStatus(status)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid status")
    db.add(u)
    db.commit()
    db.refresh(u)
    return {
        "id": str(u.id),
        "email": u.email,
        "is_verified": bool(u.is_verified),
        "status": (u.status.value if isinstance(u.status, UserStatus) else str(u.status)),
        "roles": [r.name for r in getattr(u, "roles", [])],
    }

@router.get("")
def list_users(
    email: str | None = None,
    status: UserStatus | None = None,
    is_verified: bool | None = None,
    name: str | None = None,
    role: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "customer_support"]))
):
    q = db.query(User).options(joinedload(User.profile))
    if email:
        q = q.filter(func.lower(User.email).like(f"%{email.lower()}%"))
    if status is not None:
        q = q.filter(User.status == status)
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    
    if name:
        q = q.join(Profile, Profile.user_id == User.id).filter(func.lower(Profile.full_name).like(f"%{name.lower()}%"))
    
    # Role filtering
    if role:
        q = q.join(User.roles).filter(Role.name == role)
    
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(User.created_at.desc() if hasattr(User, "created_at") else User.email.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name, # Accessed via property or loaded relationship
            "is_verified": bool(u.is_verified),
            "status": (u.status.value if isinstance(u.status, UserStatus) else str(u.status)),
            "roles": [r.name for r in getattr(u, "roles", [])],
            "created_at": u.created_at.isoformat() if hasattr(u, "created_at") and u.created_at else None
        }
        for u in items
    ]


@router.get("/search/count")
def count_users(
    email: str | None = None,
    status: UserStatus | None = None,
    is_verified: bool | None = None,
    name: str | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "customer_support"]))
):
    q = db.query(User)
    if email:
        q = q.filter(func.lower(User.email).like(f"%{email.lower()}%"))
    if status is not None:
        q = q.filter(User.status == status)
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    if name:
        q = q.join(Profile, Profile.user_id == User.id).filter(func.lower(Profile.full_name).like(f"%{name.lower()}%"))
    
    # Role filtering
    if role:
        q = q.join(User.roles).filter(Role.name == role)
    
    total = q.with_entities(User.id).distinct().count()
    return {"total_count": total}


@router.post("/{user_id}/suspend")
def admin_suspend_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = UserStatus.suspended
    db.commit()
    log_admin_action(db, current_user.id, "user.suspend", "user", u.id, "User suspended by admin")
    return {"user_id": str(u.id), "status": u.status.value}


@router.post("/{user_id}/activate")
def admin_activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = UserStatus.active
    db.commit()
    log_admin_action(db, current_user.id, "user.activate", "user", u.id, "User activated by admin")
    return {"user_id": str(u.id), "status": u.status.value}


@router.post("/{user_id}/roles/{role_name}")
def admin_assign_role(
    user_id: str,
    role_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    assign_role_to_user(db, u, role_name.strip().lower())
    db.commit()
    log_admin_action(db, current_user.id, "user.role.assign", "user", u.id, f"Role {role_name} assigned")
    return {"user_id": str(u.id), "roles": [r.name for r in u.roles]}


@router.delete("/{user_id}/roles/{role_name}")
def admin_remove_role(
    user_id: str,
    role_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    remove_role_from_user(db, u, role_name.strip().lower())
    db.commit()
    log_admin_action(db, current_user.id, "user.role.remove", "user", u.id, f"Role {role_name} removed")
    return {"user_id": str(u.id), "roles": [r.name for r in u.roles]}


@router.post("/{user_id}/expert/verify")
def admin_verify_expert(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    assign_role_to_user(db, u, "expert")
    db.commit()
    return {"user_id": str(u.id), "verified_role": "expert"}


@router.delete("/{user_id}/expert/verify")
def admin_revoke_expert(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    remove_role_from_user(db, u, "expert")
    db.commit()
    return {"user_id": str(u.id), "revoked_role": "expert"}
