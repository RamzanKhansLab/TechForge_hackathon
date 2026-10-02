# Render backend deployment

The root `render.yaml` defines one free Node web service. It intentionally creates no disk, Redis instance, database service, or separate paid worker. MongoDB Atlas and Cloudinary are configured external services.

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Runtime | Node.js 22.14 |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Plan | `free` |
| Bind address | `0.0.0.0` |
| Port | Render-provided `PORT` |
| Proxy setting | `TRUST_PROXY=1` for the provided single-proxy topology |

Create a Blueprint from the repository or enter these settings in a new web service. Supply all required values from [environment.md](environment.md). `sync: false` in the Blueprint keeps secrets out of source control; enter them in Render during setup. Set `NODE_ENV=production` and an exact HTTPS `CLIENT_ORIGIN`. Use Atlas network access for the service's outbound ranges and a least-privileged database user. Set Cloudinary credentials and a minimally privileged GitHub token.

Free-tier sleep/restarts can pause work. The analysis queue, parsed resumes, progress, and leases live in MongoDB. Expired work is reclaimed when the service runs. There is no promise of continuously executing background jobs on a sleeping free service. The creation request also needs enough time for storage/PDF parsing; keep resumes within the documented bounds.

Troubleshooting:

- Startup failure: verify required variable names, Atlas credentials/network access, and the URI database name. Logs omit secrets.
- CORS error: ensure `CLIENT_ORIGIN` matches the Vercel origin exactly without a trailing slash; redeploy after changes.
- Upload 502: check Cloudinary cloud name/key/secret and account status.
- GitHub failure: inspect the authorized report error; update invalid credentials or retry after quota reset.
- Long queued state: wake the web service, inspect operational logs, and confirm database connectivity. Do not manufacture progress client-side.

Reference: [Render Blueprints](https://render.com/docs/blueprint-spec) and [free service behavior](https://render.com/docs/free). This repository supplies deployment configuration, not a deployed URL.
