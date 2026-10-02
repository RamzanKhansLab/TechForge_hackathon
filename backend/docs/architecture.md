# Backend architecture

Request flow: router → validation/upload/access checks → thin controller → service → MongoDB or external provider → consistent response envelope.

`app.js` owns security middleware, CORS, request IDs/logging, limits, JSON handling, routing, and errors. `server.js` connects to MongoDB, starts HTTP and the worker, and handles shutdown. `config/env.js` validates required names and exact origins. Services never receive arbitrary database filters from request bodies.

| Layer | Responsibilities |
|---|---|
| `routes/index.js` | Route registration, per-route limits, health/meta handlers |
| `controllers/` | Parse input, call services, choose HTTP response code |
| `middlewares/` | Multer memory upload, input/ID validation, safe errors |
| `models/` | Analysis and job schemas, embedded evidence/task data, indexes |
| `services/resume/` | PDF extraction, dictionary extraction, structured resume parsing |
| `services/storage/` | Authenticated Cloudinary raw uploads and deletions |
| `services/github/` | API client/cache/errors, repository selection and inspection, evidence collection |
| `services/evidence/` | Deduplication, transparent scoring, classification |
| `services/analysis/` | Creation, access, retry, deletion, durable worker pipeline |
| `services/jobs/` | Required/preferred extraction, matching, task generation/progress |
| `data/` | Central aliases/dependency mappings and micro-task recipes |

## Durable analysis

After Cloudinary upload and resume parsing, MongoDB stores a queued record. A two-second poll atomically claims queued or expired work with a unique process owner and two-minute lease. A 30-second heartbeat extends the lease; writes require matching ownership. There is one active analysis per process. The profile is fetched, selected repositories are inspected sequentially, evidence is normalized/scored, and the final snapshot is saved. The UI reads stored stage and percentage.

MongoDB atomics support recovery without another managed service. There are up to three claims after process interruptions; ordinary provider failures immediately become a visible failed report. Users can retry a failed report, resetting attempts. Shutdown stops new claims, closes HTTP, and leaves interrupted leases for recovery.

## Security and errors

Random report keys are hashed with SHA-256 and compared using constant-time equality after format/length validation. Keys are selected from MongoDB only for authorization. API projections remove hashes, leases, and raw asset delivery references. CORS allows exact configured origins but is not relied on for authorization.

Helmet sets response headers; per-IP limits use Express's configured trust proxy. Bodies and uploads are bounded. Multipart MIME/extension and PDF signature are checked. Filename metadata is basename-limited. Untrusted repository content is parsed as data; it is never executed or evaluated. Requests to third-party URLs use a fixed GitHub API origin; README links are only collected.

Logs contain request IDs, route paths, statuses, timing, and selected error codes, never request bodies, resumes, tokens, provider error objects, or credential strings. Database exceptions become safe generic failures. See [API errors](api/README.md).
