# Vercel frontend deployment

1. Push the repository to GitHub and import it in Vercel.
2. Set the project Root Directory to `frontend`.
3. Select the Vite framework preset and Node.js 22.
4. Install command: `npm ci`. Build command: `npm run build`. Output directory: `dist`.
5. Add `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api` for the intended production/preview environment.
6. Deploy through the dashboard. Note the exact public origin.
7. Set backend `CLIENT_ORIGIN` to that origin (no trailing slash). Add any permitted preview origins explicitly.

`frontend/vercel.json` contains the build/output settings, SPA route rewrite, and basic response headers. Static asset paths are excluded from the SPA rewrite. Refreshes of `/analysis/:id` and `/jobs/:id` therefore reach React Router rather than a static 404.

Vite environment values are compiled into the build. Changing a Vercel environment setting requires a new deployment to affect the client. Do not copy backend credentials into Vercel frontend variables.

Reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite). No Vercel project is provisioned by this repository itself.
