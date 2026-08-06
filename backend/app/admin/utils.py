from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.admin import AuditLog, ActivityLog


async def create_audit_log(db: AsyncSession, actor: str, action: str, target: str | None = None, details: str | None = None):
    audit = AuditLog(actor=actor, action=action, target=target, details=details)
    db.add(audit)
    await db.commit()
    return audit


async def create_activity_log(db: AsyncSession, user_id: int | None, action: str, details: str | None = None, ip_address: str | None = None):
    activity = ActivityLog(user_id=user_id, action=action, details=details, ip_address=ip_address)
    db.add(activity)
    await db.commit()
    return activity
