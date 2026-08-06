import os
from dataclasses import dataclass

@dataclass
class Settings:
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/ai_threatguard')
    FRONTEND_ORIGINS: str = os.getenv('FRONTEND_ORIGINS', '*')
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL: str = os.getenv('GEMINI_MODEL', 'gemini-1.5-mini')
    GEMINI_API_URL: str = os.getenv('GEMINI_API_URL', '')

settings = Settings()
