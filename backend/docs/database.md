# MongoDB data model

Mongoose stores two collections, `analyses` and `jobanalyses`. Embedded subdocuments intentionally have no separate `_id`. All records have automatic `createdAt` and `updatedAt` dates. Binary media is never stored in MongoDB. Native `_id` values are ObjectIds and serialize as hex strings in JSON. Dates serialize as ISO timestamps. Optional extraction/provider fields may be absent.

## Analysis (`src/models/Analysis.js`)

Purpose: an authorized candidate report, durable work item, and immutable completed evidence snapshot.

| Field | Type | Requirement / meaning |
|---|---|---|
| `_id` | ObjectId | Generated primary key |
| `accessTokenHash` | String | Required SHA-256 hash; excluded by default selection |
| `githubUsername` | String | Required; max 39 characters; validated username |
| `candidate.name/email/phone` | String | Optional heuristic contact extraction |
| `resume.filename` | String | Original basename, bounded to 120 characters |
| `resume.pages` | Number | Parsed page count |
| `resume.asset` | Embedded object | Private Cloudinary reference; fields below |
| `resume.skills` | String[] | Canonical claimed skill IDs |
| `resume.categories` | Map of String[] | Category → claimed IDs |
| `resume.projects/experience/education/certifications` | String[] | Bounded section lines, at most 30 each, 500 characters per line |
| `github` | Embedded object | Canonical profile metadata |
| `repositories` | Repository[] | Bounded inspection snapshots |
| `skills` | Skill[] | Claimed plus directly discovered skill results |
| `warnings` | String[] | Resume/selection/collection caveats |
| `summary` | Embedded counts | `claimed`, `proven`, `partial`, `claimedOnly`, `repositoriesAnalyzed`, `discovered` |
| `status` | Enum String | Required; queued (default), processing, completed, failed |
| `stage` | String | queued, github, repositories, evidence, scoring, report, completed, failed |
| `progress` | Number | Stored pipeline percentage, starts at 0 |
| `error.code/message` | String | Safe asynchronous failure details |
| `scoringVersion` | String | Rules used for this snapshot |
| `attempts` | Number | Atomic worker claims, starts at 0 |
| `leaseOwner` | String | Internal process identifier |
| `leaseUntil` | Date | Internal reclaim deadline |
| `completedAt` | Date | Final completion timestamp |

Indexes: automatic `_id`; `{ status: 1, leaseUntil: 1, createdAt: 1 }` for queue claims/recovery; `{ githubUsername: 1, createdAt: -1 }` for operational lookup by candidate/time. There is no public candidate listing endpoint.

### Cloudinary reference

`public_id: String`, `secure_url: String`, `resource_type: String` (`raw`), `type: String` (`authenticated`), `format: String` (`pdf`), `bytes: Number`. Internal metadata is retained for deletion. API serialization exposes only `format` and `bytes` from this object.

### GitHub profile

`login`, `name`, `avatarUrl`, `url`, `bio`: optional strings. `publicRepos` and `followers`: numbers. Public profile metadata is not a verified identity claim.

### Repository subdocument

| Fields | Types | Meaning |
|---|---|---|
| `name`, `fullName`, `url`, `description`, `defaultBranch` | String | Public repository identity/metadata |
| `stars` | Number | Star count snapshot |
| `updatedAt` | Date | GitHub pushed-at activity time |
| `languages` | Map of Number | Language names → byte counts |
| `commitCount` | Number | Candidate-attributed sampled commit count |
| `commitCountIsSample` | Boolean | Whether more pages were available; collection is still bounded when false |
| `latestCommit`, `firstCommit` | Date | Newest/oldest sampled commit |
| `commitsLast30Days`, `commitsLast90Days` | Number | Counts within the sample |
| `commits` | Object[] | Up to ten `{ sha, url, date, message }` entries |
| `testingDetected` | Boolean | Test paths/config or testing dependencies detected |
| `testingFramework` | String[] | Recognized declared test frameworks |
| `testEvidence` | String[] | Up to 15 test paths |
| `deploymentDetected` | Boolean | Configuration/link indicators, not live verification |
| `deploymentPlatform` | String[] | Platforms recognized from config names |
| `deploymentEvidence` | String[] | Up to 20 config paths or README deployment URLs |
| `readme` | Object | `description: String` (500 chars), `setupInstructions: Boolean`, `deploymentLinks: String[]` (up to 10) |
| `filesInspected` | String[] | Files whose content was successfully read |
| `evidence` | Evidence[] | Direct and supporting signals |
| `warnings` | String[] | Missing/truncated metadata, failed content reads, sample caveats |

