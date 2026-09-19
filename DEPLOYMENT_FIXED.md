# Deployment notes

## Frontend Render
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com` (no trailing slash)

## Backend Render
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Required: `DATABASE_URL` using `postgresql+psycopg://...`
- Required: `SECRET_KEY`

## Important
This patch fixes API URL normalization, the document source-download filename mismatch, the crypto-status route ordering, the favicon, and SPA routing.

The original project still uses local filesystem storage for uploaded/decrypted documents. For durable production document storage on Render, use a persistent disk or object storage (S3-compatible storage, etc.).
