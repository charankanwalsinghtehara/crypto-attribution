# Crypto Attribution - Complete Fix Set

This build applies the complete authentication/authorization and deployment fixes in one package.

## Backend
- JWT authentication dependency added.
- `/users/me` added.
- `/users/crypto/status` moved before `/{user_id}`.
- Document upload is bound to the authenticated sender.
- At least one recipient is required.
- Document listing/details/recipient/source access is restricted to sender or assigned recipient.
- Source download requires authentication and uses the original file MIME type.
- Upload size limit defaults to 25 MB and can be changed with `MAX_UPLOAD_BYTES`.
- Decryption no longer accepts a client-supplied recipient ID; the JWT identity is authoritative.
- Decryption events use the authenticated recipient.

## Frontend
- Login and registration pages included.
- All application routes are protected.
- JWT is stored in localStorage and sent as `Authorization: Bearer ...`.
- Expired/invalid authentication clears the session.
- Sender is always the logged-in user.
- Recipient selection excludes the sender.
- Logout added.
- API base URL has trailing slashes normalized.
- Decryption no longer sends a recipient ID.

## Render
Backend:
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Frontend:
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

Environment:
- Backend: `DATABASE_URL`, `SECRET_KEY`
- Frontend: `VITE_API_BASE_URL=https://crypto-attribution.onrender.com`

Important limitation retained from the source architecture:
The current application stores uploaded bytes as the protected source and persists ML-KEM encapsulations, but it does not yet perform actual PDF content encryption with the encapsulated shared secret. This package does not falsely claim that feature is complete.
