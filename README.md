# SkillProof

**Verify skills through evidence, not claims.**

SkillProof is a complete MERN MVP that connects a PDF resume to public GitHub repository evidence, explains technical-skill classifications, and compares that evidence with a job description. Gaps become focused micro-tasks with concrete outputs.

Resume skill lists alone provide little context. SkillProof makes the underlying evidence inspectable without treating public GitHub activity as a measure of a person's overall ability.

## Features

- PDF upload, private Cloudinary storage, text extraction, contact/section parsing, and a centralized technical-skill dictionary.
- Targeted public GitHub analysis: active non-fork repositories, languages, manifests, README, candidate-attributed commits, test indicators, deployment configuration, and workflow files.
- Auditable Proven / Partial / Claimed-only classifications with score breakdowns, repository/file URLs, and collection caveats.
- Durable MongoDB-backed asynchronous analysis, actual stage polling, lease-based interrupted-work recovery, and manual retry.
- Candidate dashboard, responsive skill table, evidence details, repository summaries, job analysis, coverage, gap explanations, and persisted micro-task progress.
- Private report access keys, local report history, key export/import, and deletion of a candidate report, PDF, and linked jobs.
- Express validation, Helmet, explicit CORS origins, upload limits, rate limiting, safe errors, and structured operational logs.

## Stack and structure

React 19, Vite, Tailwind CSS 4, React Router, Axios, Node.js 22, Express 5, Mongoose, MongoDB Atlas, Multer, pdf-parse, Cloudinary, and GitHub REST API. No test framework, external queue service, LLM provider, or persistent local file storage is required.

```text
TechForge_hackathon/
├── frontend/                 React application; independently installable/deployable
│   ├── src/
│   │   ├── components/       Common, layout, forms, dashboard, skills, evidence, jobs
│   │   ├── pages/            Every product route
│   │   ├── context/          Browser report-key/history state
│   │   ├── hooks/            Resource loading and analysis polling
│   │   └── services/         Central API client and report-key storage
│   ├── docs/
│   ├── .env.example
│   └── vercel.json
├── backend/
│   ├── src/
│   │   ├── config/           Validated environment, database, scoring
│   │   ├── controllers/      Thin HTTP adapters
│   │   ├── routes/           REST routes and route limits
│   │   ├── middlewares/      Validation, upload handling, errors
│   │   ├── models/           Analysis, JobAnalysis, embedded schemas
│   │   ├── services/         Resume, GitHub, evidence, jobs, storage, worker
│   │   ├── data/             Skill dictionary and micro-task catalog
│   │   └── utils/
│   ├── docs/api/
│   └── .env.example
├── docs/                     Product, architecture, business logic, deployment
├── render.yaml
└── package.json              Convenience commands for both applications
```

## Local setup

Use Node.js **22.14 or newer in the Node 22 release line**. Dependencies and lockfiles are separate for root, frontend, and backend. On Windows PowerShell, use `npm.cmd` if `npm.ps1` is restricted.

```powershell
cd D:\Ramzan_Khan\Hackathons\TechForge_TSEC\TechForge_hackathon
npm.cmd ci
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

Fill the backend credentials described below, then start both processes:

```powershell
npm.cmd run dev
```

Frontend: `http://localhost:5173`. API: `http://localhost:8000/api`. Configure `CLIENT_ORIGIN` and `VITE_API_BASE_URL` if you change ports. No fake-data mode or implicit local database fallback is enabled. The frontend can display its landing page without a running API; analysis needs the configured backend.

Separate terminals are also supported:

```powershell
npm.cmd run dev --prefix backend
npm.cmd run dev --prefix frontend
```

Build the frontend with `npm.cmd run build`. Run the backend in production mode with `npm.cmd start --prefix backend` after setting its environment. Preview a frontend build with `npm.cmd run preview --prefix frontend`; preview is a local utility, not a production web server.

## Environment and service accounts

| Location | Variable | Purpose |
|---|---|---|
| Backend | `MONGO_URI` | Atlas connection string, with the `skillproof` database name |
| Backend | `CLOUDINARY_CLOUD_NAME` | Cloudinary product environment cloud name |
| Backend | `CLOUDINARY_API_KEY` | Cloudinary server-side key |
| Backend | `CLOUDINARY_API_SECRET` | Cloudinary server-side secret |
| Backend | `GITHUB_TOKEN` | Recommended server-side credential for public API access |
| Backend | `CLIENT_ORIGIN` | Exact allowed frontend origin, or comma-separated origins |
| Backend | `PORT` | HTTP port; Render supplies it in production |
| Frontend | `VITE_API_BASE_URL` | Public API base URL **including `/api`** |

