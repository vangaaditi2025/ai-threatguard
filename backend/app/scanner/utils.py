import hashlib
import mimetypes
import zipfile
import struct
import xml.etree.ElementTree as ET
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, Optional
from urllib.parse import urlparse
import socket
import ssl
import ipaddress
import re

from email import policy
from email.parser import BytesParser
from PIL import Image
from PyPDF2 import PdfReader
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
import os

requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'}


def compute_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def _normalize_ext(filename: str) -> str:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return f'.{ext}' if ext else ''


def _guess_type(filename: str, content_type: str) -> str:
    ext = _normalize_ext(filename)
    if ext:
        return ext
    if content_type:
        guessed = mimetypes.guess_extension(content_type)
        return guessed or 'unknown'
    return 'unknown'


def extract_pdf_metadata(file_bytes: bytes) -> Dict[str, Any]:
    reader = PdfReader(BytesIO(file_bytes))
    metadata = {k[1:]: v for k, v in (reader.metadata or {}).items() if k}
    return {
        'pages': len(reader.pages),
        'metadata': metadata,
    }


def extract_docx_metadata(file_bytes: bytes) -> Dict[str, Any]:
    result: Dict[str, Any] = {'contains_macro': False, 'core_properties': {}, 'entry_count': 0}
    with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
        result['entry_count'] = len(zf.namelist())
        result['contains_macro'] = any(name.lower().endswith('vbaproject.bin') for name in zf.namelist())
        if 'docProps/core.xml' in zf.namelist():
            raw = zf.read('docProps/core.xml')
            try:
                root = ET.fromstring(raw)
                namespaces = {'cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
                              'dc': 'http://purl.org/dc/elements/1.1/'}
                for child in root:
                    key = child.tag.split('}')[-1]
                    result['core_properties'][key] = child.text
            except ET.ParseError:
                result['core_properties'] = {}
    return result


def extract_zip_metadata(file_bytes: bytes) -> Dict[str, Any]:
    result: Dict[str, Any] = {'entry_count': 0, 'contains_executable': False, 'entries': []}
    with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
        result['entry_count'] = len(zf.infolist())
        for entry in zf.infolist():
            name_lower = entry.filename.lower()
            result['entries'].append({'name': entry.filename, 'size': entry.file_size})
            if name_lower.endswith(('.exe', '.dll', '.js', '.vbs', '.bat', '.scr', '.ps1')):
                result['contains_executable'] = True
    return result


def extract_exe_metadata(file_bytes: bytes) -> Dict[str, Any]:
    if len(file_bytes) < 64 or file_bytes[0:2] != b'MZ':
        return {'is_pe': False}
    try:
        pe_offset = struct.unpack_from('<I', file_bytes, 0x3C)[0]
        machine = struct.unpack_from('<H', file_bytes, pe_offset + 4)[0]
        subsystem = struct.unpack_from('<H', file_bytes, pe_offset + 0x5C)[0]
        return {
            'is_pe': True,
            'machine': machine,
            'subsystem': subsystem,
        }
    except Exception:
        return {'is_pe': False}


def extract_image_metadata(file_bytes: bytes) -> Dict[str, Any]:
    image = Image.open(BytesIO(file_bytes))
    return {
        'format': image.format,
        'mode': image.mode,
        'size': image.size,
    }


def parse_email(raw_email: str) -> Any:
    parser = BytesParser(policy=policy.default)
    return parser.parsebytes(raw_email.encode('utf-8', errors='replace'))


def get_email_header_value(message: Any, name: str) -> str:
    value = message.get(name, '')
    if isinstance(value, str):
        return value.strip()
    return str(value)


def extract_email_body(message: Any) -> str:
    if message.is_multipart():
        parts = []
        for part in message.walk():
            if part.get_content_type() == 'text/plain':
                try:
                    parts.append(part.get_content().strip())
                except Exception:
                    continue
        return '\n\n'.join(p for p in parts if p)
    try:
        return message.get_content().strip()
    except Exception:
        return ''


def parse_message_ids(header_value: str) -> list[str]:
    return [token.strip() for token in re.split(r'[\s,]+', header_value) if token.strip()]


def extract_links_from_text(text: str) -> list[str]:
    urls = re.findall(r'https?://[\w\-./?%&=#:@+]+', text)
    urls += re.findall(r'www\.[\w\-./?%&=#:@+]+', text)
    return sorted(set(urls))


