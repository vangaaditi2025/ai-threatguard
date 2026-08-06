import json
import os
from typing import Any, Dict, List
import requests

from ..core.config import settings


def _extract_text_from_response_block(block: Any) -> str:
    if isinstance(block, str):
        return block
    if isinstance(block, dict):
        if 'text' in block and isinstance(block['text'], str):
            return block['text']
        if 'content' in block:
            return ''.join(_extract_text_from_response_block(item) for item in block['content'])
    if isinstance(block, list):
        return ''.join(_extract_text_from_response_block(item) for item in block)
    return ''


def build_prompt_messages(user_message: str, history: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    messages: List[Dict[str, Any]] = [
        {
            'author': 'system',
            'content': [
                {
                    'type': 'text',
                    'text': 'You are an AI cybersecurity assistant. Provide concise, actionable security guidance and explanations in markdown format.',
                }
            ],
        }
    ]
    for item in history:
        role = item.get('role')
        content = item.get('content', '')
        if role and content:
            messages.append({'author': role, 'content': [{'type': 'text', 'text': content}]})
    messages.append({'author': 'user', 'content': [{'type': 'text', 'text': user_message}]})
    return messages


def call_gemini(user_message: str, history: List[Dict[str, str]]) -> str:
    if not settings.GEMINI_API_KEY:
        return fallback_assistant_response(user_message)

    model = settings.GEMINI_MODEL or 'gemini-1.5-mini'
    api_url = settings.GEMINI_API_URL
    if not api_url:
        api_url = f'https://generativelanguage.googleapis.com/v1beta2/models/{model}:generateMessage'

    payload = {
        'prompt': {
            'messages': build_prompt_messages(user_message, history),
        },
        'temperature': 0.2,
        'maxOutputTokens': 450,
        'candidateCount': 1,
    }

    headers = {
        'Authorization': f'Bearer {settings.GEMINI_API_KEY}',
        'Content-Type': 'application/json',
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            return fallback_assistant_response(user_message)

        text = ''
        if 'candidates' in data:
            candidates = data.get('candidates') or []
            for candidate in candidates:
                text += _extract_text_from_response_block(candidate.get('content', []))
        elif 'output' in data:
            text += _extract_text_from_response_block(data.get('output', []))
        elif 'response' in data:
            text += _extract_text_from_response_block(data.get('response', []))

        return text.strip() or fallback_assistant_response(user_message)
    except Exception:
        return fallback_assistant_response(user_message)


def chunk_text(text: str, size: int = 80) -> List[str]:
    return [text[i:i + size] for i in range(0, len(text), size)]


def fallback_assistant_response(user_message: str) -> str:
    normalized = user_message.lower()
    if 'phishing' in normalized or 'email' in normalized:
        return (
            '### AI Cybersecurity Assistant\n'
            'The email or phishing incident should be reviewed for domain impersonation, suspicious links, and authentication failure. ' 
            'Check whether the sender domain matches the declared sender and inspect the email headers for SPF/DKIM results. '
            '\n\n- Look for urgent wording and requests to verify credentials. '
            '\n- Confirm links against the expected sender domain before clicking. '
            '\n- Treat unknown attachments as malicious until verified.'
        )
    if 'password' in normalized or 'reset' in normalized:
        return (
            '### AI Cybersecurity Assistant\n'
            'Password reset requests should always be verified through the official application or provider website. ' 
            'If the message is unsolicited, do not follow embedded links or provide credentials. '
            '\n\n- Use MFA wherever available. '
            '\n- Validate the sender email and the destination domain before acting.'
        )
    return (
        '### AI Cybersecurity Assistant\n'
        'I can help you investigate cybersecurity events, analyze suspicious content, and provide practical guidance. ' 
        'Ask about phishing indicators, threat triage, incident response steps, or security controls. '
        '\n\nSuggested prompts are available on the right to help you get started.'
    )


def get_suggested_prompts() -> List[Dict[str, str]]:
    return [
        {'text': 'What are the most important signs of a phishing email?'},
        {'text': 'How can I investigate a suspicious network connection?'},
        {'text': 'Explain how to validate a website certificate and domain reputation.'},
        {'text': 'Summarize best practices for incident response.'},
    ]


def get_knowledge_base() -> List[Dict[str, str]]:
    return [
        {
            'title': 'Phishing Detection',
            'summary': 'Phishing often uses mismatched sender domains, urgency, unexpected attachments, and login prompts that do not match the real service.',
            'source_url': 'https://en.wikipedia.org/wiki/Phishing',
        },
        {
            'title': 'Secure Authentication',
            'summary': 'Use multi-factor authentication, strong password policies, and token-based access to reduce account takeover risk.',
            'source_url': 'https://www.cisa.gov',
        },
        {
            'title': 'Threat Intelligence',
            'summary': 'A security knowledge base should include indicators of compromise, attacker tactics, and known malicious infrastructure.',
            'source_url': 'https://www.mitre.org',
        },
        {
            'title': 'Security Posture',
            'summary': 'Maintain asset inventories, enforce least privilege, and continuously monitor logs for anomalous access patterns.',
            'source_url': 'https://www.nist.gov',
        },
    ]
