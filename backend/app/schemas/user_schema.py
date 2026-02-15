# user_schema.py


from pydantic import BaseModel, EmailStr, ConfigDict
import uuid
from app.models.user_model import UserStatus

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_verified: bool
    status: UserStatus
    created_at: __import__("datetime").datetime | None = None

class UserMeResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    roles: list[str]

class UserUpdateAdmin(BaseModel):
    email: EmailStr | None = None
    is_verified: bool | None = None
    status: UserStatus | None = None
