from pathlib import Path
import hashlib
import mimetypes
import os
import uuid

from fastapi.responses import FileResponse
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.crypto.pq_kem import kyber_encapsulate
from app.database import get_db
from app.models import Document, DocumentRecipient, User
from app.schemas import DocumentOut
from app.services.current_user import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])
settings = get_settings()

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))


def _sha3_file(path: str) -> str:
    h = hashlib.sha3_256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _can_access(doc: Document, user: User, db: Session) -> bool:
    if doc.sender_id == user.id:
        return True
    return (
        db.query(DocumentRecipient)
        .filter(
            DocumentRecipient.document_id == doc.id,
            DocumentRecipient.recipient_id == user.id,
        )
        .first()
        is not None
    )


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    title: str = Form(...),
    sender_id: int = Form(...),
    recipient_ids: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sender must be the logged-in user")

    if not title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    try:
        raw_ids = [x.strip() for x in recipient_ids.split(",") if x.strip()]
        rec_ids = list(dict.fromkeys(int(x) for x in raw_ids))
    except ValueError:
        raise HTTPException(status_code=400, detail="recipient_ids must be comma-separated integers")

    if not rec_ids:
        raise HTTPException(status_code=400, detail="At least one recipient is required")
    if sender_id in rec_ids:
        raise HTTPException(status_code=400, detail="Sender should not be listed as a recipient")

    recipients = db.query(User).filter(User.id.in_(rec_ids)).all()
    found_ids = {u.id for u in recipients}
    missing = [rid for rid in rec_ids if rid not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"Recipient(s) not found: {missing}")

    settings.upload_path.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix.lower() or ".bin"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = settings.upload_path / safe_name

    total = 0
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit",
                    )
                out.write(chunk)

        if total == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        content_hash = _sha3_file(str(dest))
        doc = Document(
            title=title.strip(),
            filename=Path(file.filename).name,
            encrypted_path=str(dest),
            original_content_hash=content_hash,
            sender_id=sender_id,
        )
        db.add(doc)
        db.flush()

        for recipient in recipients:
            ct_hex, _shared_secret = kyber_encapsulate(recipient.kyber_public_key)
            db.add(
                DocumentRecipient(
                    document_id=doc.id,
                    recipient_id=recipient.id,
                    encapsulated_key=ct_hex,
                )
            )

        db.commit()
        db.refresh(doc)
        return doc
    except HTTPException:
        db.rollback()
        dest.unlink(missing_ok=True)
        raise
    except Exception as exc:
        db.rollback()
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Document upload failed: {exc}") from exc


@router.get("/", response_model=list[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = db.query(Document).filter(
        (Document.sender_id == current_user.id)
        | Document.recipients.any(User.id == current_user.id)
    ).order_by(Document.id.desc()).all()
    return docs


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not _can_access(doc, current_user, db):
        raise HTTPException(status_code=403, detail="You do not have access to this document")
    return doc


@router.get("/{document_id}/recipients")
def get_recipients(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not _can_access(doc, current_user, db):
        raise HTTPException(status_code=403, detail="You do not have access to this document")

    links = (
        db.query(DocumentRecipient)
        .filter(DocumentRecipient.document_id == document_id)
        .order_by(DocumentRecipient.id.asc())
        .all()
    )
    return [
        {
            "recipient_id": link.recipient_id,
            "username": link.recipient.username if link.recipient else None,
            "has_encapsulated_key": bool(link.encapsulated_key),
        }
        for link in links
    ]


@router.get("/{document_id}/source")
def download_source(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not _can_access(doc, current_user, db):
        raise HTTPException(status_code=403, detail="You do not have access to this document")

    path = Path(doc.encrypted_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored document file not found")

    media_type = mimetypes.guess_type(doc.filename)[0] or "application/octet-stream"
    return FileResponse(path=str(path), filename=doc.filename, media_type=media_type)
