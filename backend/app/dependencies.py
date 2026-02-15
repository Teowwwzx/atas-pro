import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, Role
from app.core.security import decode_access_token
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

from fastapi import Query

def get_current_user_sse(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
    token_query: str | None = Query(None, alias="token")
) -> User:
    """
    Custom dependency for SSE endpoints that supports both Bearer token and Query param token.
    """
    final_token = token or token_query
    
    if not final_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(final_token)
        if payload is None:
             raise HTTPException(status_code=401, detail="Invalid token")
             
        user_id_str = payload.get("sub")
        if user_id_str is None:
             raise HTTPException(status_code=401, detail="Invalid token payload")
             
        user_id = uuid.UUID(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id_str = payload.get("sub")
    if user_id_str is None:
        return None
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    return user

def require_roles(required: list[str]):
    def _dep(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        roles = (
            db.query(Role)
            .join(Role.users)
            .filter(User.id == current_user.id)
            .all()
        )
        names = {r.name for r in roles}
        if required and not any(name in names for name in required):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return current_user
    return _dep