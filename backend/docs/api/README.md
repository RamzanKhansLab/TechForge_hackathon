# REST API reference

Base URL: `http://localhost:8000/api` locally; use the Render HTTPS origin plus `/api` in deployment. All examples are illustrative contracts, not seeded data or actual analysis results.

## Common protocol

- JSON success: `{ "success": true, "data": ... }`.
- JSON error: `{ "success": false, "error": { "code": "...", "message": "...", "requestId": "..." } }`.
- Request IDs are also returned in `X-Request-Id`. Early rate-limit responses have the same error envelope but may omit `requestId` in the body.
- Protected routes use `X-Access-Token: REPORT_KEY`. New keys are 64 lowercase hexadecimal characters (32 cryptographically random bytes); store the key returned on creation.
- A candidate-linked job requires the candidate key **during creation**, then its own independently returned job key for reads/updates.
- Protected ObjectId path fields must be 24 hex characters. Keys are never accepted through query parameters. No listed endpoint uses query parameters.
- JSON body limit: 64 KiB. Multipart uploads: one PDF field named `resume`; configured default 5 MiB; at most 15 parsed PDF pages. No binary download endpoint is exposed.
- General per-IP limit: 120 requests/minute. Analysis creation/retry share a 10/hour limit. Job creation has an additional 30/15-minute limit. Limits are per backend process. Responses include standardized rate-limit headers.
- Exact configured CORS origins only. Same-origin/non-browser requests still require keys on protected routes. No account login or cookies are used.
- Responses are marked `Cache-Control: no-store`. Binary Cloudinary identifiers/URLs, access hashes, worker owner/lease, and Mongoose version keys are stripped from report responses.

## Routes

| Method | Route | Reference |
|---|---|---|
| GET | `/health` | [Health and metadata](health.md) |
| GET | `/meta` | [Health and metadata](health.md) |
| POST | `/analysis` | [Analysis](analysis.md) |
| GET | `/analysis/:id` | [Analysis](analysis.md) |
| POST | `/analysis/:id/retry` | [Analysis](analysis.md) |
| DELETE | `/analysis/:id` | [Analysis](analysis.md) |
| GET | `/analysis/:id/skills` | [Skills](skills.md) |
| GET | `/analysis/:id/skills/:skill` | [Skills](skills.md) |
| GET | `/analysis/:id/repositories` | [Repository evidence](github.md) |
| POST | `/jobs/analyze` | [Jobs](jobs.md) |
| GET | `/jobs/:id` | [Jobs](jobs.md) |
| GET | `/jobs/:id/match` | [Jobs](jobs.md) |
| PATCH | `/jobs/:id/tasks/:skill` | [Jobs](jobs.md) |

## Shared errors

| Status | Typical code | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT`, `INVALID_JSON`, `INVALID_PDF`, `INVALID_FILE_TYPE` | Shape/ID/body/file validation failed |
| 403 | `ACCESS_DENIED`, `ORIGIN_NOT_ALLOWED` | Key missing/invalid or unapproved browser origin |
| 404 | `NOT_FOUND`, `SKILL_NOT_FOUND`, `TASK_NOT_FOUND`, `ROUTE_NOT_FOUND` | Report, subresource, or route unavailable |
| 409 | `ANALYSIS_BUSY`, `ANALYSIS_NOT_READY`, `ANALYSIS_NOT_FAILED`, `ALREADY_RETRIED` | Current state does not allow operation |
| 413 | `LIMIT_FILE_SIZE`, `BODY_TOO_LARGE` | Configured body/upload limit exceeded |
| 422 | `PDF_PARSE_FAILED`, `RESUME_TEXT_UNAVAILABLE`, `TOO_MANY_PAGES` | PDF cannot be used for text extraction |
| 429 | `RATE_LIMITED` | SkillProof route/IP quota exceeded |
| 500 | `INTERNAL_ERROR` | Safe generic internal/database failure |
| 502 | `STORAGE_UNAVAILABLE`, `STORAGE_DELETE_FAILED` | Cloudinary operation failed |
| 503 | `DATABASE_UNAVAILABLE` | Health endpoint sees database disconnected |

GitHub failures happen asynchronously after POST `/analysis`. Polling GET returns HTTP 200 for an authorized failed record with `data.status: failed` and `data.error`. Expected background codes include `GITHUB_USER_NOT_FOUND`, `GITHUB_RATE_LIMIT`, `GITHUB_AUTH_FAILED`, `GITHUB_UNAVAILABLE`, `WORKER_INTERRUPTED`, and `ANALYSIS_FAILED`. Do not treat HTTP 200 alone as successful completion.

## Response objects

The complete field/type reference is [database.md](../database.md). Analysis responses contain candidate/resume/GitHub metadata, repositories, skill results, counts, status/stage/progress, warnings, dates, attempts, and optional safe error. Job responses contain title/description, requirements, categories, candidate reference, matches, coverage, counts, tasks, warnings, and dates. Evidence always carries its skill, type, repository, file where applicable, description, URL, date, and direct/supporting strength.

No result implies identity verification, overall competence, a live deployment, executed tests, or hiring suitability.
