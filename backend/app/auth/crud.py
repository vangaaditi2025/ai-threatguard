from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from ..models.user import User
from ..models.role import Role, user_roles
from ..models.token import RefreshToken, EmailVerification, PasswordReset, OAuthAccount
from .utils import hash_password, verify_password, create_refresh_token, create_access_token
from typing import Optional
from jose import JWTError
import uuid

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    q = select(User).where(User.email == email)
    res = await db.execute(q)
    return res.scalars().first()

async def create_user(db: AsyncSession, email: str, password: str) -> User:
    hashed = hash_password(password)
    user = User(email=email, hashed_password=hashed, is_active=False, is_superuser=False)
    db.add(user)
    await db.flush()
    # assign default role
    role_q = select(Role).where(Role.name == 'user')
    role_res = await db.execute(role_q)
    role = role_res.scalars().first()
    if role is None:
        role = Role(name='user')
        db.add(role)
        await db.flush()
    await db.execute(user_roles.insert().values(user_id=user.id, role_id=role.id))
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def create_refresh_token_entry(db: AsyncSession, user: User):
    token, expires = create_refresh_token()
    rt = RefreshToken(user_id=user.id, token=token, expires_at=expires)
    db.add(rt)
    await db.commit()
    return rt

async def revoke_refresh_token(db: AsyncSession, token: str):
    q = select(RefreshToken).where(RefreshToken.token == token)
    res = await db.execute(q)
    rt = res.scalars().first()
    if rt:
        await db.delete(rt)
        await db.commit()

async def create_email_verification(db: AsyncSession, user: User, token: str):
    ev = EmailVerification(user_id=user.id, token=token)
    db.add(ev)
    await db.commit()
    return ev

async def get_email_verification(db: AsyncSession, token: str) -> Optional[EmailVerification]:
    q = select(EmailVerification).where(EmailVerification.token == token)
    res = await db.execute(q)
    return res.scalars().first()

async def delete_email_verification(db: AsyncSession, ev: EmailVerification):
    await db.delete(ev)
    await db.commit()

async def create_password_reset(db: AsyncSession, user: User, token: str, expires_at: datetime):
    pr = PasswordReset(user_id=user.id, token=token, expires_at=expires_at)
    db.add(pr)
    await db.commit()
    return pr

async def get_password_reset(db: AsyncSession, token: str) -> Optional[PasswordReset]:
    q = select(PasswordReset).where(PasswordReset.token == token)
    res = await db.execute(q)
    return res.scalars().first()

async def consume_password_reset(db: AsyncSession, pr: PasswordReset, new_password: str):
    user_q = select(User).where(User.id == pr.user_id)
    res = await db.execute(user_q)
    user = res.scalars().first()
    if user:
        user.hashed_password = hash_password(new_password)
        await db.delete(pr)
        await db.commit()
        return user
    return None

async def get_user_roles(db: AsyncSession, user: User):
    # simple query returning role names
    q = select(Role.name).select_from(user_roles.join(Role, user_roles.c.role_id == Role.id)).where(user_roles.c.user_id == user.id)
    res = await db.execute(q)
    return [r[0] for r in res.fetchall()]

async def get_or_create_oauth_account(db: AsyncSession, provider: str, provider_user_id: str, email: str):
    q = select(OAuthAccount).where(OAuthAccount.provider == provider, OAuthAccount.provider_user_id == provider_user_id)
    res = await db.execute(q)
    oa = res.scalars().first()
    if oa:
        user_q = select(User).where(User.id == oa.user_id)
        user_res = await db.execute(user_q)
        return user_res.scalars().first()
    # create user
    user = User(email=email, hashed_password=hash_password(uuid.uuid4().hex), is_active=True)
    db.add(user)
    await db.flush()
    # create oauth account
    oa = OAuthAccount(user_id=user.id, provider=provider, provider_user_id=provider_user_id)
    db.add(oa)
    await db.commit()
    await db.refresh(user)
    return user
