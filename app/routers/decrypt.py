from datetime import datetime, timezone
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.ledger.chain import mine_block
from app.models import DecryptionEvent, Document, DocumentRecipient, User
from app.schemas import DecryptResponse
from app.crypto.pq_sign import dilithium_sign
from app.watermark.forensic import embed_invisible_watermark, generate_session_watermark

router = APIRouter(prefix="/decrypt", tags=["Decrypt & Watermark"])
settings = get_settings()


@router.get("/events")
def list_decryption_events(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(DecryptionEvent).filter(DecryptionEvent.recipient_id == user.id).order_by(DecryptionEvent.id.desc()).all()
    return [
        {
            "id": e.id,
            "document_id": e.document_id,
            "recipient_id": e.recipient_id,
            "session_id": e.session_id,
            "watermark": e.watermark_payload,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "decrypted_path": e.decrypted_path,
        }
        for e in events
    ]


@router.post("/{document_id}", response_model=DecryptResponse)
def decrypt_document(document_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    recipient = user
    recipient_id = user.id

    allowed = (
        db.query(DocumentRecipient)
        .filter(
            DocumentRecipient.document_id == document_id,
            DocumentRecipient.recipient_id == recipient_id,
        )
        .first()
    )
    if not allowed:
        raise HTTPException(403, "Your account is not an authorised recipient for this document")

    # Existing database rows may contain an absolute or project-relative path.
    from pathlib import Path
    source = Path(doc.encrypted_path)
    if not source.is_absolute():
        source = (settings.upload_path / source.name).resolve()
    else:
        source = source.resolve()
    if not source.is_file():
        raise HTTPException(404, "Stored document file not found")

    session_id = str(uuid.uuid4())
    watermark = generate_session_watermark(recipient_id, document_id)
    settings.decrypted_path.mkdir(parents=True, exist_ok=True)
    out_name = f"decrypted_doc{document_id}_user{recipient_id}_{session_id[:8]}{source.suffix.lower() or '.bin'}"
    out_path = settings.decrypted_path / out_name

    # This project currently demonstrates provenance/watermarking. The stored
    # source is not encrypted at rest; this endpoint creates the recipient copy.
    embed_invisible_watermark(str(source), str(out_path), watermark)

    timestamp = datetime.now(timezone.utc)
    record = {
        "session_id": session_id,
        "document_id": document_id,
        "recipient_id": recipient_id,
        "watermark": watermark,
        "timestamp": timestamp.isoformat(),
        "content_hash": doc.original_content_hash,
        "filename": doc.filename,
    }
    message = json.dumps(record, sort_keys=True).encode("utf-8")
    signature = dilithium_sign(recipient.dilithium_private_key, message)

    try:
        event = DecryptionEvent(
            document_id=document_id,
            recipient_id=recipient_id,
            session_id=session_id,
            watermark_payload=watermark,
            signature=signature,
            decrypted_path=str(out_path),
            timestamp=timestamp,
        )
        db.add(event)
        db.flush()

        block = mine_block(db, {**record, "signature": signature})
        db.commit()
    except Exception:
        db.rollback()
        out_path.unlink(missing_ok=True)
        raise

    return DecryptResponse(
        status="success",
        session_id=session_id,
        watermark=watermark,
        signature=signature,
        ledger_block_index=block.index,
        ledger_hash=block.current_hash,
        download_url=f"/files/decrypted/{out_name}",
        message="Recipient copy created, watermarked, signed, and committed to the PostgreSQL-backed ledger.",
    )
