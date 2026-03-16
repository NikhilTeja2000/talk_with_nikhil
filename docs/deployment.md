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

2. **Deploy with Cloud Build → Cloud Run** (what you actually used):
   ```bash
   gcloud run deploy talk-with-nikhil-api \
     --source backend \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "APP_ENV=production,GOOGLE_CLOUD_PROJECT=clinivise2,GOOGLE_CLOUD_LOCATION=us-central1,GOOGLE_GENAI_USE_VERTEXAI=TRUE,GEMINI_LIVE_MODEL=gemini-2.5-flash,GEMINI_VOICE_MODEL=gemini-live-2.5-flash-native-audio,SUPABASE_URL=$SUPABASE_URL,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,ALLOWED_ORIGIN=https://talk-with-nikhil.vercel.app"
   ```
   This command:
   - Builds the container from the `backend/` folder using the `Dockerfile`
   - Deploys it as the **`talk-with-nikhil-api`** Cloud Run service in **`us-central1`**
   - Injects all required env vars in one shot (Gemini, Supabase, `ALLOWED_ORIGIN`)

3. **Environment variables on Cloud Run**  
   You can also update env vars later with:
   ```bash
   # Load local .env and update service env vars
   set -a && source .env && set +a
   gcloud run services update talk-with-nikhil-api \
     --region us-central1 \
     --set-env-vars "APP_ENV=production,GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT:-clinivise2},GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION:-us-central1},GOOGLE_GENAI_USE_VERTEXAI=TRUE,GEMINI_LIVE_MODEL=${GEMINI_LIVE_MODEL:-gemini-2.5-flash},GEMINI_VOICE_MODEL=${GEMINI_VOICE_MODEL:-gemini-live-2.5-flash-native-audio},SUPABASE_URL=$SUPABASE_URL,SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,ALLOWED_ORIGIN=https://talk-with-nikhil.vercel.app"
   ```

4. **Note:** Cloud Run gives you a URL like:
   ```text
   https://talk-with-nikhil-api-679881662872.us-central1.run.app
   ```
   Use this as the backend base URL for the frontend.

5. **Health checks**
   - Basic: `GET /health` → `{"status": "ok", "service": "talk-with-nikhil"}`
   - Deep readiness (Gemini + Supabase + knowledge base):  
     `GET /readiness` → returns a JSON like:
     ```json
     {
       "ready": true,
       "checks": {
         "gemini": { "ok": true, "method": "vertex_ai" },
         "supabase": { "ok": true },
         "knowledge_base": { "ok": true, "chunks": 41 }
       }
     }
     ```

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
   - Backend must allow the Vercel origin. Set `ALLOWED_ORIGIN` on Cloud Run to your Vercel URL (e.g. `https://your-app.vercel.app`). For multiple origins (production + preview URLs), use comma-separated: `ALLOWED_ORIGIN=https://talk-with-nikhil.vercel.app,https://talk-with-nikhil-git-main-xxx.vercel.app`.

---

## Summary

| What        | Where        | You do |
|------------|--------------|--------|
| Backend    | Cloud Run    | Deploy FastAPI (e.g. `gcloud run deploy` from `backend/`), set env vars including Supabase and `ALLOWED_ORIGIN`. |
| Frontend   | Vercel       | Connect repo, set root to `frontend`, add env vars: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_WS_VOICE_URL`, Supabase. |
| Voice / API| Same backend | Frontend uses the same Cloud Run URL for REST and WebSockets (`/ws/voice`). |

So: **you don’t “just” connect to Vercel** — you connect Vercel for the frontend and deploy the backend to Cloud Run, then point the frontend at the backend URL via the env vars above.
