from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from .base import Base

class ScanReport(Base):
    __tablename__ = 'scan_reports'

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(512), nullable=False)
    content_type = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    sha256 = Column(String(64), nullable=False, unique=True)
    risk_score = Column(Integer, nullable=False)
    classification = Column(String(50), nullable=False)
    report_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class URLScanReport(Base):
    __tablename__ = 'url_scan_reports'

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(2048), nullable=False)
    normalized_url = Column(String(2048), nullable=False)
    domain = Column(String(255), nullable=True)
    classification = Column(String(50), nullable=False)
    risk_score = Column(Integer, nullable=False)
    report_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EmailScanReport(Base):
    __tablename__ = 'email_scan_reports'

    id = Column(Integer, primary_key=True, index=True)
    email_sha256 = Column(String(64), nullable=False, unique=True)
    subject = Column(String(1024), nullable=True)
    from_address = Column(String(512), nullable=True)
    to_address = Column(String(1024), nullable=True)
    classification = Column(String(50), nullable=False)
    risk_score = Column(Integer, nullable=False)
    report_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
