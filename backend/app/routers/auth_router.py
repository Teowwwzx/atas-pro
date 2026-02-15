# auth_router.py

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import create_access_token, verify_password, decode_access_token, get_password_hash
from datetime import timedelta, datetime, timezone
from app.dependencies import get_current_user
from app.core.config import settings
import requests
import secrets
from pydantic import BaseModel, EmailStr

router = APIRouter()

from app.schemas.user_schema import UserCreate, UserResponse
from app.services.user_service import create_user


@router.post("/register", response_model=UserResponse)
def register_user(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db=db, user=user, background_tasks=background_tasks)


@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == UserStatus.suspended:
        raise HTTPException(
            status_code=400,
            detail="Your account has been suspended. Please contact support.",
        )
    if user.status != UserStatus.active:
        # If account is inactive but already verified, it's an admin issue
        if user.is_verified:
            raise HTTPException(
                status_code=400,
                detail="Your account is inactive. Please contact admin for assistance.",
            )
        # If account is inactive and not verified, needs email verification
        else:
            raise HTTPException(
                status_code=400,
                detail="User is not active. Please verify your email.",
            )
    access_token = create_access_token(
        data={"sub": str(user.id), "type": "access"}
    )
    refresh_token = create_access_token(
        data={"sub": user.email, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

@router.post("/verify")
def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
         # Use dummy time to prevent enumeration
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    if user.verification_token != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Check for token expiration
    if user.verification_token_expires_at and user.verification_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")
        
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    user.is_verified = True
    user.status = UserStatus.active
    user.verification_token = None
    db.commit()

    # Generate tokens for auto-login
    access_token = create_access_token(
        data={"sub": str(user.id), "type": "access"}
    )
    refresh_token = create_access_token(
        data={"sub": user.email, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )

    return {
        "message": "Email verified successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh")
def refresh_access_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_access_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or user.status != UserStatus.active:
        raise HTTPException(status_code=400, detail="User invalid or inactive")
    access_token = create_access_token(data={"sub": str(user.id), "type": "access"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out"}

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(body.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    # Update password
    current_user.password = get_password_hash(body.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

from pydantic import BaseModel, EmailStr
import uuid
from app.services.email_service import send_verification_email

class ResendVerificationRequest(BaseModel):
    email: EmailStr

@router.post("/resend-verification")
def resend_verification_email_endpoint(
    request: ResendVerificationRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    print(f" [DEBUG] Resend verification for: {request.email}")
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        print(" [DEBUG] User not found.")
        return {"message": "If your account exists and is unverified, a new verification email has been sent."}
        
    if user.status == UserStatus.suspended:
        print(" [DEBUG] User suspended.")
        return {"message": "Your account is suspended. Please contact support."}

    if user.is_verified:
        print(" [DEBUG] User already verified.")
        return {"message": "Email is already verified. Please login."}

    print(" [DEBUG] Sending verification email via background task.")
    # Generate new 6-digit OTP
    new_token = str(secrets.randbelow(900000) + 100000)
    user.verification_token = new_token
    user.verification_token_expires_at = datetime.now() + timedelta(hours=24)
    db.commit()

    background_tasks.add_task(send_verification_email, user.email, new_token)
    
    return {"message": "Verification email resent successfully."}

class GoogleIdTokenRequest(BaseModel):
    id_token: str

def _process_google_payload(payload: dict, db: Session) -> dict:
    aud = payload.get("aud")
    iss = payload.get("iss")
    email = payload.get("email")
    email_verified = payload.get("email_verified")
    sub = payload.get("sub")
    if aud != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid Google token audience")
    if iss not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid Google token issuer")
    if not email or str(email_verified).lower() != "true":
        raise HTTPException(status_code=401, detail="Unverified Google account")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        random_pw = secrets.token_urlsafe(32)
        user = create_user(db=db, user=UserCreate(email=email, password=random_pw))
        user.is_verified = True
        user.status = UserStatus.active
        user.verification_token = None
        db.commit()
        db.refresh(user)
    else:
        if user.status == UserStatus.suspended:
            raise HTTPException(status_code=400, detail="Your account has been suspended. Please contact support.")
        if not user.is_verified or user.status != UserStatus.active:
            user.is_verified = True
            user.status = UserStatus.active
            db.commit()
            db.refresh(user)
    access_token = create_access_token(data={"sub": str(user.id), "type": "access"})
    refresh_token = create_access_token(data={"sub": user.email, "type": "refresh"}, expires_delta=timedelta(days=30))
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/google")
def google_sign_in(body: GoogleIdTokenRequest, db: Session = Depends(get_db)):
    r = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": body.id_token})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    payload = r.json()
    return _process_google_payload(payload, db)

@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    r = requests.post("https://oauth2.googleapis.com/token", data=data)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google authorization failed")
    body = r.json()
    id_token = body.get("id_token")
    if not id_token:
        raise HTTPException(status_code=401, detail="Google id_token missing")
    v = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
    if v.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    payload = v.json()
    return _process_google_payload(payload, db)