def extract_suspicious_links(text: str, from_domain: str) -> Dict[str, Any]:
    links = extract_links_from_text(text or '')
    suspicious = []
    for link in links:
        try:
            parsed = urlparse(link if link.startswith('http') else f'https://{link}')
            hostname = (parsed.hostname or '').lower()
            if hostname and from_domain and hostname != from_domain:
                suspicious.append({'url': link, 'reason': 'Link points to a different domain than sender'})
            if hostname and (hostname.startswith('xn--') or hostname.count('-') >= 2 or len(hostname) > 30):
                suspicious.append({'url': link, 'reason': 'Suspicious domain format or length'})
            if parsed.path and len(parsed.path) > 60:
                suspicious.append({'url': link, 'reason': 'Very long path may indicate obfuscation'})
            if hostname and re.match(r'^\d+\.\d+\.\d+\.\d+$', hostname):
                suspicious.append({'url': link, 'reason': 'Link uses raw IP address'});
        except Exception:
            continue
    return {'links': links, 'suspicious_links': suspicious}


def check_spf_domain(domain: str) -> Dict[str, Any]:
    if not domain:
        return {'domain': domain, 'record': None, 'status': 'unknown', 'reason': 'No domain available for SPF check'}
    try:
        import dns.resolver
        answers = dns.resolver.resolve(domain, 'TXT', lifetime=5)
        records = [str(r.strings[0], 'utf-8') if r.strings else '' for r in answers]
    except Exception as exc:
        return {'domain': domain, 'record': None, 'status': 'error', 'reason': str(exc)}
    spf_records = [r for r in records if r.lower().startswith('v=spf1')]
    if not spf_records:
        return {'domain': domain, 'record': None, 'status': 'missing', 'reason': 'No SPF record found'}
    return {'domain': domain, 'record': spf_records[0], 'status': 'found', 'reason': 'SPF record discovered'}


def parse_dkim_signature(message: Any) -> Dict[str, Any]:
    dkim_header = message.get('DKIM-Signature', '')
    if not dkim_header:
        return {'present': False, 'domain': None, 'selector': None, 'reason': 'No DKIM-Signature header present'}
    domain_match = re.search(r'\bd=([^;\s]+)', dkim_header)
    selector_match = re.search(r'\bs=([^;\s]+)', dkim_header)
    domain = domain_match.group(1) if domain_match else None
    selector = selector_match.group(1) if selector_match else None
    return {'present': True, 'domain': domain, 'selector': selector, 'reason': 'DKIM-Signature header present'}


def analyze_grammar(text: str) -> Dict[str, Any]:
    issues = []
    if not text:
        return {'issues': [], 'score': 0}
    sentences = re.split(r'[.!?]+', text)
    uppercase_ratio = sum(1 for c in text if c.isupper()) / max(1, sum(1 for c in text if c.isalpha()))
    exclamation_count = text.count('!')
    dollar_count = text.count('$')
    urgent_terms = ['urgent', 'immediately', 'important', 'asap', 'attention', 'verify', 'confirm', 'password']
    found_terms = [term for term in urgent_terms if term in text.lower()]
    if uppercase_ratio > 0.25:
        issues.append('High uppercase ratio suggests aggressive or spammy formatting')
    if exclamation_count > 3:
        issues.append('Excessive exclamation usage')
    if dollar_count > 1:
        issues.append('Multiple currency symbols detected')
    if found_terms:
        issues.append(f'Urgent language detected: {", ".join(found_terms)}')
    return {'issues': issues, 'score': min(100, len(issues) * 25 + len(found_terms) * 5)}


