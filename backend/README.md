# SkillProof backend

Express 5 REST API with MongoDB persistence, Cloudinary PDF storage, deterministic parsing/scoring, GitHub REST integration, and a MongoDB-backed in-process analysis worker.

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Fill Atlas and Cloudinary credentials and optionally GITHUB_TOKEN.
npm.cmd run dev
```

Run inside `backend`. Production: `npm.cmd start`. The server listens on `0.0.0.0:PORT` only after MongoDB connects. Required environment names are validated on startup without logging their values. `/api/health` is the readiness endpoint.

The frontend should call this service directly using the allowed origin and `/api` base. Uploads are memory-backed and bounded; Cloudinary is the permanent media store. Long repository analysis is processed after HTTP 202 creation. No separate worker process, Redis, local upload folder, or test infrastructure is needed for this MVP.

Documentation:

- [API reference](docs/api/README.md)
- [Architecture](docs/architecture.md)
- [Database models](docs/database.md)
- [Environment](docs/environment.md)
- [GitHub integration](docs/github-integration.md)
- [Cloudinary](docs/cloudinary.md)
- [Business logic](docs/business-logic.md)
- [Render deployment](docs/deployment.md)
