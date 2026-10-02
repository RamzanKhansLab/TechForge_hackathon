# Skill API

## GET `/api/analysis/:id/skills`

**Purpose:** retrieve the candidate's skill classifications without the full resume/repository payload. This includes resume claims and skills with direct evidence discovered in GitHub.

- Authentication: the candidate analysis `X-Access-Token`.
- Content-Type: no request body; JSON response.
- Path parameter: `id`, required 24-hex ObjectId. Query parameters/body: none; no pagination/filter query is implemented for this bounded array.
- Validation: ID format, record existence, report key.
- Services/business logic: `analysis.service.getAnalysis`; return saved `skills`, without rescoring or recollecting.
- External APIs: none. Database effects: read `analyses`; no writes.
- Success: **200**, `data: Skill[]`; empty while no result has been saved or no recognized skills exist.
- Errors: 400 invalid ID; 403 key/origin; 404 record absent; 429 limit; 500 internal/database.

```bash
curl http://localhost:8000/api/analysis/507f1f77bcf86cd799439011/skills \
  -H "X-Access-Token: ANALYSIS_KEY"
```

Illustrative response (shortened evidence array):

```json
{
  "success": true,
  "data": [{
    "id": "react", "name": "React", "category": "Frontend", "claimed": true,
    "status": "Partial", "score": 30,
    "reasons": ["Direct evidence exists, but the supporting signals are limited.", "Strongest direct signal: +30"],
    "repositories": ["portfolio"], "breakdown": [{ "rule": "Strongest direct signal", "points": 30 }],
    "evidence": [{ "skill": "react", "type": "dependency", "repository": "portfolio", "file": "package.json", "description": "React is declared in package.json. A declaration does not confirm runtime use.", "url": "https://github.com/OWNER/portfolio/blob/main/package.json", "date": "2026-10-01T00:00:00.000Z", "strength": "direct" }]
  }]
}
```

Full fields are in [database.md](../database.md). Scores range 0–100 and statuses are Proven/Partial/Claimed-only. Each evidence entry provides inspectable provenance. A dashboard can distinguish claimed and discovered skills using `claimed`.

## GET `/api/analysis/:id/skills/:skill`

**Purpose:** retrieve one saved skill result, including reasons, score breakdown, and source evidence for its detail view.

- Authentication: analysis key.
- Content-Type: no request body; JSON response.
- Path parameters: `id` as above; `skill` is the canonical dictionary ID (e.g. `react`, `nodejs`, `csharp`), matched exactly against this report. Query/body: none.
- Validation: ID and key, then membership of the skill in the report. Do not use the display name as the path ID.
- Services/business logic: `getAnalysis`, find saved skill; no new scoring.
- External APIs: none. Database effects: one analysis read, no writes.
- Success: **200**, `data: Skill` with the same fields as one array entry above.
- Errors: 400 ID; 403 key/origin; 404 `NOT_FOUND` or `SKILL_NOT_FOUND`; 429; 500. An unfinished report without saved skills returns skill-not-found rather than fabricating a result.

```bash
curl http://localhost:8000/api/analysis/507f1f77bcf86cd799439011/skills/react \
  -H "X-Access-Token: ANALYSIS_KEY"
```

Response excerpt:

```json
{ "success": true, "data": { "id": "react", "name": "React", "category": "Frontend", "claimed": true, "status": "Partial", "score": 30, "repositories": ["portfolio"], "breakdown": [{ "rule": "Strongest direct signal", "points": 30 }], "reasons": ["Direct evidence exists, but the supporting signals are limited."], "evidence": [] } }
```

The excerpt omits evidence entries only for readability; the actual response includes all retained evidence for the skill. See [business logic](../../../docs/business-logic.md) for score semantics.
