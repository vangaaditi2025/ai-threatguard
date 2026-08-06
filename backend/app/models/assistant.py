from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from .base import Base


class AssistantConversation(Base):
    __tablename__ = 'assistant_conversations'

    id = Column(Integer, primary_key=True, index=True)
    user_message = Column(String(4096), nullable=False)
    assistant_response = Column(String(8192), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
