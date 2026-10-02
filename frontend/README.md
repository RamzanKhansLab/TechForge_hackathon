# SkillProof frontend

React + Vite SPA with Tailwind CSS, React Router, Axios, and Lucide icons. The design uses a cream/sage workspace, dark green navigation, restrained lime accents, and text-labeled status colors.

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Set VITE_API_BASE_URL to the backend origin plus /api.
npm.cmd run dev
```

Run these commands inside `frontend`. Production build: `npm.cmd run build`; output: `dist`. No test framework or browser automation is installed.

Every JSX module has a colocated CSS file with the same base filename. Tailwind utilities provide the majority of layout/style; custom CSS handles the evidence illustration, navigation, tables, and charts. This is a REST client for the implemented backend, not a mock-data UI.

See [architecture](docs/architecture.md), [components](docs/components.md), [API integration](docs/api-integration.md), [styling](docs/styling.md), [environment](docs/environment.md), and [Vercel deployment](docs/deployment.md).
