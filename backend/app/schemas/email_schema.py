from pydantic import BaseModel, EmailStr

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    email: EmailStr
    code: str
    password: str


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    variables: list[str] | None = None


class EmailTemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body_html: str | None = None
    variables: list[str] | None = None
