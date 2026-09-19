from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, SessionLocal, check_database_connection, engine
from app.ledger.chain import create_genesis
from app.models import Document, DecryptionEvent, DocumentRecipient, LedgerBlock, User  # noqa: F401
from app.services.current_user import get_current_user
from app.routers import decrypt, documents, forensic, users

settings = get_settings()
BASE_DIR = Path(__file__).resolve().parent.parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_database_connection()
    Base.metadata.create_all(bind=engine)
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.decrypted_path.mkdir(parents=True, exist_ok=True)

    with SessionLocal() as db:
        create_genesis(db)
        db.commit()

    print("=" * 60)
    print(" Crypto Attribution backend ready")
    print(" Database: PostgreSQL")
    print(" UI:       http://127.0.0.1:8000")
    print(" Swagger:  http://127.0.0.1:8000/docs")
    print("=" * 60)
    yield


app = FastAPI(
    title="Cryptographic Attribution & Immutable Decryption Provenance",
    description="PostgreSQL-backed offline document attribution and tamper-evident provenance system.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(documents.router)
app.include_router(decrypt.router)
app.include_router(forensic.router)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


def _safe_file_path(root: Path, filename: str) -> Path:
    candidate = (root / filename).resolve()
    root_resolved = root.resolve()
    if candidate.parent != root_resolved:
        raise HTTPException(400, "Invalid filename")
    return candidate


@app.get("/files/decrypted/{filename}")
def serve_decrypted(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    path = _safe_file_path(settings.decrypted_path, filename)
    if not path.is_file():
        raise HTTPException(404, "File not found")

    event = db.query(DecryptionEvent).filter(
        DecryptionEvent.decrypted_path == str(path)
    ).first()
    if not event or event.recipient_id != current_user.id:
        raise HTTPException(403, "You do not have access to this decrypted file")

    return FileResponse(path, filename=path.name)


@app.get("/files/uploads/{filename}")
def serve_upload(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    path = _safe_file_path(settings.upload_path, filename)
    if not path.is_file():
        raise HTTPException(404, "File not found")

    doc = db.query(Document).filter(Document.encrypted_path == str(path)).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    allowed = doc.sender_id == current_user.id or db.query(DocumentRecipient).filter(
        DocumentRecipient.document_id == doc.id,
        DocumentRecipient.recipient_id == current_user.id,
    ).first() is not None
    if not allowed:
        raise HTTPException(403, "You do not have access to this file")

    return FileResponse(path, filename=path.name)


@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})


@app.get("/health")
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "postgresql", "mode": "offline-airgapped"}
