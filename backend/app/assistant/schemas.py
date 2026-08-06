from pydantic import BaseModel


class AssistantMessageRequest(BaseModel):
    message: str


class AssistantHistoryItem(BaseModel):
    id: int
    user_message: str
    assistant_response: str
    created_at: str


class SuggestedPrompt(BaseModel):
    text: str


class KnowledgeBaseEntry(BaseModel):
    title: str
    summary: str
    source_url: str | None = None
