from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..auth import utils as auth_utils
from ..models.user import User
from ..models.role import Role, user_roles
from ..models.admin import Permission, AuditLog, ActivityLog
from . import schemas, utils

router = APIRouter(prefix='/admin', tags=['admin'])
security = HTTPBearer()


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_session)) -> User:
    token = creds.credentials
    try:
        data = auth_utils.jwt.decode(token, auth_utils.JWT_SECRET, algorithms=[auth_utils.JWT_ALGORITHM])
        user_id = int(data.get('sub'))
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid token')
    q = await db.execute(select(User).where(User.id == user_id))
    user = q.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail='Admin access required')
    return user


@router.get('/users', response_model=list[schemas.UserSummary])
async def list_users(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    results = []
    for user in users:
        role_names = [r.name for r in getattr(user, 'roles', [])]
        results.append({
            'id': user.id,
            'email': user.email,
            'is_active': user.is_active,
            'is_superuser': user.is_superuser,
            'roles': role_names,
        })
    return results


@router.post('/users/{user_id}/roles', response_model=schemas.UserSummary)
async def update_user_roles(user_id: int, payload: schemas.UserRoleUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    q = await db.execute(select(User).where(User.id == user_id))
    user = q.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    user.roles = []
    for name in payload.roles:
        role_q = await db.execute(select(Role).where(Role.name == name))
        role = role_q.scalars().first()
        if not role:
            role = Role(name=name)
            db.add(role)
            await db.flush()
        user.roles.append(role)

    await utils.create_audit_log(db, actor=admin.email, action='update_roles', target=str(user.id), details=f'Assigned roles: {payload.roles}')
    await db.commit()
    role_names = [r.name for r in user.roles]
    return {
        'id': user.id,
        'email': user.email,
        'is_active': user.is_active,
        'is_superuser': user.is_superuser,
        'roles': role_names,
    }


@router.post('/users/{user_id}/activation', response_model=schemas.UserSummary)
async def update_user_activation(user_id: int, payload: schemas.UserActivationUpdate, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    q = await db.execute(select(User).where(User.id == user_id))
    user = q.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    user.is_active = payload.is_active
    await utils.create_audit_log(db, actor=admin.email, action='user_activation', target=str(user.id), details=f'Set active={payload.is_active}')
    await db.commit()
    role_names = [r.name for r in getattr(user, 'roles', [])]
    return {
        'id': user.id,
        'email': user.email,
        'is_active': user.is_active,
        'is_superuser': user.is_superuser,
        'roles': role_names,
    }


@router.get('/roles', response_model=list[schemas.RoleSummary])
async def list_roles(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    roles_result = await db.execute(select(Role))
    roles = roles_result.scalars().all()
    return [
        {'id': role.id, 'name': role.name, 'permissions': [perm.name for perm in getattr(role, 'permissions', [])]}
        for role in roles
    ]


@router.get('/permissions', response_model=list[schemas.PermissionSummary])
async def list_permissions(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    perm_result = await db.execute(select(Permission))
    permissions = perm_result.scalars().all()
    return [
        {'id': perm.id, 'name': perm.name, 'description': perm.description}
        for perm in permissions
    ]


@router.get('/audit-logs', response_model=list[schemas.AuditLogItem])
async def get_audit_logs(limit: int = Query(20, ge=1, le=100), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    logs_result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
    logs = logs_result.scalars().all()
    return [
        {
            'id': log.id,
            'actor': log.actor,
            'action': log.action,
            'target': log.target,
            'details': log.details,
            'created_at': log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get('/activity-logs', response_model=list[schemas.ActivityLogItem])
async def get_activity_logs(limit: int = Query(20, ge=1, le=100), admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    logs_result = await db.execute(select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit))
    logs = logs_result.scalars().all()
    return [
        {
            'id': log.id,
            'user_id': log.user_id,
            'action': log.action,
            'details': log.details,
            'ip_address': log.ip_address,
            'created_at': log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get('/threat-analytics', response_model=schemas.ThreatAnalyticsResponse)
async def threat_analytics(admin: User = Depends(require_admin), db: AsyncSession = Depends(get_session)):
    from ..models.scan_report import ScanReport, URLScanReport, EmailScanReport

    file_count = await db.execute(select(func.count(ScanReport.id)))
    url_count = await db.execute(select(func.count(URLScanReport.id)))
    email_count = await db.execute(select(func.count(EmailScanReport.id)))
    high_files = await db.execute(select(func.count(ScanReport.id)).where(ScanReport.classification == 'malicious'))
    high_urls = await db.execute(select(func.count(URLScanReport.id)).where(URLScanReport.classification == 'malicious'))
    high_emails = await db.execute(select(func.count(EmailScanReport.id)).where(EmailScanReport.classification == 'malicious'))
    med_files = await db.execute(select(func.count(ScanReport.id)).where(ScanReport.classification == 'suspicious'))
    med_urls = await db.execute(select(func.count(URLScanReport.id)).where(URLScanReport.classification == 'medium'))
    med_emails = await db.execute(select(func.count(EmailScanReport.id)).where(EmailScanReport.classification == 'suspicious'))
    benign_files = await db.execute(select(func.count(ScanReport.id)).where(ScanReport.classification == 'benign'))
    benign_urls = await db.execute(select(func.count(URLScanReport.id)).where(URLScanReport.classification == 'low'))
    benign_emails = await db.execute(select(func.count(EmailScanReport.id)).where(EmailScanReport.classification == 'benign'))
    user_count = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    role_counts = {}
    roles_result = await db.execute(select(Role.name, func.count(user_roles.c.user_id)).select_from(user_roles.join(Role, user_roles.c.role_id == Role.id)).group_by(Role.name))
    for name, count in roles_result.all():
        role_counts[name] = count
    return {
        'total_file_scans': file_count.scalar() or 0,
        'total_url_scans': url_count.scalar() or 0,
        'total_email_scans': email_count.scalar() or 0,
        'high_risk_scans': sum([high_files.scalar() or 0, high_urls.scalar() or 0, high_emails.scalar() or 0]),
        'medium_risk_scans': sum([med_files.scalar() or 0, med_urls.scalar() or 0, med_emails.scalar() or 0]),
        'benign_scans': sum([benign_files.scalar() or 0, benign_urls.scalar() or 0, benign_emails.scalar() or 0]),
        'active_users': user_count.scalar() or 0,
        'user_roles': role_counts,
    }
