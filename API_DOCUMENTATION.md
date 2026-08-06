# AI ThreatGuard API Documentation

## Authentication

- `POST /auth/register`
  - Register a new user.
  - Body: `{ "email": "user@example.com", "password": "secure-password" }`

- `POST /auth/login`
  - Authenticate and receive a JWT access token.
  - Body: `{ "email": "user@example.com", "password": "secure-password" }`

- `POST /auth/forgot-password`
  - Request password reset instructions.
  - Body: `{ "email": "user@example.com" }`

- `POST /auth/verify-email`
  - Verify a user email address.
  - Body: `{ "token": "verification-token" }`

- `POST /auth/refresh`
  - Refresh the JWT access token using a refresh token.
  - Body: `{ "refresh_token": "refresh-token" }`

## AI Assistant

- `GET /assistant/history`
  - Retrieve recent assistant conversations.

- `GET /assistant/prompts`
  - Retrieve suggested prompts for the assistant.

- `GET /assistant/knowledge-base`
  - Retrieve knowledge base entries for cybersecurity guidance.

- `POST /assistant/message-stream`
  - Send a prompt to the assistant and receive a streaming response.
  - Body: `{ "message": "Your question or prompt" }`

## Threat Scanners

- `POST /scanner/scan`
  - Upload a file for threat analysis.
  - Form field: `file`

- `GET /scanner/report/{report_id}/download`
  - Download a generated file scan report.

- `POST /scanner/url-scan`
  - Analyze a URL for phishing, SSL, redirects, and reputation.
  - Body: `{ "url": "https://example.com" }`

- `GET /scanner/url-history`
  - Retrieve saved URL scan history.

- `GET /scanner/url-report/{report_id}/download`
  - Download a URL scan report.

- `POST /scanner/email-scan`
  - Scan raw email text or uploaded `.eml` files for phishing.
  - Form field: `email_text` or `file`

- `GET /scanner/email-history`
  - Retrieve saved email scan history.

- `GET /scanner/email-report/{report_id}/download`
  - Download an email scan report.

## Admin Endpoints

Admin endpoints require a valid `Authorization: Bearer <token>` header.

- `GET /admin/users`
  - Retrieve all users.

- `GET /admin/roles`
  - Retrieve available roles.

- `GET /admin/permissions`
  - Retrieve available permissions.

- `GET /admin/threat-analytics`
  - Retrieve analytics summaries for scans and users.

- `GET /admin/audit-logs`
  - Retrieve audit log entries.

- `GET /admin/activity-logs`
  - Retrieve activity log entries.

- `POST /admin/users/{user_id}/roles`
  - Update roles for a user.
  - Body: `{ "roles": ["role1", "role2"] }`

- `POST /admin/users/{user_id}/activation`
  - Activate or deactivate a user.
  - Body: `{ "is_active": true }`
