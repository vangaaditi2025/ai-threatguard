import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = None
AsyncSessionLocal = None

async def init_engine(database_url: str):
    global engine, AsyncSessionLocal
    if engine is None:
        # Convert sync psycopg2 URL to asyncpg-compatible if needed
        if database_url.startswith('postgresql+psycopg2'):
            async_url = database_url.replace('postgresql+psycopg2', 'postgresql+asyncpg')
        else:
            async_url = database_url
        engine = create_async_engine(async_url, future=True)
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    if AsyncSessionLocal is None:
        raise RuntimeError('Engine not initialized')
    async with AsyncSessionLocal() as session:
        yield session
