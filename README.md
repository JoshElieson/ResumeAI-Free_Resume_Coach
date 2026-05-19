# AI Resume Feedback

Upload or paste a resume and get AI-powered feedback: a **score out of 10**, **overall summary**, and **inline highlights** on specific phrases with strengths, weaknesses, and suggestions.

Built with **Next.js**, **OpenAI**, and deployable to **Vercel** (recommended) or other Node hosts.

## Quick start (localhost)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Add your OpenAI API key**

   Copy `.env.example` to `.env.local` and set your key:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```
   OPENAI_API_KEY=sk-...
   NEXTAUTH_SECRET=...          # openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

   Create Google OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (use your production URL when deployed).

3. **Run the dev server**

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000), upload a PDF/DOCX/TXT resume or paste text, and click **Get AI feedback**.

## How it works

1. The app extracts text from your file (or uses pasted text).
2. The `/api/analyze` route sends the resume to OpenAI with a structured JSON prompt.
3. The model returns a score, overall feedback, and annotations (exact quotes from your resume).
4. The UI highlights those quotes in the resume view and lists detailed notes in the sidebar.

## Deployment

### Vercel (recommended)

GitHub Pages cannot run the API route (no server). **Vercel** is the easiest fit:

1. Push this repo to GitHub.
2. Import the project at [vercel.com](https://vercel.com).
3. Add environment variables in project settings: `OPENAI_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your production URL), `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. In Google Cloud, add redirect URI `https://your-domain.com/api/auth/callback/google`.
4. Deploy.

### GitHub Pages

Static export will **not** include AI analysis unless you host the API elsewhere. Use Vercel or another platform with serverless/Node support instead.

## Supported files

- PDF (`.pdf`)
- Word (`.docx`)
- Plain text (`.txt`)
- Paste resume text directly

Max file size: **5 MB**.

## Rate limits & sign-in

- **Without signing in:** unlimited analyses. After your first run, a prompt invites you to sign in for additional features.
- **After signing in with Google:** up to **50 analyses per day** per account (configurable via `RATE_LIMIT_PER_DAY`).

Counts are stored in `.data/rate-limits.json` locally. On serverless hosts (e.g. Vercel), limits apply per instance and may reset on cold starts — upgrade to Redis/KV for strict production limits.

## Saved scans (signed in)

When signed in with Google, each analysis is saved automatically (feedback, extracted text, and original file). Use the **Your scans** panel to reopen any past result.

Data is stored under `.data/scans/` locally. For production on Vercel, use persistent storage (database or blob store) — see `DEPLOY.md`.

## Cost note

Each analysis calls the OpenAI API (default model: `gpt-4o-mini`). Typical cost is a few cents per resume depending on length.
