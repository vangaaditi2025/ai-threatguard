from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.session import get_session
from . import schemas, crud, utils
from datetime import datetime, timedelta
import secrets
import requests
from ..admin.utils import create_activity_log
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post('/register', response_model=schemas.UserOut)
async def register(payload: schemas.RegisterIn, db: AsyncSession = Depends(get_session)):
    existing = await crud.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user = await crud.create_user(db, payload.email, payload.password)
    # create email verification token
    token = secrets.token_urlsafe(32)
    await crud.create_email_verification(db, user, token)
    await create_activity_log(db, user.id, 'register', 'New user registration initiated')
    # send email (stub)
    print(f"Email verification link: /auth/verify?token={token}")
    return user

@router.post('/verify-email')
async def verify_email(payload: schemas.VerifyEmailIn, db: AsyncSession = Depends(get_session)):
    ev = await crud.get_email_verification(db, payload.token)
    if not ev:
        raise HTTPException(status_code=400, detail='Invalid or expired token')
    # activate user
    q = await db.execute("SELECT * FROM users WHERE id = :id", {'id': ev.user_id})
    # simple SQL; use ORM instead
    from sqlalchemy import select
    res = await db.execute(select(User).where(User.id == ev.user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail='User not found')
    user.is_active = True
    await crud.delete_email_verification(db, ev)
    await db.commit()
    return {'ok': True}

@router.post('/login', response_model=schemas.TokenOut)
async def login(payload: schemas.LoginIn, db: AsyncSession = Depends(get_session)):
    user = await crud.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=400, detail='Incorrect email or password')
    if not user.is_active:
        raise HTTPException(status_code=400, detail='Email not verified')
    access = utils.create_access_token(subject=str(user.id))
    rt = await crud.create_refresh_token_entry(db, user)
    await create_activity_log(db, user.id, 'login', 'User authenticated successfully')
    return {'access_token': access, 'refresh_token': rt.token}

@router.post('/refresh', response_model=schemas.TokenOut)
async def refresh_token(payload: schemas.RefreshIn, db: AsyncSession = Depends(get_session)):
    # verify refresh token exists
    from sqlalchemy import select
    from ..models.token import RefreshToken as RefreshTokenModel
    q = await db.execute(select(RefreshTokenModel).where(RefreshTokenModel.token == payload.refresh_token))
    rt = q.scalars().first()
    if not rt:
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    if rt.expires_at < datetime.utcnow():
        await crud.revoke_refresh_token(db, rt.token)
        raise HTTPException(status_code=401, detail='Refresh token expired')
    # rotate
    await crud.revoke_refresh_token(db, rt.token)
    user_q = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_q.scalars().first()
    access = utils.create_access_token(subject=str(user.id))
    new_rt = await crud.create_refresh_token_entry(db, user)
    return {'access_token': access, 'refresh_token': new_rt.token}

@router.post('/forgot-password')
async def forgot_password(payload: schemas.ForgotPasswordIn, db: AsyncSession = Depends(get_session)):
    user = await crud.get_user_by_email(db, payload.email)
    if not user:
        return {'ok': True}
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    await crud.create_password_reset(db, user, token, expires)
    await create_activity_log(db, user.id, 'forgot_password', 'Password reset requested')
    print(f"Password reset link: /auth/reset-password?token={token}")
    return {'ok': True}

@router.post('/reset-password')
async def reset_password(payload: schemas.ResetPasswordIn, db: AsyncSession = Depends(get_session)):
    pr = await crud.get_password_reset(db, payload.token)
    if not pr or pr.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail='Invalid or expired token')
    user = await crud.consume_password_reset(db, pr, payload.new_password)
    if not user:
        raise HTTPException(status_code=400, detail='Failed to reset password')
    return {'ok': True}

@router.post('/google')
async def google_oauth(payload: schemas.OAuthIn, db: AsyncSession = Depends(get_session)):
    if payload.provider != 'google':
        raise HTTPException(status_code=400, detail='Unsupported provider')
    # validate id_token with Google
    try:
        resp = requests.get('https://oauth2.googleapis.com/tokeninfo', params={'id_token': payload.id_token}, timeout=5)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail='Invalid Google token')
        data = resp.json()
        email = data.get('email')
        sub = data.get('sub')
        if not email or not sub:
            raise HTTPException(status_code=400, detail='Invalid token data')
        # get or create user
        from sqlalchemy import select
        q = await db.execute(select(User).where(User.email == email))
        user = q.scalars().first()
        if not user:
            # create user and oauth account
            from ..models.token import OAuthAccount
            from ..models.user import User as UserModel
            hashed = utils.hash_password(secrets.token_urlsafe(16))
            user = UserModel(email=email, hashed_password=hashed, is_active=True)
            db.add(user)
            await db.flush()
            oa = OAuthAccount(user_id=user.id, provider='google', provider_user_id=sub, extra_data=str(data))
            db.add(oa)
            await db.commit()
            await db.refresh(user)
        access = utils.create_access_token(subject=str(user.id))
        rt = await crud.create_refresh_token_entry(db, user)
        return {'access_token': access, 'refresh_token': rt.token}
    except requests.RequestException:
        raise HTTPException(status_code=500, detail='Failed to verify Google token')

# simple protected endpoint
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
security = HTTPBearer()

@router.get('/me', response_model=schemas.UserOut)
async def me(creds: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_session)):
    token = creds.credentials
    try:
        data = jwt.decode(token, utils.JWT_SECRET, algorithms=[utils.JWT_ALGORITHM])
        user_id = int(data.get('sub'))
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid token')
    from sqlalchemy import select
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    roles = await crud.get_user_roles(db, user)
    return {'id': user.id, 'email': user.email, 'is_active': user.is_active, 'is_superuser': user.is_superuser, 'roles': roles}