def analyze_email(raw_email: str) -> Dict[str, Any]:
    message = parse_email(raw_email)
    subject = get_email_header_value(message, 'Subject')
    from_address = get_email_header_value(message, 'From')
    to_address = get_email_header_value(message, 'To')
    return_path = get_email_header_value(message, 'Return-Path')
    message_id = get_email_header_value(message, 'Message-ID')
    received_spf = get_email_header_value(message, 'Received-SPF')
    authentication_results = get_email_header_value(message, 'Authentication-Results')
    dkim = parse_dkim_signature(message)
    body = extract_email_body(message)
    sender_domain = None
    if from_address:
        parsed_from = re.search(r'@([A-Za-z0-9.-]+)', from_address)
        sender_domain = parsed_from.group(1).lower() if parsed_from else None
    link_analysis = extract_suspicious_links(body, sender_domain or '')
    spf_check = check_spf_domain(sender_domain or '')
    grammar = analyze_grammar(body)
    headers = {k: get_email_header_value(message, k) for k in message.keys()}
    return {
        'subject': subject,
        'from': from_address,
        'to': to_address,
        'return_path': return_path,
        'message_id': message_id,
        'received_spf': received_spf,
        'authentication_results': authentication_results,
        'dkim': dkim,
        'sender_domain': sender_domain,
        'headers': headers,
        'body': body,
        'link_analysis': link_analysis,
        'spf_check': spf_check,
        'grammar': grammar,
    }


def ai_explanation_for_email(analysis: Dict[str, Any]) -> str:
    reasons = []
    if analysis['dkim']['present'] is False:
        reasons.append('No DKIM-Signature header was found, making sender authentication weaker.')
    elif analysis['dkim'].get('domain') and analysis['dkim'].get('domain') != analysis.get('sender_domain'):
        reasons.append('DKIM signing domain does not match the sender domain, which can indicate spoofing.')
    if analysis['spf_check']['status'] != 'found':
        reasons.append('SPF record is missing or unavailable for the sender domain.')
    if analysis['link_analysis']['suspicious_links']:
        reasons.append('Suspicious links were detected that may redirect to a different domain.')
    if analysis['grammar']['issues']:
        reasons.append('Grammar analysis found phrases and formatting commonly used in phishing emails.')
    if analysis['received_spf'] and 'fail' in analysis['received_spf'].lower():
        reasons.append('Received-SPF header indicates an SPF failure.')
    if not reasons:
        return 'The email appears to be reasonably well-formed, but manual review is still recommended if the sender is unexpected.'
    return ' '.join(reasons)


def classify_email_threat(analysis: Dict[str, Any]) -> Dict[str, Any]:
    score = 10
    reasons = []
    if analysis['dkim']['present'] is False:
        score += 20
        reasons.append('Missing DKIM signature')
    elif analysis['dkim'].get('domain') and analysis['dkim'].get('domain') != analysis.get('sender_domain'):
        score += 20
        reasons.append('DKIM signing domain mismatch')
    if analysis['spf_check']['status'] != 'found':
        score += 20
        reasons.append('No SPF record for sender domain')
    if analysis['received_spf'] and 'fail' in analysis['received_spf'].lower():
        score += 30
        reasons.append('SPF check failed in headers')
    if analysis['link_analysis']['suspicious_links']:
        score += 25
        reasons.append('Suspicious links present')
    if analysis['grammar']['score'] >= 50:
        score += 15
        reasons.append('Suspicious grammar and tone detected')
    score = min(100, score)
    if score >= 75:
        classification = 'malicious'
    elif score >= 45:
        classification = 'suspicious'
    else:
        classification = 'benign'
    ai_explanation = ai_explanation_for_email(analysis)
    return {'classification': classification, 'risk_score': score, 'reasons': reasons, 'ai_explanation': ai_explanation}


def analyze_url(url: str) -> Dict[str, Any]:
    candidate = (url or '').strip()
    if not candidate:
        raise ValueError('URL is required')
    if not candidate.startswith(('http://', 'https://')):
        candidate = f'https://{candidate}'
    parsed = urlparse(candidate)
    if not parsed.netloc:
        raise ValueError('Invalid URL')
    return candidate


def extract_title(html_text: str) -> Optional[str]:
    match = re.search(r'<title>([^<]+)</title>', html_text, re.IGNORECASE)
    return match.group(1).strip() if match else None


