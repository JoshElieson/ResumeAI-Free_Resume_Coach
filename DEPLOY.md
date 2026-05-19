# Deploy checklist

Before deploying to production:

- [ ] Confirm signed-in daily limits (`RATE_LIMIT_PER_DAY`) are appropriate for production
- [ ] Confirm Google OAuth redirect URIs include your production domain
- [ ] Set production env vars on Vercel (`NEXTAUTH_URL`, secrets, `OPENAI_API_KEY`, etc.)
- [ ] **Scan history** uses `.data/scans/` on disk (fine locally). For production on Vercel, move to blob storage or a database — serverless filesystem is not persistent across instances.
