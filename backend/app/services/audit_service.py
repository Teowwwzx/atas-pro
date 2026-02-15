from sqlalchemy.orm import Session
from uuid import UUID
from app.models.audit_log_model import AuditLog


def log_admin_action(db: Session, actor_user_id: UUID, action: str, target_type: str, target_id: UUID, details: str | None = None):
    entry = AuditLog(user_id=actor_user_id, action=action, target_type=target_type, target_id=target_id, details=details)
    db.add(entry)
    db.commit()
    return entry