def get_ssl_inspection(normalized_url: str) -> Dict[str, Any]:
    parsed = urlparse(normalized_url)
    if parsed.scheme != 'https':
        return {'applicable': False, 'reason': 'Non-HTTPS URL', 'valid': False}

    hostname = parsed.hostname
    port = parsed.port or 443
    result: Dict[str, Any] = {
        'applicable': True,
        'valid': False,
        'hostname': hostname,
        'port': port,
        'issuer': {},
        'subject': {},
        'subject_alt_names': [],
        'not_before': None,
        'not_after': None,
    }

    if not hostname:
        result['error'] = 'Missing hostname for SSL inspection'
        return result

    def _extract_certs(cert: Dict[str, Any]) -> Dict[str, Any]:
        subject = {item[0][0]: item[0][1] for item in cert.get('subject', []) if item}
        issuer = {item[0][0]: item[0][1] for item in cert.get('issuer', []) if item}
        san = [value for key, value in cert.get('subjectAltName', []) if key == 'DNS']
        return {
            'subject': subject,
            'issuer': issuer,
            'subject_alt_names': san,
            'not_before': cert.get('notBefore'),
            'not_after': cert.get('notAfter'),
        }

    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssl_sock:
                cert = ssl_sock.getpeercert()
        result.update(_extract_certs(cert))
        result['valid'] = True
        return result
    except Exception as primary_exc:
        result['error'] = str(primary_exc)
        try:
            unverified = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            unverified.check_hostname = False
            unverified.verify_mode = ssl.CERT_NONE
            with socket.create_connection((hostname, port), timeout=5) as sock:
                with unverified.wrap_socket(sock, server_hostname=hostname) as ssl_sock:
                    cert = ssl_sock.getpeercert()
            result.update(_extract_certs(cert))
        except Exception as fallback_exc:
            result['error'] = f'{primary_exc} | {fallback_exc}'
        return result


