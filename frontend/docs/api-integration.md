# Frontend API integration

`src/services/api/client.js` is the only Axios client. It reads `VITE_API_BASE_URL`, strips a trailing slash, uses a 120-second request timeout, unwraps `success.data`, and normalizes server/network errors. Without a configured URL it uses relative `/api`; this requires a reverse proxy and is not supplied by the default Vite server. Copy the environment example for normal local development.

| Service | Operation | Route |
|---|---|---|
| `analysisApi.create` | Multipart PDF and username | POST `/analysis` |
| `analysisApi.get` | Snapshot or backend progress | GET `/analysis/:id` |
| `analysisApi.skills` | Skill array | GET `/analysis/:id/skills` |
| `analysisApi.skill` | Individual skill | GET `/analysis/:id/skills/:skill` |
| `analysisApi.repositories` | Repository array | GET `/analysis/:id/repositories` |
| `analysisApi.retry` | Retry failed analysis | POST `/analysis/:id/retry` |
| `analysisApi.remove` | Delete stored report and media | DELETE `/analysis/:id` |
| `jobApi.create` | Extract requirements, optionally match | POST `/jobs/analyze` |
| `jobApi.get` | Full saved job report | GET `/jobs/:id` |
| `jobApi.task` | Personal task status | PATCH `/jobs/:id/tasks/:skill` |
| `getMeta` | Dictionary, weights, upload limits | GET `/meta` |

All paths above are relative to the base ending in `/api`. Analysis reads attach that analysis's `X-Access-Token`. Linked job creation attaches the analysis key; later job reads/mutations attach the independent job key returned during creation. Keys never appear in route URLs or query strings.

Creation sends FormData without a manually specified `Content-Type`, allowing the browser to add the multipart boundary. Upload bytes and server processing are different states: at 100% upload the interface still waits for private storage/PDF parsing. A 202 response stores the key and navigates to the progress page. Stage/percentage changes are read from the server, not timers.

The dashboard and skill pages reuse the full analysis snapshot to display skills and repositories consistently. The dedicated subset routes remain available to other API consumers. The backend also implements `/jobs/:id/match` for clients that need just the match summary.

AbortController cancels stale reads. Mutations are explicitly triggered by forms/buttons and report errors without claiming success. A failed GET stops automatic polling and exposes retry. Background failure is a successful authorized report read with `status: failed`; it is rendered with the backend error and a retry action.

See the [backend contract](../../backend/docs/api/README.md) for every request, response, status, and side effect.
