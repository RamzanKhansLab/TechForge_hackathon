# GitHub integration

The backend uses Axios against the fixed origin `https://api.github.com`, an explicit API-version header, a User-Agent, optional bearer token, 15-second request timeout, a 4 MiB response cap, and no automatic redirects. Credentials are never returned to the browser. Data is exclusively from public user/repository endpoints; no OAuth/private repository workflow exists.

## Endpoints and budget

| Endpoint | Why used |
|---|---|
| `GET /users/:username` | Profile metadata and canonical login |
| `GET /users/:username/repos` | Up to 200 repositories sorted by most recently pushed |
| `GET /repos/:owner/:repo/languages` | Language byte counts |
| `GET /repos/:owner/:repo/git/trees/:branch?recursive=1` | Bounded file-path/config/test discovery |
| `GET /repos/:owner/:repo/commits?author=:username&per_page=100` | Candidate-attributed activity sample |
| `GET /repos/:owner/:repo/contents/:path?ref=:branch` | Up to ten targeted text files, including README |

README is read through the contents endpoint; a separate README endpoint is unnecessary. Deployment evidence comes from config paths and README URLs rather than additional deployment API calls. No full clones, archive downloads, source execution, arbitrary URL fetching, or private endpoints are used.

Select non-fork, non-archived, enabled, non-empty repositories. The default is six eligible repositories from the fetched pages, prioritizing recent activity. Metadata requests for a single repository run in parallel (maximum three); file requests and repositories run sequentially. The default worst-case budget is about 81 calls before caching: one profile + two repository pages + six × (three metadata + ten files).

## Inspection rules

Read at most 5,000 tree entries and exclude `node_modules`, `vendor`, `dist`, `build`, `coverage`, `.venv`, `venv`, and `.next`. Recognized text files are limited to 100,000 bytes each. Manifests are preferred, then README, then other configuration. This bound can miss files in large monorepos.

Inspect `package.json`, Python requirements/pyproject, Maven/Gradle files, Gemfile, Cargo/go manifests, Docker/Compose files, workflows, Terraform, Vercel/Render/Netlify configs, and Kubernetes directories as applicable. Each skill/type pair retains at most twenty evidence entries per repository to bound large configuration trees. Node inference requires a runtime declaration/script or a server framework, not merely any package.json.

GitHub language labels are normalized using the central dictionary. Manifest dependency keys are matched by known package names. README text produces weak technology mentions. Config paths indicate presence; Kubernetes manifests additionally inspect resource content. GitHub language bytes and configuration are not proof of skill-specific authorship.

## Commit semantics

The commits endpoint is filtered by author username, then checked against the returned author login. At most 100 commits from the default branch are considered. `commitCount`, `commitsLast30Days`, `commitsLast90Days`, `latestCommit`, and `firstCommit` are sample-derived. `commitCountIsSample` is true if GitHub indicates another page; `firstCommit` is the oldest sampled result. Ten commit links/messages are retained for display. Commit context is repository-wide, not skill-specific.

## Failure, cache, and limits

A bounded in-memory cache holds up to 180 public responses under 180,000 serialized bytes each for the configured TTL. Errors are not cached. Cache eviction is oldest-inserted; cache state is lost on restart and is not shared across instances.

Profile not found becomes `GITHUB_USER_NOT_FOUND`. GitHub 401 becomes a safe server credential error. Rate-limit 403/429 becomes `GITHUB_RATE_LIMIT` and fails the analysis visibly. Optional tree/language/commit/file failures are recorded as repository warnings, while credential/rate-limit failures propagate. Unavailable profile/repository-list access prevents producing a misleading complete report.

GitHub documents different authenticated/unauthenticated quotas and secondary rate limits; do not infer unlimited throughput from a token. See [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [Git trees](https://docs.github.com/en/rest/git/trees), and [repository contents](https://docs.github.com/en/rest/repos/contents).
