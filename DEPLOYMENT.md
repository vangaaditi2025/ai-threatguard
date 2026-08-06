# Production Deployment Guide

## Overview

This document describes how to deploy AI ThreatGuard in production using Docker Compose and NGINX.

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
