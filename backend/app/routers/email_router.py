from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.schemas.email_schema import PasswordResetRequest, PasswordReset
from app.services.email_service import send_password_reset_email
from app.core.security import get_password_hash
import secrets

router = APIRouter()

@router.post("/forgot-password")
def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status == UserStatus.suspended:
        raise HTTPException(status_code=400, detail="Account suspended")

    # Generate 6-digit OTP
    token = str(secrets.randbelow(900000) + 100000)
    user.verification_token = token
    db.commit()
    
    send_password_reset_email(email=user.email, token=token)
    return {"message": "Password reset email sent"}

@router.post("/reset-password")
def reset_password(request: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.verification_token != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user.password = get_password_hash(request.password)
    user.verification_token = None
    user.is_verified = True # Implicitly verify if they can reset password via email
    if user.status == UserStatus.inactive:
        user.status = UserStatus.active
        
    db.commit()
    return {"message": "Password reset successfully"}