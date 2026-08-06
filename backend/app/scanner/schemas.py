from pydantic import BaseModel
from typing import Any, Dict, Optional, List

class ScanReportBase(BaseModel):
    report_id: int
    filename: str
    file_type: str
    classification: str
    risk_score: int
    metadata: Dict[str, Any]
    report_data: Dict[str, Any]
    vt_insights: Optional[Dict[str, Any]] = None

class ScanResponse(BaseModel):
    report_id: int
    report: Dict[str, Any]

class DownloadReportResponse(BaseModel):
    report_id: int
    filename: str
    report_data: Dict[str, Any]

class URLScanRequest(BaseModel):
    url: str

class URLScanResponse(BaseModel):
    report_id: int
    report: Dict[str, Any]

class URLHistoryItem(BaseModel):
    id: int
    url: str
    classification: str
    risk_score: int
    created_at: str

class URLReportSummary(BaseModel):
    report_id: int
    url: str
    classification: str
    risk_score: int
    domain: Optional[str] = None
    created_at: str

class EmailScanRequest(BaseModel):
    email_text: str

class EmailScanResponse(BaseModel):
    report_id: int
    report: Dict[str, Any]

class EmailHistoryItem(BaseModel):
    id: int
    subject: str
    classification: str
    risk_score: int
    created_at: str
