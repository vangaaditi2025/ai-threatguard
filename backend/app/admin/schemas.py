from pydantic import BaseModel
from typing import List, Optional


class UserSummary(BaseModel):
    id: int
    email: str
    is_active: bool
    is_superuser: bool
    roles: List[str]


class UserRoleUpdate(BaseModel):
    roles: List[str]


class UserActivationUpdate(BaseModel):
    is_active: bool


class RoleSummary(BaseModel):
    id: int
    name: str
    permissions: List[str] = []


class PermissionSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class AuditLogItem(BaseModel):
    id: int
    actor: str
    action: str
    target: Optional[str]
    details: Optional[str]
    created_at: str


class ActivityLogItem(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    created_at: str


class ThreatAnalyticsResponse(BaseModel):
    total_file_scans: int
    total_url_scans: int
    total_email_scans: int
    high_risk_scans: int
    medium_risk_scans: int
    benign_scans: int
    active_users: int
    user_roles: dict
