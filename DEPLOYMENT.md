# Production Deployment Guide

## Overview

This document describes how to deploy AI ThreatGuard in production using Docker Compose and NGINX.

## Deploy Backend on Render

Use Render to deploy only the backend API (the frontend can stay on GitHub Pages).

1. Push this repository to GitHub (if not already).
2. In Render, create a new **Blueprint** service from the repository root. Render will detect `render.yaml`.
3. Set the required environment variables in Render:
   - `DATABASE_URL` (required): PostgreSQL connection string for the backend.
   - `FRONTEND_ORIGINS` (required): comma-separated allowed frontend origins (for example, your GitHub Pages URL).
4. Optional Gemini settings:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (defaults to `gemini-1.5-mini`)
   - `GEMINI_API_URL`

Notes:
- Backend entrypoint is `app.main:app` from `backend/app/main.py`.
- The backend container now reads Render's `PORT` variable automatically.
- Frontend deployment (`.github/workflows/deploy-pages.yml`) remains unchanged.

## Deploy Backend on Railway

Use Railway to deploy only the backend API (frontend can remain on GitHub Pages).

1. Create a new Railway project from this repository.
2. Railway will read `railway.json` and build using `backend/Dockerfile`.
3. Add environment variables in Railway:
   - `DATABASE_URL` (required): PostgreSQL connection string.
   - `FRONTEND_ORIGINS` (required): comma-separated frontend origins (for example, your GitHub Pages URL).
4. Optional Gemini settings:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (defaults to `gemini-1.5-mini`)
   - `GEMINI_API_URL`

Notes:
- Backend entrypoint is `app.main:app` from `backend/app/main.py`.
- Railway provides `PORT`; backend Docker startup already uses `${PORT:-8000}`.
- Frontend deployment workflow remains unchanged.

## Prerequisites

- Docker Engine
- Docker Compose
- Git

## Configuration

1. Copy the example environment file and set production values:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.production frontend/.env.production
   ```

2. Update `backend/.env` with production connection settings.
3. If you are using Gemini API, set `GEMINI_API_KEY` and `GEMINI_API_URL`.

## Running in Production

Start the full stack:

```bash
docker compose up --build -d
```

The application will be available on port `80`.

## Services

- `db`: PostgreSQL database.
- `backend`: FastAPI backend service.
- `frontend`: React application build container.
- `proxy`: NGINX reverse proxy for frontend and backend routing.

## NGINX Routing

- `/api/*` requests are forwarded to the backend service.
- All other requests are served by the frontend service.

## Troubleshooting

- View logs for all services:

  ```bash
  docker compose logs -f
  ```

- Rebuild only the backend or frontend:

  ```bash
  docker compose build backend frontend
  ```

- Stop and remove containers:

  ```bash
  docker compose down
  ```

## Local Development

For local development with the earlier service layout, use:

```bash
docker compose -f docker-compose.dev.yml up --build
```

## Notes

- The production frontend build uses `frontend/.env.production` and `VITE_API_URL=/api` to route traffic through the proxy.
- Backend CORS is configured using `FRONTEND_ORIGINS`.