def fetch_url_details(normalized_url: str) -> Dict[str, Any]:
    try:
        response = requests.get(
            normalized_url,
            timeout=10,
            allow_redirects=True,
            verify=False,
            headers={
                'User-Agent': 'AI ThreatGuard URL Scanner/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        )
        history = [
            {'url': r.url, 'status_code': r.status_code}
            for r in response.history
        ]
        history.append({'url': response.url, 'status_code': response.status_code})
        page_text = ''
        try:
            page_text = response.text
        except Exception:
            page_text = ''
        return {
            'original_url': normalized_url,
            'final_url': response.url,
            'status_code': response.status_code,
            'content_type': response.headers.get('Content-Type'),
            'redirect_chain': history,
            'page_title': extract_title(page_text) if page_text else None,
            'body_snippet': page_text[:1200] if page_text else None,
            'response_headers': {
                'content_type': response.headers.get('Content-Type'),
                'content_length': response.headers.get('Content-Length'),
            },
            'html_snippet': page_text[:1000] if page_text else None,
        }
    except Exception as exc:
        return {
            'original_url': normalized_url,
            'error': str(exc),
            'status_code': None,
            'redirect_chain': [],
            'content_type': None,
            'page_title': None,
            'body_snippet': None,
            'response_headers': {},
        }


def analyze_domain_reputation(parsed_url: Any) -> Dict[str, Any]:
    domain = (parsed_url.hostname or '').lower()
    score = 80
    reasons = []
    suspicious_tlds = {
        '.zip', '.review', '.top', '.country', '.info', '.work', '.science', '.tk', '.ml', '.ga', '.cf', '.gq',
    }
    if not domain:
        return {'domain': domain, 'score': 20, 'verdict': 'poor', 'reasons': ['No domain found']}

    if domain.startswith('xn--'):
        score -= 25
        reasons.append('Punycode domain may indicate impersonation')

    if any(domain.endswith(tld) for tld in suspicious_tlds):
        score -= 25
        reasons.append('Domain uses a suspicious top-level domain')

    if domain.count('-') >= 2:
        score -= 10
        reasons.append('Domain contains multiple hyphens')

    if len(domain) > 25:
        score -= 10
        reasons.append('Domain is unusually long')

    try:
        if ipaddress.ip_address(domain):
            score = 25
            reasons.append('Numerical IP address used as host')
    except Exception:
        pass

    if score < 0:
        score = 0
    verdict = 'poor' if score < 40 else 'fair' if score < 65 else 'good'
    return {'domain': domain, 'score': score, 'verdict': verdict, 'reasons': reasons}


def detect_phishing(parsed_url: Any, html_body: Optional[str]) -> Dict[str, Any]:
    path_query = f'{parsed_url.path or ""} {parsed_url.query or ""} {parsed_url.netloc or ""}'.lower()
    suspicious_keywords = [
        'login', 'signin', 'secure', 'update', 'verify', 'account', 'password', 'confirm', 'bank', 'billing',
        'verification', 'appleid', 'paypal', 'amazon', 'reset', 'suspend', 'security', 'webscr', 'ebay', 'wallet',
    ]
    matches = [keyword for keyword in suspicious_keywords if keyword in path_query]
    score = min(100, len(matches) * 12)

    if parsed_url.netloc and parsed_url.netloc.lower().startswith('xn--'):
        score += 20
        matches.append('punycode')

    if 'login' in path_query or 'signin' in path_query:
        score = min(100, score + 10)

    if html_body:
        html_text = html_body.lower()
        if 'password' in html_text and 'login' in html_text:
            score = min(100, score + 10)
            matches.append('login form detected')

    if score >= 70:
        verdict = 'high'
    elif score >= 40:
        verdict = 'medium'
    else:
        verdict = 'low'

    return {'score': score, 'verdict': verdict, 'matches': sorted(set(matches))}


def analyze_suspicious_keywords(parsed_url: Any, html_body: Optional[str]) -> Dict[str, Any]:
    candidate = f'{parsed_url.geturl()} {parsed_url.netloc or ""} {parsed_url.path or ""} {parsed_url.query or ""}'.lower()
    suspicious_keywords = [
        'login', 'secure', 'account', 'verify', 'password', 'confirm', 'bank', 'billing', 'update', 'reset',
        'security', 'verify', 'account', 'signin', 'apple', 'paypal', 'amazon', 'microsoft', 'google', 'support',
        'wallet', 'webscr', 'authenticate', 'credentials', 'suspend', 'notification', 'urgent', 'alert', 'ssn',
    ]
    found = [keyword for keyword in suspicious_keywords if keyword in candidate]
    if html_body:
        found.extend([keyword for keyword in suspicious_keywords if keyword in (html_body or '').lower()])
    return {'matched_keywords': sorted(set(found))}


def ai_explanation_for_url(analysis: Dict[str, Any]) -> str:
    reasons = []
    ssl_info = analysis.get('ssl', {})
    if not ssl_info.get('applicable'):
        reasons.append('The URL does not use HTTPS, which increases risk for interception.')
    elif not ssl_info.get('valid'):
        reasons.append('The SSL certificate could not be validated. This is a strong signal of a suspicious site.')

    redirect_chain = analysis.get('redirect_chain', [])
    if len(redirect_chain) > 3:
        reasons.append('The URL follows a long redirect chain that can hide the final destination.')

    reputation = analysis.get('domain_reputation', {})
    if reputation.get('verdict') == 'poor':
        reasons.append('The domain reputation score is poor, indicating a potentially risky destination.')
    elif reputation.get('verdict') == 'fair':
        reasons.append('The domain has a fair reputation and may warrant closer inspection.')

    phishing = analysis.get('phishing', {})
    if phishing.get('score', 0) >= 50:
        reasons.append('Phishing heuristics show strong indicators of a malicious login or credential harvesting page.')
    elif phishing.get('score', 0) > 0:
        reasons.append('Phishing heuristics detected suspicious keywords and patterns.')

    keywords = analysis.get('suspicious_keywords', {}).get('matched_keywords', [])
    if keywords:
        reasons.append(f"Suspicious keywords present: {', '.join(keywords)}.")

    if analysis.get('status_code') and analysis.get('status_code') >= 400:
        reasons.append('The final HTTP response code is abnormal, which increases risk.')

    if not reasons:
        return 'The URL appears to be well-formed and shows no obvious threat indicators from the scanned heuristics.'

    return ' '.join(reasons)


def classify_url_threat(analysis: Dict[str, Any]) -> Dict[str, Any]:
    if analysis.get('error'):
        return {
            'classification': 'malicious',
            'risk_score': 92,
            'reasons': ['Failed to fetch or inspect the URL.'],
            'ai_explanation': 'The scanner could not verify the URL due to an error. Treat this result as high risk and investigate manually.',
        }

    score = 20
    reasons = []

    ssl_info = analysis.get('ssl', {})
    if not ssl_info.get('applicable'):
        score += 15
        reasons.append('URL is not secured with HTTPS')
    elif not ssl_info.get('valid'):
        score += 35
        reasons.append('SSL certificate validation failed')

    redirect_chain = analysis.get('redirect_chain', [])
    if len(redirect_chain) > 3:
        score += 15
        reasons.append('Redirect chain is overly long')
    elif len(redirect_chain) > 1:
        score += 5
        reasons.append('The URL redirects before reaching its final destination')

    domain_reputation = analysis.get('domain_reputation', {})
    score += max(0, 40 - domain_reputation.get('score', 80))
    if domain_reputation.get('verdict') == 'poor':
        reasons.append('Domain reputation score is poor')
    elif domain_reputation.get('verdict') == 'fair':
        reasons.append('Domain reputation is fair')

    phishing = analysis.get('phishing', {})
    phishing_score = phishing.get('score', 0)
    score += phishing_score
    if phishing_score >= 50:
        reasons.append('Phishing heuristics detected significant suspicious patterns')
    elif phishing_score > 0:
        reasons.append('Phishing heuristics detected some suspicious patterns')

    keywords = analysis.get('suspicious_keywords', {}).get('matched_keywords', [])
    if keywords:
        score += min(20, len(keywords) * 6)
        reasons.append(f"Suspicious keywords detected: {', '.join(keywords)}")

    status_code = analysis.get('status_code')
    if status_code and status_code >= 400:
        score += 10
        reasons.append(f'HTTP status code {status_code} indicates a problem')

    score = min(100, score)
    if score >= 75:
        classification = 'malicious'
    elif score >= 45:
        classification = 'suspicious'
    else:
        classification = 'benign'

    ai_explanation = ai_explanation_for_url(analysis)
    if classification == 'malicious' and 'malicious' not in ai_explanation.lower():
        ai_explanation += ' This URL should be treated as malicious unless verified otherwise.'

    return {
        'classification': classification,
        'risk_score': score,
        'reasons': reasons,
        'ai_explanation': ai_explanation,
    }


def build_email_report(analysis: Dict[str, Any], classification: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'subject': analysis.get('subject'),
        'from': analysis.get('from'),
        'to': analysis.get('to'),
        'sender_domain': analysis.get('sender_domain'),
        'return_path': analysis.get('return_path'),
        'message_id': analysis.get('message_id'),
        'received_spf': analysis.get('received_spf'),
        'authentication_results': analysis.get('authentication_results'),
        'dkim': analysis.get('dkim'),
        'spf_check': analysis.get('spf_check'),
        'link_analysis': analysis.get('link_analysis'),
        'grammar': analysis.get('grammar'),
        'headers': analysis.get('headers'),
        'body_preview': (analysis.get('body') or '')[:1200],
        'classification': classification['classification'],
        'risk_score': classification['risk_score'],
        'reasons': classification['reasons'],
        'ai_explanation': classification['ai_explanation'],
    }


def analyze_url(url: str) -> Dict[str, Any]:
    normalized = normalize_url(url)
    parsed = urlparse(normalized)
    details = fetch_url_details(normalized)
    ssl_insight = get_ssl_inspection(normalized)
    reputation = analyze_domain_reputation(parsed)
    phishing = detect_phishing(parsed, details.get('body_snippet'))
    keywords = analyze_suspicious_keywords(parsed, details.get('body_snippet'))

    return {
        'original_url': url,
        'normalized_url': normalized,
        'domain': reputation['domain'],
        'ssl': ssl_insight,
        'redirect_chain': details.get('redirect_chain', []),
        'final_url': details.get('final_url'),
        'status_code': details.get('status_code'),
        'content_type': details.get('content_type'),
        'page_title': details.get('page_title'),
        'response_headers': details.get('response_headers'),
        'body_snippet': details.get('body_snippet'),
        'domain_reputation': reputation,
        'phishing': phishing,
        'suspicious_keywords': keywords,
        'error': details.get('error'),
    }


def build_report(metadata: Dict[str, Any], classification: Dict[str, Any], vt_insights: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        'filename': metadata['filename'],
        'file_type': metadata['file_type'],
        'content_type': metadata['content_type'],
        'size_bytes': metadata['size_bytes'],
        'sha256': metadata['sha256'],
        'uploaded_at': metadata['uploaded_at'],
        'classification': classification['classification'],
        'risk_score': classification['risk_score'],
        'reasons': classification['reasons'],
        'metadata': metadata.get('file_content', {}),
        'virus_total': vt_insights,
    }


def classify_threat(metadata: Dict[str, Any], vt_insights: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    file_type = metadata.get('file_type', '').lower()
    size = metadata.get('size_bytes', 0)
    classification = 'benign'
    risk_score = 10
    reasons = []

    if file_type in ('.exe',):
        classification = 'malicious'
        risk_score = 92
        reasons.append('Executable files are high-risk')
    elif file_type == '.zip':
        if metadata.get('contains_executable'):
            classification = 'suspicious'
            risk_score = 78
            reasons.append('Archive contains executable or script artifacts')
        else:
            classification = 'suspicious'
            risk_score = 58
            reasons.append('Archive contents should be inspected')
    elif file_type == '.docx':
        if metadata.get('contains_macro'):
            classification = 'suspicious'
            risk_score = 82
            reasons.append('Document contains macro artifacts')
        else:
            classification = 'benign'
            risk_score = 35
    elif file_type == '.pdf':
        classification = 'benign'
        risk_score = 25
        reasons.append('PDF files are generally low-risk unless embedded content is present')
    elif file_type in IMAGE_EXTENSIONS:
        classification = 'benign'
        risk_score = 10
        reasons.append('Image file type is low-risk')
    else:
        classification = 'suspicious'
        risk_score = 48
        reasons.append('Unknown or unsupported file type')

    if size > 10_000_000:
        risk_score = min(risk_score + 8, 100)
        reasons.append('Large file size increases risk')

    if vt_insights and isinstance(vt_insights, dict):
        if vt_insights.get('malicious', 0) > 0:
            classification = 'malicious'
            risk_score = max(risk_score, 95)
            reasons.append('VirusTotal reported malicious detections')
        elif vt_insights.get('suspicious', 0) > 0:
            classification = 'suspicious'
            risk_score = max(risk_score, 70)
            reasons.append('VirusTotal reported suspicious detections')

    return {
        'classification': classification,
        'risk_score': risk_score,
        'reasons': reasons,
    }


def extract_metadata(file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    ext = _normalize_ext(filename) or _guess_type(filename, content_type)
    metadata: Dict[str, Any] = {
        'filename': filename,
        'content_type': content_type or 'application/octet-stream',
        'file_type': ext,
        'size_bytes': len(file_bytes),
        'sha256': compute_sha256(file_bytes),
        'uploaded_at': datetime.utcnow().isoformat() + 'Z',
    }
    try:
        if ext == '.pdf' or file_bytes.startswith(b'%PDF'):
            metadata['file_content'] = extract_pdf_metadata(file_bytes)
        elif ext == '.docx' or (file_bytes.startswith(b'PK') and 'word/' in zipfile.ZipFile(BytesIO(file_bytes)).namelist()):
            metadata['file_content'] = extract_docx_metadata(file_bytes)
            metadata['file_type'] = '.docx'
        elif ext == '.zip' or file_bytes.startswith(b'PK'):
            metadata['file_content'] = extract_zip_metadata(file_bytes)
            metadata['file_type'] = '.zip'
        elif ext == '.exe' or file_bytes.startswith(b'MZ'):
            metadata['file_content'] = extract_exe_metadata(file_bytes)
        elif ext in IMAGE_EXTENSIONS:
            metadata['file_content'] = extract_image_metadata(file_bytes)
        else:
            try:
                metadata['file_content'] = extract_image_metadata(file_bytes)
                metadata['file_type'] = metadata['file_content'].get('format', metadata['file_type'])
            except Exception:
                metadata['file_content'] = {'note': 'Unsupported file type for deep inspection'}
    except Exception as exc:
        metadata['file_content'] = {'error': str(exc)}
    return metadata


def build_report(metadata: Dict[str, Any], classification: Dict[str, Any], vt_insights: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        'filename': metadata['filename'],
        'file_type': metadata['file_type'],
        'content_type': metadata['content_type'],
        'size_bytes': metadata['size_bytes'],
        'sha256': metadata['sha256'],
        'uploaded_at': metadata['uploaded_at'],
        'classification': classification['classification'],
        'risk_score': classification['risk_score'],
        'reasons': classification['reasons'],
        'metadata': metadata.get('file_content', {}),
        'virus_total': vt_insights,
    }
