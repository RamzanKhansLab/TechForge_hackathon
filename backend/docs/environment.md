# Backend environment variables

Copy `.env.example` into `.env` when running from `backend`. Render injects the same variables directly. Never commit the filled file.

| Variable | Required/default | Validation and purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `production`, or `test`; deployment intent |
| `PORT` | `8000` | Integer 1–65535; Render supplies the listening port |
| `MONGO_URI` | Required | `mongodb://` or `mongodb+srv://`; use Atlas in production |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated exact HTTP(S) origins, no paths or trailing slash |
| `GITHUB_TOKEN` | Empty | Server-only public GitHub access credential; recommended |
| `GITHUB_API_VERSION` | `2022-11-28` | REST API version header, centralized for future upgrades |
| `CLOUDINARY_CLOUD_NAME` | Required | Cloudinary product environment name |
| `CLOUDINARY_API_KEY` | Required | Server SDK key |
| `CLOUDINARY_API_SECRET` | Required | Server SDK secret |
| `MAX_REPOSITORIES` | `6` | Integer 1–12; eligible repositories inspected |
| `MAX_FILE_SIZE_MB` | `5` | Integer 1–10; upload byte cap |
| `GITHUB_CACHE_TTL_SECONDS` | `900` | Integer 0–3600; zero disables public response cache |
| `TRUST_PROXY` | `0` | Integer 0–2 trusted proxy hops; use 1 for the provided Render topology |

Required values are validated before startup. Only invalid variable names appear in configuration errors. A syntactically valid but unreachable database blocks startup. Cloudinary/GitHub connectivity is exercised only when used; valid-looking credentials alone do not guarantee provider access.

Use URL encoding for special characters in database passwords. Restrict Atlas database permissions and network access. Keep `GITHUB_TOKEN` minimally privileged. CORS origins are independent of the backend URL: `CLIENT_ORIGIN` names the site opening the API, while frontend `VITE_API_BASE_URL` names this API.
