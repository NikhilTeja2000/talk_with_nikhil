# Talk with Nikhil — Deployment

You have **two** pieces to deploy:

1. **Frontend** (Next.js) → **Vercel**
2. **Backend** (FastAPI) → **Google Cloud Run**

The frontend talks to the backend via REST and WebSockets, so you deploy the backend first, then the frontend with the backend URL in env.

---

## 1. Backend → Google Cloud Run

### Prerequisites
- Google Cloud project (e.g. `clinivise2`) with billing enabled
- `gcloud` CLI installed and logged in: `gcloud auth login` + `gcloud config set project clinivise2`

### Steps

1. **Create a Dockerfile** in the project root (or in `backend/`) that runs the FastAPI app. Example for `backend/`:

   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

2. **Build and push** to Artifact Registry (or use Cloud Build):
   ```bash
   gcloud run deploy talk-with-nikhil-api \
     --source ./backend \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "GOOGLE_CLOUD_PROJECT=clinivise2,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_GENAI_USE_VERTEXAI=TRUE,GEMINI_LIVE_MODEL=gemini-2.5-flash,GEMINI_VOICE_MODEL=gemini-live-2.5-flash-native-audio,APP_ENV=production"
   ```
   You’ll need to add Supabase and `ALLOWED_ORIGIN` via Secret Manager or `--set-env-vars` (see below).

3. **Environment variables on Cloud Run**  
   Set at least:
   - `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`
   - `GOOGLE_GENAI_USE_VERTEXAI=TRUE`
   - `GEMINI_LIVE_MODEL`, `GEMINI_VOICE_MODEL`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGIN` = your Vercel frontend URL (e.g. `https://talk-with-nikhil.vercel.app`)

4. **Note:** Cloud Run will give you a URL like `https://talk-with-nikhil-api-xxxxx-uc.a.run.app`. Use this as the backend base URL for the frontend.

---

## 2. Frontend → Vercel

### Prerequisites
- GitHub (or GitLab) repo with your code
- Vercel account: [vercel.com](https://vercel.com)

### Steps

1. **Connect the repo**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Set **Root Directory** to `frontend` (so Vercel builds the Next.js app, not the whole monorepo)

2. **Environment variables** (in Vercel project → Settings → Environment Variables)
   - `NEXT_PUBLIC_API_BASE_URL` = your Cloud Run URL, e.g. `https://talk-with-nikhil-api-xxxxx-uc.a.run.app`
   - `NEXT_PUBLIC_WS_URL` = same origin, WebSocket path: `wss://talk-with-nikhil-api-xxxxx-uc.a.run.app/ws/live`
   - `NEXT_PUBLIC_WS_VOICE_URL` = `wss://talk-with-nikhil-api-xxxxx-uc.a.run.app/ws/voice`
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

3. **Deploy**
   - Push to your main branch or trigger a deploy from the Vercel dashboard. Vercel will build and host the frontend.

4. **CORS**
   - Backend must allow the Vercel origin. Set `ALLOWED_ORIGIN` on Cloud Run to your Vercel URL (e.g. `https://your-app.vercel.app`). If you use multiple domains (preview URLs), you may need to allow multiple origins in the FastAPI app.

---

## Summary

| What        | Where        | You do |
|------------|--------------|--------|
| Backend    | Cloud Run    | Deploy FastAPI (e.g. `gcloud run deploy` from `backend/`), set env vars including Supabase and `ALLOWED_ORIGIN`. |
| Frontend   | Vercel       | Connect repo, set root to `frontend`, add env vars: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_WS_VOICE_URL`, Supabase. |
| Voice / API| Same backend | Frontend uses the same Cloud Run URL for REST and WebSockets (`/ws/voice`). |

So: **you don’t “just” connect to Vercel** — you connect Vercel for the frontend and deploy the backend to Cloud Run, then point the frontend at the backend URL via the env vars above.
