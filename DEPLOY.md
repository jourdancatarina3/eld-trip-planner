# Deploy (free): Render backend + Vercel frontend

Two services, connected by two URLs. Deploy the backend first so you have its
URL for the frontend, then point the backend's CORS back at the frontend.

## 1. Backend on Render (free)

1. Go to [render.com](https://render.com) → sign in with GitHub.
2. **New → Blueprint** → pick this repo. Render reads `render.yaml` and creates
   the web service (root `backend/`, gunicorn, free plan). Click **Apply**.
   - *No Blueprint?* Use **New → Web Service** instead and set: Root Directory
     `backend`, Build `pip install -r requirements.txt && python manage.py collectstatic --noinput`,
     Start `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`, and add the
     env vars listed in `render.yaml`.
3. When it finishes, copy the service URL, e.g.
   `https://eld-trip-planner-api.onrender.com`. Open `…/api/health/` — it should
   return `{"status":"ok"}`.

Leave `CORS_ALLOWED_ORIGINS` empty for now; you'll set it in step 3.

## 2. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import this repo.
2. Set **Root Directory** to `frontend`.
3. Add an environment variable:
   `NEXT_PUBLIC_API_URL = https://eld-trip-planner-api.onrender.com` (your
   Render URL from step 1, **no trailing slash**).
4. **Deploy**, then copy the resulting URL, e.g.
   `https://eld-trip-planner.vercel.app`.

## 3. Connect them (CORS)

1. Back in Render → your service → **Environment** → set
   `CORS_ALLOWED_ORIGINS = https://eld-trip-planner.vercel.app` (your Vercel URL,
   no trailing slash). Save — Render redeploys automatically.
2. Open the Vercel URL and plan a trip. Done.

## Notes

- `NEXT_PUBLIC_API_URL` is baked in at build time — if you change it, redeploy
  the frontend (Vercel → Deployments → Redeploy).
- Render's free service sleeps after ~15 min idle, so the **first** request can
  take ~30–50s to wake up; it's instant after that.
- The backend is stateless (SQLite is only Django's default; no trip data is
  stored), so the free tier's ephemeral disk is fine.
- Multiple Vercel origins? Comma-separate them in `CORS_ALLOWED_ORIGINS`
  (e.g. add your `*-git-*.vercel.app` preview URL).