Additional operational variables are documented in [backend environment](backend/docs/environment.md). Never put MongoDB, GitHub, or Cloudinary secrets in a `VITE_` variable.

### MongoDB Atlas

1. Create an Atlas project and free cluster using your account's available free option.
2. Create a dedicated database user with `readWrite` on `skillproof`.
3. Add your development IP to Network Access. For Render, allow its service's outbound IP ranges where possible.
4. Copy the Drivers connection string, URL-encode password characters, and specify `/skillproof` before `?`.
5. Set `MONGO_URI` in `backend/.env` locally and the Render service environment in production.
6. The backend connects before listening and creates Mongoose indexes. Read [database documentation](backend/docs/database.md).

### GitHub token

Create a server-side token with the minimum access needed to read public repository metadata and contents. No write permission is used. Do not grant private-repository access for this MVP. Set `GITHUB_TOKEN` only on the backend. Without a token the code works against public endpoints but is more likely to hit GitHub's unauthenticated rate limit. Failed rate-limited analyses can be retried after reset. See [GitHub integration](backend/docs/github-integration.md).

### Cloudinary

Create a Cloudinary account/product environment and find the cloud name, API key, and API secret in its dashboard. Set the three backend variables. Resumes are uploaded through signed server-side SDK requests as `raw` assets with `authenticated` delivery and random `.pdf` public IDs. No unsigned upload preset is required. MongoDB holds asset references; no PDF bytes are stored there. See [complete Cloudinary setup](backend/docs/cloudinary.md), including cleanup and delivery restrictions.

## Demo flow

1. Open **New analysis**, upload a text-based resume PDF, and enter a GitHub username.
2. Start analysis. The upload request stores and parses the PDF, then returns a private report key.
3. Watch actual backend stages and open the completed candidate dashboard.
4. Review verified skills, then click a skill to inspect its evidence and score breakdown.
5. Save the report access key if you need another browser or device.
6. Select **Match to a role**, paste a job description, and analyze it.
7. Review Skill Coverage, verified and partial matches, and gaps.
8. Open micro-task outputs and track personal progress.
9. Publish new work and create a new analysis to collect fresh evidence; marking a task done does not change verification.

## Deployment

Configuration is provided; creating files does **not** deploy the application.

1. Push this repository to GitHub yourself.
2. Create an Atlas cluster and Cloudinary product environment and obtain their credentials.
3. In Render, create a Blueprint from root `render.yaml`, or a Node web service with root `backend`, build `npm ci --omit=dev`, start `npm start`, and health check `/api/health`. Set the backend secrets and `TRUST_PROXY=1`.
4. In Vercel, import the repository with root `frontend`, framework Vite, build `npm run build`, output `dist`, and install `npm ci`. Set `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`.
5. Set Render `CLIENT_ORIGIN` to the exact Vercel production origin and redeploy. Use explicit preview origins if needed; do not use wildcard credentials or dynamically trust arbitrary origins.
6. Vercel SPA rewrites are included in `frontend/vercel.json`. GitHub tokens and database/storage secrets stay on Render.

The free Render process can sleep or restart; the queue is stored in MongoDB, and an expired lease is reclaimed when the process runs again. See [deployment overview](docs/deployment-overview.md) for platform limitations and account setup.

## Documentation

- [System architecture and data flow](docs/architecture.md)
- [Product overview](docs/product-overview.md)
- [Scoring, classification, coverage, and task logic](docs/business-logic.md)
- [Complete REST API reference](backend/docs/api/README.md)
- [Backend guide](backend/README.md) and [frontend guide](frontend/README.md)
- [Deployment overview](docs/deployment-overview.md)
- [Limitations](docs/limitations.md) and [future improvements](docs/future-improvements.md)

## Security and scope

Reports contain personal information. Each new report gets a random 256-bit access token; only a hash is stored server-side. The browser stores the token locally and supplies `X-Access-Token`. Anyone with a key can access its report. Save key files privately. This is capability-based MVP access, not account authentication or enterprise authorization. CORS is not authentication.

Uploaded resumes remain until deleted through their candidate overview. There is no retention scheduler, OAuth, private repository analysis, OCR, LLM extraction, code execution, candidate ranking, or hiring prediction in this MVP. Those deliberate boundaries and operational caveats are documented. Cloud integrations require real account configuration before use. No deployment or browser/E2E validation is implied by this codebase.
