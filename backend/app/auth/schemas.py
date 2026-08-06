from pydantic import BaseModel, EmailStr
from typing import Optional, List

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str

class RefreshIn(BaseModel):
    refresh_token: str

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str

class VerifyEmailIn(BaseModel):
    token: str

class OAuthIn(BaseModel):
    provider: str
    id_token: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    is_superuser: bool
    roles: Optional[List[str]] = []

    class Config:
        orm_mode = True
