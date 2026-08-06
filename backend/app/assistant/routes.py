import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_session
from ..models.assistant import AssistantConversation
from . import schemas, utils

router = APIRouter(prefix='/assistant', tags=['assistant'])


@router.post('/message-stream')
async def stream_assistant_message(payload: schemas.AssistantMessageRequest, db: AsyncSession = Depends(get_session)):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail='Message is required')

    history_result = await db.execute(select(AssistantConversation).order_by(AssistantConversation.created_at.desc()).limit(8))
    history_entries = history_result.scalars().all()
    history_entries.reverse()

    history = []
    for entry in history_entries:
        history.append({'role': 'user', 'content': entry.user_message})
        history.append({'role': 'assistant', 'content': entry.assistant_response})

    assistant_text = await asyncio.to_thread(utils.call_gemini, payload.message, history)
    assistant_text = assistant_text or utils.fallback_assistant_response(payload.message)

    new_record = AssistantConversation(
        user_message=payload.message,
        assistant_response=assistant_text,
    )
    db.add(new_record)
    await db.commit()

    def stream_chunks() -> str:
        for chunk in utils.chunk_text(assistant_text, size=64):
            yield chunk

    return StreamingResponse(stream_chunks(), media_type='text/plain')


@router.get('/history', response_model=list[schemas.AssistantHistoryItem])
async def get_assistant_history(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(AssistantConversation).order_by(AssistantConversation.created_at.desc()).limit(20))
    history_entries = result.scalars().all()
    return [
        {
            'id': entry.id,
            'user_message': entry.user_message,
            'assistant_response': entry.assistant_response,
            'created_at': entry.created_at.isoformat(),
        }
        for entry in history_entries
    ]


@router.get('/prompts', response_model=list[schemas.SuggestedPrompt])
async def get_suggested_prompts():
    return utils.get_suggested_prompts()


@router.get('/knowledge-base', response_model=list[schemas.KnowledgeBaseEntry])
async def get_knowledge_base():
    return utils.get_knowledge_base()
