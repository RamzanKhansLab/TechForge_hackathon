# Repository evidence API

## GET `/api/analysis/:id/repositories`

**Purpose:** retrieve the repositories actually inspected for a saved candidate report, including bounded activity/evidence details and collection warnings. This is not an unrestricted GitHub proxy.

- Authentication: the analysis's `X-Access-Token`.
- Request Content-Type: none; response: `application/json`.
- Path parameter: `id`, required 24-character hex ObjectId. Query parameters/body: none.
- Validation: ObjectId, record existence, report key.
- Services/business logic: `analysis.service.getAnalysis`; return the saved `repositories` array. No upstream refresh is triggered by a read.
- External API calls: none for this endpoint. The async worker previously used the [documented GitHub endpoints](../github-integration.md).
- Database effects: read one `analyses` document, no writes.
- Success: **200**, `data: Repository[]`; empty if not saved yet or no eligible repositories exist.
- Errors: 400 invalid ID; 403 invalid key/origin; 404 missing report; 429 request limit; 500 database/internal.

```bash
curl http://localhost:8000/api/analysis/507f1f77bcf86cd799439011/repositories \
  -H "X-Access-Token: ANALYSIS_KEY"
```

Illustrative response:

```json
{
  "success": true,
  "data": [{
    "name": "portfolio", "fullName": "OWNER/portfolio", "url": "https://github.com/OWNER/portfolio",
    "description": "Portfolio application", "defaultBranch": "main", "stars": 0,
    "updatedAt": "2026-10-01T00:00:00.000Z", "languages": { "JavaScript": 12000 },
    "commitCount": 1, "commitCountIsSample": false,
    "latestCommit": "2026-10-01T00:00:00.000Z", "firstCommit": "2026-10-01T00:00:00.000Z",
    "commitsLast30Days": 1, "commitsLast90Days": 1,
    "commits": [{ "sha": "COMMIT_SHA", "url": "https://github.com/OWNER/portfolio/commit/COMMIT_SHA", "date": "2026-10-01T00:00:00.000Z", "message": "Add portfolio page" }],
    "testingDetected": false, "testingFramework": [], "testEvidence": [],
    "deploymentDetected": false, "deploymentPlatform": [], "deploymentEvidence": [],
    "readme": { "description": "Portfolio", "setupInstructions": true, "deploymentLinks": [] },
    "filesInspected": ["package.json", "README.md"], "warnings": [],
    "evidence": [{ "skill": "javascript", "type": "language", "repository": "portfolio", "file": "", "description": "12,000 bytes of JavaScript reported by GitHub Linguist.", "url": "https://api.github.com/repos/OWNER/portfolio/languages", "date": "2026-10-01T00:00:00.000Z", "strength": "direct" }]
  }]
}
```

Evidence above is shortened to one entry. Field semantics: [database repository subdocument](../database.md). Commit data is sampled and default-branch limited; `firstCommit` is the oldest sampled commit. `testingDetected` means indicators, not a successful test run. `deploymentDetected` means configuration/link indicators, not a confirmed live deployment. Optional endpoint failures and truncation remain in `warnings` and should be displayed.

There is no public endpoint for supplying arbitrary GitHub URLs or exposing `GITHUB_TOKEN`.
