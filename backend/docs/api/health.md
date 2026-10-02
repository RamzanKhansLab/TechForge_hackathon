# Health and public configuration

All responses use the [common envelope and errors](README.md). No query parameters are used.

## GET `/api/health`

**Purpose:** readiness check for Render and operators; reports whether Mongoose is connected. It does not probe GitHub or Cloudinary on every request.

- Authentication: none.
- Request Content-Type: none; response: `application/json`.
- Path parameters / query parameters / body: none.
- Validation: general origin and request-rate middleware only.
- Success: 200, `data: { status: "ok", service: "skillproof-api" }`.
- Errors: 503 `DATABASE_UNAVAILABLE`; common 403/429 middleware errors.
- Business logic/services: inspect `mongoose.connection.readyState === 1`.
- External API calls: none.
- Database effects: inspect connection state; no collection reads/writes.

```bash
curl http://localhost:8000/api/health
```

```json
{ "success": true, "data": { "status": "ok", "service": "skillproof-api" } }
```

Disconnected example:

```json
{ "success": false, "error": { "code": "DATABASE_UNAVAILABLE", "message": "Database connection is unavailable." } }
```

## GET `/api/meta`

**Purpose:** publish the actual upload/repository limits, skill labels/categories, and scoring rules so clients do not invent their own business configuration.

- Authentication: none.
- Request Content-Type: none; response: `application/json`.
- Path parameters / query parameters / body: none.
- Validation: general origin and rate middleware.
- Success: 200; object with `maxFileSizeMb`, `maxRepositories`, `skills: [{id,name,category}]`, and `scoring: {version,weights,thresholds,coverage}`.
- Errors: common 403/429; unexpected 500.
- Business logic/services: project public fields from `data/skills.js`, `config/scoring.js`, and validated environment limits.
- External APIs/database effects: none. No secret environment variables are returned.

```bash
curl http://localhost:8000/api/meta
```

Response excerpt (the actual `skills` array contains the full dictionary):

```json
{
  "success": true,
  "data": {
    "maxFileSizeMb": 5, "maxRepositories": 6,
    "skills": [{ "id": "react", "name": "React", "category": "Frontend" }],
    "scoring": {
      "version": "1.0",
      "weights": { "dependency": 30, "configuration": 30, "language": 30, "source": 25, "readme": 10, "multipleRepositories": 20, "commitActivity": 10, "recentActivity": 10, "testing": 10, "deployment": 10 },
      "thresholds": { "proven": 60, "partial": 15 },
      "coverage": { "Proven": 1, "Partial": 0.5, "Claimed-only": 0 }
    }
  }
}
```
