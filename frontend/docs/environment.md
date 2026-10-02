# Frontend environment

| Variable | Required for this deployment | Example | Exposure |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000/api` or `https://YOUR-API.onrender.com/api` | Public, built into JS |

Copy `frontend/.env.example` to `.env` for local use. Vite reads the variable when starting/building. Restart the dev server or rebuild/redeploy after changing it. Production requires HTTPS to avoid mixed-content errors.

There are no frontend GitHub tokens, Cloudinary keys, database credentials, or server secrets. A `VITE_` prefix is not encryption; anything using it is public. User-generated report access keys live in browser storage and request headers, not build-time environment values.

When omitted, the API client uses `/api`, suitable only when the host/reverse proxy actually routes that path to the backend. The provided split Vercel/Render deployment uses the explicit absolute backend URL.
