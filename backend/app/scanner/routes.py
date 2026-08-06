from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.session import get_session
from ..models.scan_report import ScanReport, URLScanReport, EmailScanReport
from . import utils, schemas
from sqlalchemy import select
import json

router = APIRouter(prefix="/scanner", tags=["scanner"])

@router.post('/scan', response_model=schemas.ScanResponse)
async def scan_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_session)):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail='Uploaded file is empty')

    metadata = utils.extract_metadata(contents, file.filename, file.content_type or 'application/octet-stream')
    vt_insights = utils.query_virustotal(metadata['sha256'])
    classification = utils.classify_threat(metadata, vt_insights)
    report = utils.build_report(metadata, classification, vt_insights)

    existing = await db.execute(select(ScanReport).where(ScanReport.sha256 == metadata['sha256']))
    scan_report = existing.scalars().first()
    if scan_report:
        scan_report.report_data = report
        scan_report.risk_score = classification['risk_score']
        scan_report.classification = classification['classification']
        scan_report.filename = metadata['filename']
        scan_report.content_type = metadata['content_type']
        scan_report.file_type = metadata['file_type']
    else:
        scan_report = ScanReport(
            filename=metadata['filename'],
            content_type=metadata['content_type'],
            file_type=metadata['file_type'],
            sha256=metadata['sha256'],
            risk_score=classification['risk_score'],
            classification=classification['classification'],
            report_data=report,
        )
        db.add(scan_report)

    await db.commit()
    await db.refresh(scan_report)

    return {'report_id': scan_report.id, 'report': report}

@router.get('/report/{report_id}')
async def get_report(report_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(ScanReport).where(ScanReport.id == report_id))
    scan_report = result.scalars().first()
    if not scan_report:
        raise HTTPException(status_code=404, detail='Report not found')
    return scan_report.report_data

@router.get('/report/{report_id}/download')
async def download_report(report_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(ScanReport).where(ScanReport.id == report_id))
    scan_report = result.scalars().first()
    if not scan_report:
        raise HTTPException(status_code=404, detail='Report not found')
    payload = json.dumps(scan_report.report_data, indent=2)
    return Response(content=payload, media_type='application/json', headers={
        'Content-Disposition': f'attachment; filename="scan-report-{report_id}.json"',
    })

@router.post('/url-scan', response_model=schemas.URLScanResponse)
async def scan_url(payload: schemas.URLScanRequest, db: AsyncSession = Depends(get_session)):
    try:
        normalized_url = utils.normalize_url(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    analysis = utils.analyze_url(normalized_url)
    classification = utils.classify_url_threat(analysis)
    report = utils.build_url_report(payload.url, normalized_url, analysis, classification)

    existing = await db.execute(select(URLScanReport).where(URLScanReport.normalized_url == normalized_url))
    url_report = existing.scalars().first()
    if url_report:
        url_report.url = payload.url
        url_report.normalized_url = normalized_url
        url_report.domain = analysis.get('domain')
        url_report.classification = classification['classification']
        url_report.risk_score = classification['risk_score']
        url_report.report_data = report
    else:
        url_report = URLScanReport(
            url=payload.url,
            normalized_url=normalized_url,
            domain=analysis.get('domain'),
            classification=classification['classification'],
            risk_score=classification['risk_score'],
            report_data=report,
        )
        db.add(url_report)

    await db.commit()
    await db.refresh(url_report)
    return {'report_id': url_report.id, 'report': report}

@router.get('/url-history', response_model=list[schemas.URLHistoryItem])
async def list_url_history(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(URLScanReport).order_by(URLScanReport.created_at.desc()).limit(10))
    reports = result.scalars().all()
    return [
        {
            'id': r.id,
            'url': r.url,
            'classification': r.classification,
            'risk_score': r.risk_score,
            'created_at': r.created_at.isoformat(),
        }
        for r in reports
    ]

@router.get('/url-report/{report_id}')
async def get_url_report(report_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(URLScanReport).where(URLScanReport.id == report_id))
    url_report = result.scalars().first()
    if not url_report:
        raise HTTPException(status_code=404, detail='URL report not found')
    return url_report.report_data

@router.get('/url-report/{report_id}/download')
async def download_url_report(report_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(URLScanReport).where(URLScanReport.id == report_id))
    url_report = result.scalars().first()
    if not url_report:
        raise HTTPException(status_code=404, detail='URL report not found')
    payload = json.dumps(url_report.report_data, indent=2)
    return Response(content=payload, media_type='application/json', headers={
        'Content-Disposition': f'attachment; filename="url-scan-report-{report_id}.json"',
    })

@router.post('/email-scan', response_model=schemas.EmailScanResponse)
async def scan_email(
    email_text: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_session),
):
    if not email_text and not file:
        raise HTTPException(status_code=400, detail='Provide email text or upload a .eml file')

    if file:
        raw_data = await file.read()
        try:
            email_text = raw_data.decode('utf-8', errors='replace')
        except Exception:
            email_text = raw_data.decode('latin1', errors='replace')

    analysis = utils.analyze_email(email_text)
    classification = utils.classify_email_threat(analysis)
    report = utils.build_email_report(analysis, classification)

    email_hash = utils.compute_sha256(email_text.encode('utf-8'))
    existing = await db.execute(select(EmailScanReport).where(EmailScanReport.email_sha256 == email_hash))
    email_report = existing.scalars().first()
    if email_report:
        email_report.subject = analysis.get('subject', '')
        email_report.from_address = analysis.get('from', '')
        email_report.to_address = analysis.get('to', '')
        email_report.classification = classification['classification']
        email_report.risk_score = classification['risk_score']
        email_report.report_data = report
    else:
        email_report = EmailScanReport(
            email_sha256=email_hash,
            subject=analysis.get('subject', ''),
            from_address=analysis.get('from', ''),
            to_address=analysis.get('to', ''),
            classification=classification['classification'],
            risk_score=classification['risk_score'],
            report_data=report,
        )
        db.add(email_report)

    await db.commit()
    await db.refresh(email_report)
    return {'report_id': email_report.id, 'report': report}

@router.get('/email-history', response_model=list[schemas.EmailHistoryItem])
async def list_email_history(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(EmailScanReport).order_by(EmailScanReport.created_at.desc()).limit(10))
    reports = result.scalars().all()
    return [
        {
            'id': r.id,
            'subject': r.subject or r.from_address or 'Email scan',
            'classification': r.classification,
            'risk_score': r.risk_score,
            'created_at': r.created_at.isoformat(),
        }
        for r in reports
    ]

@router.get('/email-report/{report_id}')
async def get_email_report(report_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(EmailScanReport).where(EmailScanReport.id == report_id))
    email_report = result.scalars().first()
    if not email_report:
        raise HTTPException(status_code=404, detail='Email report not found')
    return email_report.report_data

@router.get('/email-report/{report_id}/download')
async def download_email_report(report_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(EmailScanReport).where(EmailScanReport.id == report_id))
    email_report = result.scalars().first()
    if not email_report:
        raise HTTPException(status_code=404, detail='Email report not found')
    payload = json.dumps(email_report.report_data, indent=2)
    return Response(content=payload, media_type='application/json', headers={
        'Content-Disposition': f'attachment; filename="email-scan-report-{report_id}.json"',
    })

@router.get('/reports')
async def list_reports(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(ScanReport).order_by(ScanReport.created_at.desc()).limit(10))
    reports = result.scalars().all()
    return [{'id': r.id, 'filename': r.filename, 'classification': r.classification, 'risk_score': r.risk_score, 'created_at': r.created_at.isoformat()} for r in reports]
