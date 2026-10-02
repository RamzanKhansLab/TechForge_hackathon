# SkillProof Contributor Guide

## Project summary

SkillProof verifies resume claims against public GitHub evidence. It accepts a PDF resume
and GitHub username, extracts skills deterministically, collects public repository evidence,
and marks skills `Proven`, `Partial`, or `Claimed-only`. It also supports job-description
matching, deterministic micro-tasks, before/after analysis, and a recruiter evidence view.

Product principles:
- Deterministic MVP only: no LLM calls, OCR, code execution, or private-repo analysis.
- Every UI value, skill, task, and verdict comes from real API data; no production fixtures.
- Every verdict links to evidence.
- Never rank candidates, predict hiring, or present a hire score.
- Resumes live in authenticated Cloudinary storage; MongoDB stores metadata only.

## Stack

- Backend: Node 22, Express 5, MongoDB Atlas, Mongoose, Zod, pdf-parse, Cloudinary.
- Frontend: React 19, Vite, React Router 7, Tailwind CSS 4, Axios, Lucide.
- Fonts: Fraunces (headings), IBM Plex Sans (UI), IBM Plex Mono (data).
- Deployment: Render backend, Vercel frontend, Atlas, Cloudinary.

## Folder map

- `backend/src/routes`: API route registration.
- `backend/src/controllers`: request/response orchestration.
- `backend/src/services`: analysis, GitHub, resume, jobs, coach, recruiter, and storage logic.
- `backend/src/models`: Mongoose models and shared sub-schemas.
- `backend/src/middlewares`: validation, upload, auth, and error handling.
- `backend/test`: Node test suite.
- `frontend/src/pages`: route-level UI.
- `frontend/src/components`: reusable UI and dashboard components.
- `frontend/src/context`: client-side state providers.
- `frontend/src/services/api`: Axios API wrappers.
- `frontend/src/main.css`: Tailwind theme tokens and global styles.
- `docs` and `backend/docs`: product, deployment, architecture, and API documentation.

## Running locally

1. Copy `backend/.env.example` to `backend/.env` and fill MongoDB, Cloudinary, GitHub,
   JWT, cookie, and allowed-origin settings.
2. Install both applications: `npm run setup`.
3. Start both applications: `npm run dev`.
4. Frontend: `http://localhost:5173`; API: `http://localhost:8000/api`.
5. Run backend tests: `npm test --prefix backend`.
6. Build the frontend: `npm run build --prefix frontend`.

## Current security transition

The repository currently contains partial user/session code, while analyses and related
records still rely on `X-Access-Token` capability keys stored in browser localStorage.
Do not expand that partial work outside its assigned phase. The target is email/password
accounts with strict ownership, short-lived JWTs, rotating hashed refresh tokens, CSRF
double-submit protection, and role-specific student/recruiter access.

Required ownership behavior:
- Every owned document carries an indexed `ownerUserId`.
- Scoped queries must include the authenticated owner; a non-owner receives 404.
- Old access keys only support one-time legacy-report claiming, then become invalid.
- Shared profiles are available only to authenticated recruiters and have revocable access
  with an organisation-and-time access log (never recruiter email).
- Production frontend calls `/api` through a Vercel rewrite; do not use wildcard CORS.

## Working rules

- Work one assigned phase at a time. After each phase, stop and report changed files,
  endpoints, data fields/collections, manual test steps, and test output.
- Before a phase, provide a short plan. If it changes a public API contract, wait for approval.
- Keep tests green. Add unit tests for new pure functions and permission rules.
- Return typed errors: `{ code, message, hint }`.
- Make small phase commits: `phase A<n>: <summary>`.
- Never log passwords, tokens, or cookies.
- Use Zod on auth routes; maintain rate limits, lockout, Helmet, and request-size limits.
- Do not rewrite unrelated code or replace the analysis engine while implementing a phase.

## Lens design constraints

- Student and recruiter use separate shells: `StudentShell` and `RecruiterShell`.
- Do not reuse one recolored layout. Shared UI is limited to Stamp, Rule, EvidenceLink,
  FlagNote, drawer logic, and active-scope reading tokens.
- Remove the shared dark-green sidebar, lime active pill, and icon-in-square card pattern.
- Student lens is the warm, paper-based Lab Notebook; recruiter is the dense, cool Case Desk.
- Both lenses: WCAG AA, visible 2px `#1F4E8C` focus rings, reduced-motion support, and
  mobile checks at 375px plus desktop checks at 1280px.

## Design bans

- No dark navy/black with purple, blue, or cyan gradients.
- No glassmorphism, glow, neon, gradient text, blobs, particles, or emoji icons.
- No stock Tailwind palette colors; use named theme tokens only.
- No repeated rounded-card grids, centered hero with two buttons, fake testimonials, or
  marketing filler copy.
- No candidate ranking, totals that highlight a candidate, sorting controls, or hire scores.
- Charts must be hand-written SVG.
