# Cryptographic Attribution & Immutable Decryption Provenance

PostgreSQL-backed FastAPI application for document distribution, recipient-specific forensic watermarking, signed decryption events, and a local tamper-evident hash-chain ledger.

## PostgreSQL only

This version **requires PostgreSQL**. SQLite is intentionally not supported or used as a fallback.

### 1. Create the database in pgAdmin

Create a Login/Group Role:

- Name: `plainsec_user`
- Can login: Yes
- Set a password in the **Definition** tab

Create a database:

- Database: `plainsec_db`
- Owner: `plainsec_user`

The PostgreSQL server normally uses:

- Host: `localhost`
- Port: `5432`

The application creates its tables automatically on first startup.

### 2. Windows setup

Open PowerShell in this project directory:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

Open `.env` and replace `YOUR_PASSWORD` with the password you chose in pgAdmin. Also replace the `SECRET_KEY` placeholder with a long random value.

Example:

```env
DATABASE_URL=postgresql+psycopg://plainsec_user:YOUR_PASSWORD@localhost:5432/plainsec_db
SECRET_KEY=replace-with-a-long-random-secret
```

If the password contains special URL characters such as `@`, `:`, `/`, `#`, `%`, or `?`, URL-encode the password before putting it in `DATABASE_URL`.

### 3. Start

```powershell
.\run.bat
```

Or:

```powershell
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

- UI: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

The health endpoint confirms that the application is connected to PostgreSQL.

## Demo workflow

1. Register Alice and Bob from the web interface.
2. Sign in as Alice and upload a PDF; the signed-in account is automatically the sender. Add Bob as a recipient.
3. Sign in as Bob, open the authorised document, and create Bob's recipient copy. The backend takes the recipient identity from the JWT. The application creates a uniquely watermarked recipient copy, signs the event, and records it in PostgreSQL and the local ledger in one transaction.
4. Upload the resulting copy to **Forensic Attribution**.
5. The system extracts the watermark, finds the decryption event, verifies the recipient signature, and verifies the complete ledger chain.
6. Use **Verify Chain Integrity** to check the ledger independently.

## Important implementation note

The current application demonstrates the attribution/provenance layer. The uploaded source bytes are stored as the protected source and the decrypt endpoint creates the recipient copy with a forensic watermark. The ML-KEM/Kyber encapsulation is generated and stored per recipient, but a full content-encryption layer (for example AES-GCM using a properly derived per-document key) is a separate cryptographic feature and is not falsely represented here as already implemented.

## PostgreSQL design details

- SQLAlchemy 2.x + Psycopg 3
- PostgreSQL connection pre-ping and pooling
- Foreign keys and unique recipient constraints
- PostgreSQL transaction-scoped advisory locking for ledger appends
- Event + ledger block committed atomically
- Startup connection check
- No SQLite code path
- No SQLite database file is created

## Security notes

For a production deployment, private signing/KEM keys should not be stored as plaintext database columns. Use an HSM or another protected key store. The web application now requires JWT authentication for protected operations; sender and recipient identities are taken from the authenticated account rather than arbitrary browser-supplied user IDs.
