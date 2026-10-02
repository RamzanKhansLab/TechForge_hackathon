# Candidate analysis API

Base protocol, limits, shared errors, and access rules: [API reference](README.md). Examples use an illustrative ObjectId; replace it and the key with values returned from creation.

## POST `/api/analysis`

**Purpose:** store a permitted resume, extract structured information, and queue a public GitHub skill report. It avoids keeping the upload request open for the full repository inspection.

- Authentication: none to create; random report key returned once.
- Request Content-Type: `multipart/form-data`; response: `application/json`.
- Path/query parameters: none.
- Request fields: `resume` (one required PDF binary), `githubUsername` (required string).
- Validation: username 1–39 GitHub-style alphanumeric/hyphen characters, starting/ending alphanumeric; PDF MIME and extension; `%PDF-` signature; default 5 MiB upload bound; at most 15 parsed pages; at least 40 non-whitespace extracted characters. Missing file → `RESUME_REQUIRED`. Do not submit a GitHub URL instead of a username.
- Business logic/services: `analysis.service.createAnalysis` → Cloudinary upload → PDF parse/skill extraction → key generation/hash → queued `Analysis.create`. Normal failures after upload trigger best-effort media rollback.
- External APIs: Cloudinary signed authenticated raw upload, optional rollback deletion. GitHub calls occur later in the worker.
- Database effects: creates one `analyses` record with candidate, structured resume, asset metadata, warnings, status queued, stage queued, progress 0.
- Success: **202 Accepted**; `{ analysisId: String, status: "queued", accessToken: String }`.
- Errors: 400 invalid input/file, 413 upload size, 422 unreadable/encrypted/scanned/too-many-page PDF, 429 route/IP limit, 502 Cloudinary storage, 500 database/internal. Username existence errors are asynchronous, not a synchronous creation 404.

```bash
curl -X POST http://localhost:8000/api/analysis \
  -F "resume=@resume.pdf;type=application/pdf" \
  -F "githubUsername=octocat"
```

```json
{ "success": true, "data": { "analysisId": "507f1f77bcf86cd799439011", "status": "queued", "accessToken": "64_LOWERCASE_HEX_CHARACTERS_RETURNED_ONCE" } }
```

Store the real key before navigating. Keep upload requests open until 202; an upload byte-progress event of 100% does not mean storage/parsing is finished. The frontend consent checkbox records the user's acknowledgement in the interaction; it is not a persisted legal-consent record.

## GET `/api/analysis/:id`

**Purpose:** poll real progress or retrieve the completed/failed candidate snapshot.

- Authentication: that analysis's `X-Access-Token` required.
- Request Content-Type: none; response: `application/json`.
- Path: `id` required, 24-character hex ObjectId. Query/body: none.
- Validation: ID format, report existence, constant-time key check.
- Business logic/services: `analysis.service.getAnalysis`, authorization, `publicDocument` serializer.
- External API calls: none; reads never restart the pipeline.
- Database effects: read one `analyses` document, no writes.
- Success: **200** for queued, processing, completed, or failed records. Full response shape is the [Analysis model](../database.md); internal access/lease/media delivery fields are excluded.
- Errors: 400 bad ID, 403 invalid/missing key, 404 report absent, 429 rate limit, 500 database/internal.

```bash
curl http://localhost:8000/api/analysis/507f1f77bcf86cd799439011 \
  -H "X-Access-Token: ANALYSIS_KEY"
```

Processing response excerpt:

```json
{ "success": true, "data": { "_id": "507f1f77bcf86cd799439011", "githubUsername": "octocat", "status": "processing", "stage": "repositories", "progress": 40, "resume": { "filename": "resume.pdf", "pages": 2, "skills": ["react"], "asset": { "format": "pdf", "bytes": 12345 } }, "skills": [], "repositories": [], "warnings": [] } }
```

Completed responses add skill/evidence/repository arrays, `summary`, `scoringVersion`, `completedAt`, and progress 100. Failed records expose a safe `{code,message}` in `data.error`; HTTP remains 200 because the stored record was successfully read. Stop polling after completed/failed. The frontend polls every 2.5 seconds.

## POST `/api/analysis/:id/retry`

**Purpose:** requeue a failed report without uploading its resume again.

- Authentication: analysis key required.
- Request Content-Type: `application/json` for `{}`; response: `application/json`.
- Path: `id` as above. Query parameters: none. Body: no fields required/used.
- Validation: valid ID/key; status must currently be failed. An atomic status condition prevents two simultaneous retries from both succeeding.
- Business logic/services: `retryAnalysis`; set queued, stage queued, progress 0, attempts 0; clear error/lease.
- External APIs: none in the request; later worker recollects GitHub evidence and may use cached public responses.
- Database effects: updates the existing `analyses` record; original resume/Cloudinary asset retained. No new key is generated.
- Success: **202** with the sanitized updated analysis snapshot.
- Errors: 400/403/404/429/500 shared; 409 `ANALYSIS_NOT_FAILED` or `ALREADY_RETRIED`.

```bash
curl -X POST http://localhost:8000/api/analysis/507f1f77bcf86cd799439011/retry \
  -H "X-Access-Token: ANALYSIS_KEY" -H "Content-Type: application/json" -d '{}'
```

Response excerpt:

```json
{ "success": true, "data": { "_id": "507f1f77bcf86cd799439011", "status": "queued", "stage": "queued", "progress": 0, "attempts": 0 } }
```

## DELETE `/api/analysis/:id`

**Purpose:** remove a candidate's private PDF, extracted data, evidence report, and related job analyses.

- Authentication: analysis key required.
- Request Content-Type: none; response: `application/json`.
- Path: `id` as above. Query/body: none.
- Validation: valid ID/key; queued/processing reports are not deletable.
- Business logic/services: `removeAnalysis` authorizes, destroys the Cloudinary asset, deletes linked jobs, then deletes the analysis.
- External APIs: Cloudinary `destroy` with raw/authenticated delivery and invalidation.
- Database effects: delete linked `jobanalyses` by `analysisId`, delete the `analyses` record.
- Success: **200**, `data: { deleted: true }`.
- Errors: 400/403/404/429/500 shared; 409 `ANALYSIS_BUSY`; 502 `STORAGE_DELETE_FAILED` if cloud deletion fails, leaving the database record for retry.
- Cross-provider effects are not a transaction; see [limitations](../../../docs/limitations.md). Repeating deletion after full success returns 404.

```bash
curl -X DELETE http://localhost:8000/api/analysis/507f1f77bcf86cd799439011 \
  -H "X-Access-Token: ANALYSIS_KEY"
```

```json
{ "success": true, "data": { "deleted": true } }
```
