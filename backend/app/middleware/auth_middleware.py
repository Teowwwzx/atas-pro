from fastapi import Request, Response, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user_model import User, Role, UserStatus
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_active_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.status != UserStatus.active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def require_role(required_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if not any(role.name in required_roles for role in current_user.roles):
            raise HTTPException(status_code=403, detail="Not authorized")
        return current_user
    return role_checker