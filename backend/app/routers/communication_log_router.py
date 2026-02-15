
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.communication_log_model import CommunicationLog, CommunicationStatus
from app.schemas.communication_log_schema import CommunicationLogResponse
from app.dependencies import get_current_user, require_roles
from app.models.user_model import User
import resend
from app.core.config import settings
import logging

router = APIRouter(prefix="/admin/communications", tags=["Admin Communications"])

logger = logging.getLogger(__name__)

# Ensure only admins can access (Assuming you have a role check or just check user.role)
# For now I will just check if user is authenticated and is admin.
# Adjust per your auth implementation.

resend.api_key = settings.RESEND_API_KEY

@router.get("/", response_model=list[CommunicationLogResponse])
def get_logs(
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin", "customer_support"]))
):
    query = db.query(CommunicationLog).order_by(CommunicationLog.created_at.desc())
    if status:
        try:
            enum_status = CommunicationStatus(status)
            query = query.filter(CommunicationLog.status == enum_status)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid status")
    return query.offset(skip).limit(limit).all()

@router.post("/{log_id}/resend")
def resend_log(log_id: str, db: Session = Depends(get_db), admin: User = Depends(require_roles(["admin", "customer_support"]))):
    log = db.query(CommunicationLog).filter(CommunicationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.status == CommunicationStatus.SENT:
        pass

    # Basic Resend Logic using stored HTML
    # We are updating the EXISTING log record for simplicity of the UI (Retry -> Success)
    # Ideally should be a new log, but let's keep it simple as requested.
    
    try:
        if not log.recipient or not log.subject or not log.content:
            raise HTTPException(status_code=400, detail="Missing data in log to resend")
        params = {
            "from": settings.SENDER_EMAIL,
            "to": [log.recipient],
            "subject": log.subject,
            "html": log.content,
        }
        log.status = CommunicationStatus.PENDING
        db.commit()
        resend.Emails.send(params)
        log.status = CommunicationStatus.SENT
        log.error_message = None
        db.commit()
        return {"message": "Email resent successfully", "status": "sent"}
    except Exception as e:
        logger.error(f"Resend failed for {log_id}: {e}")
        log.status = CommunicationStatus.FAILED
        log.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to resend: {e}")