### Skill and evidence subdocuments (`src/models/shared.js`)

Skill fields: `id`, `name`, `category` (strings); `claimed` (boolean); `status` (Proven/Partial/Claimed-only); `score` (number); `reasons` and `repositories` (string arrays); `breakdown` (array of `{ rule: String, points: Number }`); `evidence` (array below).

Evidence fields: `skill`, `type`, `repository`, `file`, `description`, `url` (strings); `date` (date); `strength` (`direct` or `supporting`). Evidence date describes repository activity at collection, not necessarily a skill introduction date. Type may be dependency, configuration, language, readme, commitActivity, recentActivity, testing, or deployment.

Illustrative minimal persisted queued document (values are documentation examples, not seed data):

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "accessTokenHash": "SHA256_HEX_HASH",
  "githubUsername": "candidate-login",
  "candidate": { "name": "Candidate Name" },
  "resume": { "filename": "resume.pdf", "pages": 2, "skills": ["react"], "categories": { "Frontend": ["react"] }, "asset": { "public_id": "skillproof/resumes/UUID.pdf", "secure_url": "https://res.cloudinary.com/CLOUD/raw/authenticated/v1/skillproof/resumes/UUID.pdf", "resource_type": "raw", "type": "authenticated", "format": "pdf", "bytes": 12345 } },
  "status": "queued", "stage": "queued", "progress": 0, "attempts": 0,
  "repositories": [], "skills": [], "warnings": []
}
```

## JobAnalysis (`src/models/JobAnalysis.js`)

Purpose: authorized job requirement extraction, optional candidate match snapshot, and personal micro-task state.

| Field | Type | Requirement / meaning |
|---|---|---|
| `_id` | ObjectId | Generated |
| `accessTokenHash` | String | Required; excluded by default selection |
| `analysisId` | ObjectId reference to Analysis, nullable | Optional candidate relationship |
| `title` | String | Max 120; explicit title or first description line |
| `jobDescription` | String | Required; validated 40–20,000 characters |
| `requiredSkills`, `preferredSkills` | String[] | Canonical dictionary IDs |
| `categories` | Map of String[] | Categories across both sets |
| `matches` | Match[] | Required skill comparisons when a candidate exists |
| `coverage` | Number, nullable | Rounded percentage, null when not calculable |
| `summary` | Object | `verified`, `partial`, `gaps`, `required` counts |
| `microTasks` | Task[] | Tasks for Partial and Gap matches |
| `warnings` | String[] | Extraction/coverage interpretation caveats |

Match fields: `skill`, `name`, `candidateStatus`, `reason` (strings), `score` (number), `state` (Verified/Partial/Gap), `evidence` (Evidence[]). Missing candidate skills use `candidateStatus: Missing`.

Task fields: `skill`, `title`, `description`, `difficulty`, `estimatedTime` (strings), `expectedOutput` (string[]), `status` (todo/in-progress/done, defaults to todo). Progress does not update the referenced candidate or match score.

Indexes: automatic `_id`; `{ analysisId: 1, createdAt: -1 }` for relationship lookup/deletion. Deleting a candidate deletes all jobs with its ID after deleting the cloud PDF. No database cascade is assumed; the service explicitly implements deletion.

```json
{
  "_id": "507f1f77bcf86cd799439012", "accessTokenHash": "SHA256_HEX_HASH",
  "analysisId": null, "title": "API Developer",
  "jobDescription": "We require Node.js and MongoDB experience for our API developer role.",
  "requiredSkills": ["nodejs", "mongodb"], "preferredSkills": [],
  "categories": { "Backend": ["nodejs"], "Databases": ["mongodb"] },
  "matches": [], "coverage": null, "microTasks": [],
  "summary": { "required": 2, "verified": 0, "partial": 0, "gaps": 0 }
}
```

## Retention and consistency

There are no TTL indexes or automatic purges. Binary deletion spans Cloudinary and MongoDB and cannot be atomic across both. Uploaded assets are rolled back when normal creation fails; process crashes can leave orphans. See [limitations](../../docs/limitations.md). Back up Atlas data according to the capabilities and policy of your account; access-key hashes cannot recover the plaintext keys.
