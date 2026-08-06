from fastapi import FastAPI
from .core.config import settings
from .db import session
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI ThreatGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.FRONTEND_ORIGINS.split(',') if origin.strip()] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await session.init_engine(settings.DATABASE_URL)

from .auth import routes as auth_routes
from .scanner import routes as scanner_routes
from .assistant import routes as assistant_routes
from .admin import routes as admin_routes

app.include_router(auth_routes.router)
app.include_router(scanner_routes.router)
app.include_router(assistant_routes.router)
app.include_router(admin_routes.router)

@app.get("/")
async def read_root():
    return {"message": "AI ThreatGuard — Backend Ready"}
