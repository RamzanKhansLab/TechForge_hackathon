# Job analysis and task API

Use the [shared protocol/errors](README.md). IDs and examples below are illustrative. Job report access keys are independent from candidate analysis keys.

## POST `/api/jobs/analyze`

**Purpose:** extract required/preferred technical skills from a description and, optionally, compare them to an authorized completed candidate analysis.

- Authentication: none for standalone extraction. If `analysisId` is supplied, send **that candidate's** `X-Access-Token`.
- Request/response Content-Type: `application/json`.
- Path/query parameters: none.
- Body: `jobDescription` required trimmed string, 40–20,000 chars; `title` optional trimmed string, max 120; `analysisId` optional 24-hex ObjectId string.
- Validation: Zod shape/lengths; candidate existence/access/completed state when selected. Unrecognized extra properties are discarded.
- Services/business logic: `jobs.service.analyzeJob` → `extractJobSkills` → optional `matchSkills` → central task catalog → new independent report key/hash.
- External APIs: none; uses stored candidate evidence.
- Database effects: optional `analyses` read; creates one `jobanalyses` document.
- Success: **201 Created**, full sanitized job document plus `accessToken` returned once.
- Errors: 400 input/JSON; 403 candidate key/origin; 404 candidate absent; 409 `ANALYSIS_NOT_READY`; 413 JSON body limit; 429 job/IP quota; 500 database/internal.

```bash
curl -X POST http://localhost:8000/api/jobs/analyze \
  -H "Content-Type: application/json" -H "X-Access-Token: ANALYSIS_KEY" \
  -d '{"title":"API Developer","jobDescription":"Required: Node.js and MongoDB for building our backend APIs.","analysisId":"507f1f77bcf86cd799439011"}'
```

For standalone extraction, omit both `analysisId` and the key header. Standalone response example:

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012", "analysisId": null,
    "title": "API Developer", "jobDescription": "Required: Node.js and MongoDB for building our backend APIs.",
    "requiredSkills": ["nodejs", "mongodb"], "preferredSkills": [],
    "categories": { "Backend": ["nodejs"], "Databases": ["mongodb"] },
    "coverage": null, "matches": [], "microTasks": [],
    "summary": { "verified": 0, "partial": 0, "gaps": 0, "required": 2 },
    "warnings": ["Skills are extracted by dictionary and section heuristics. Review the identified requirements."],
    "accessToken": "64_LOWERCASE_HEX_CHARACTERS_RETURNED_ONCE"
  }
}
```

Linked reports additionally contain each requirement's `{ skill, name, candidateStatus, score, state, evidence, reason }`, coverage, match counts, and tasks for Partial/Gap requirements. The full field reference is [JobAnalysis](../database.md). Zero required skills produces `coverage: null`, and preferred skills are excluded from coverage. No candidate produces empty matches/tasks instead of fabricated gaps.

## GET `/api/jobs/:id`

**Purpose:** reopen the saved extraction/match report and current personal task progress.

- Authentication: **job** `X-Access-Token`, not the candidate key.
- Request Content-Type: none; response: `application/json`.
- Path: `id`, 24-hex job ObjectId. Query/body: none.
- Validation: ID, record existence, job key.
- Services/business logic: `jobs.service.getJob` and sanitized serialization; no recalculation.
- External APIs: none. Database effects: read `jobanalyses`, no writes.
- Success: **200**, complete job document with original description, skill sets, matches, coverage, counts, tasks, warnings, dates, and optional candidate reference. Same shape as creation without the access token/hash.
- Errors: 400 invalid ID; 403 key/origin; 404 missing job; 429; 500.

```bash
curl http://localhost:8000/api/jobs/507f1f77bcf86cd799439012 \
  -H "X-Access-Token: JOB_KEY"
```

Response excerpt:

```json
{ "success": true, "data": { "_id": "507f1f77bcf86cd799439012", "analysisId": null, "title": "API Developer", "jobDescription": "Required: Node.js and MongoDB for building our backend APIs.", "requiredSkills": ["nodejs", "mongodb"], "preferredSkills": [], "coverage": null, "matches": [], "microTasks": [], "summary": { "required": 2, "verified": 0, "partial": 0, "gaps": 0 } } }
```

## GET `/api/jobs/:id/match`

**Purpose:** return only candidate coverage, requirement-level comparisons, and tasks without the original description/extraction payload.

- Authentication: job key.
- Request Content-Type: none; response: `application/json`.
- Path: `id`, 24-hex job ObjectId. Query/body: none.
- Validation: ID/existence/key; standalone jobs are allowed and return null coverage.
- Services/business logic: `getJob`; project `analysisId`, `coverage`, `summary`, `matches`, `microTasks`. No new matching or scoring.
- External APIs: none. Database effects: one `jobanalyses` read, no writes.
- Success: **200** with the projected object.
- Errors: 400/403/404/429/500 as above.

```bash
curl http://localhost:8000/api/jobs/507f1f77bcf86cd799439012/match \
  -H "X-Access-Token: JOB_KEY"
```

Illustrative one-gap result (task has been shortened only in description text):

```json
{
  "success": true,
  "data": {
    "analysisId": "507f1f77bcf86cd799439011", "coverage": 0,
    "summary": { "verified": 0, "partial": 0, "gaps": 1, "required": 1 },
    "matches": [{ "skill": "redis", "name": "Redis", "candidateStatus": "Missing", "score": 0, "state": "Gap", "evidence": [], "reason": "This skill was not found in the resume or direct repository evidence." }],
    "microTasks": [{ "skill": "redis", "title": "Cache a real API endpoint", "description": "Add Redis caching to a REST endpoint, handle expiration, and invalidate entries after updates.", "difficulty": "Intermediate", "estimatedTime": "2–3 hours", "expectedOutput": ["Redis connection configured through environment variables", "Cached endpoint and invalidation path", "Repeatable before/after timing notes", "README explaining cache behavior"], "status": "todo" }]
  }
}
```

## PATCH `/api/jobs/:id/tasks/:skill`

**Purpose:** persist personal progress on a generated micro-task. It never verifies the skill or changes coverage.

- Authentication: job key.
- Request/response Content-Type: `application/json`.
- Path: `id`, job ObjectId; `skill`, canonical task skill ID such as `redis`. Query: none.
- Body: `{ "status": "todo" | "in-progress" | "done" }`, required exact enum value.
- Validation: valid job ID/key, existing task for skill, permitted status.
- Services/business logic: `updateTask` authorizes and atomically updates the matched array element using a positional update. No candidate or score mutation occurs.
- External APIs: none. Database effects: updates only the task status and timestamp in `jobanalyses`.
- Success: **200**, full sanitized updated job document, same contract as GET `/jobs/:id`.
- Errors: 400 input/ID/JSON; 403 key/origin; 404 report or `TASK_NOT_FOUND`; 413 body size; 429; 500.

```bash
curl -X PATCH http://localhost:8000/api/jobs/507f1f77bcf86cd799439012/tasks/redis \
  -H "X-Access-Token: JOB_KEY" -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}'
```

Response excerpt:

```json
{ "success": true, "data": { "_id": "507f1f77bcf86cd799439012", "coverage": 0, "microTasks": [{ "skill": "redis", "title": "Cache a real API endpoint", "status": "in-progress" }] } }
```

The actual response retains all original task fields, matches, and job fields. After publishing new work, create a new candidate analysis and new job match to collect fresh evidence.
