# ai-threatguard

AI-threatguard is an AI-powered cybersecurity analysis platform with threat scanning, phishing detection, AI assistance, and administration tools.

## Project Structure

- `backend/` — FastAPI backend service with SQLAlchemy, Alembic, authentication, scanning, assistant, and admin routes.
- `frontend/` — React application built with Vite, Tailwind-like styling, Framer Motion, and Recharts.
- `nginx/` — Production NGINX proxy configuration.
- `.github/workflows/` — CI/CD workflow for validating builds and Docker images.
- `docker-compose.yml` — Production Docker Compose stack.
- `docker-compose.dev.yml` — Local development Docker Compose stack.
- `API_DOCUMENTATION.md` — Backend API reference.
- `DEPLOYMENT.md` — Production deployment guide.

## Local Development

1. Copy example environment files:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Start PostgreSQL, backend, and frontend:

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

3. Open the frontend at `http://localhost:3000`.

## Production Deployment

Use the production stack:

```bash
docker compose up --build -d
```

Visit `http://localhost` after the services start.

## Environment Configuration

- Root `.env` and `backend/.env` provide backend variables like `DATABASE_URL`, `GEMINI_API_KEY`, and `FRONTEND_ORIGINS`.
- `frontend/.env.production` sets `VITE_API_URL=/api` for proxy-based API routing.

## CI/CD

A GitHub Actions workflow is configured at `.github/workflows/ci-cd.yml`.
It validates Python syntax, builds the frontend, and verifies Docker Compose.

## Documentation

- `API_DOCUMENTATION.md` — Backend API endpoints and request formats.
- `DEPLOYMENT.md` — Production deployment instructions.

## GitHub Pages deployment

The frontend can be deployed to GitHub Pages with the workflow in `.github/workflows/deploy-pages.yml`.

1. Push the repository to GitHub.
2. In the repository settings, enable GitHub Pages and choose the `GitHub Actions` source.
3. Add a repository variable named `VITE_API_URL` pointing to your deployed backend base URL (for example `https://api.example.com`).
4. Push to `main` or run the workflow manually.

After the workflow succeeds, the frontend will be available at:

```text
https://<your-github-username>.github.io/<your-repository>/
```

For this repository, that will typically be:

```text
https://vangaaditi2025.github.io/ai-threatguard/
```
