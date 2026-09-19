from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
import tempfile
import os
import json

from app.database import get_db
from app.dependencies import get_current_user
from app.models import DecryptionEvent, User, Document
from app.schemas import ForensicResult
from app.watermark.forensic import extract_watermark
from app.crypto.pq_sign import dilithium_verify
from app.ledger.chain import verify_chain, get_block_by_watermark

router = APIRouter(prefix="/forensic", tags=["Forensic Attribution"])


@router.post("/identify", response_model=ForensicResult)
async def identify_leaker(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Given a leaked copy of a distributed document:
    1. Extract the embedded forensic watermark.
    2. Look it up in the immutable ledger.
    3. Verify the recipient’s Dilithium signature.
    4. Return a cryptographically verifiable attribution record.
    """
    suffix = os.path.splitext(file.filename or "leaked.pdf")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        watermark = extract_watermark(tmp_path)
        if not watermark:
            raise HTTPException(
                status_code=400,
                detail="No forensic watermark found in the uploaded file.",
            )

        # Lookup in DecryptionEvent table
        event = (
            db.query(DecryptionEvent)
            .filter(DecryptionEvent.watermark_payload == watermark)
            .first()
        )
        if not event:
            # Also try the ledger directly
            block = get_block_by_watermark(db, watermark)
            if not block:
                raise HTTPException(
                    status_code=404,
                    detail="Watermark not present in any decryption event or ledger block.",
                )
            # Reconstruct from ledger data
            payload = json.loads(block.data)
            recipient_id = payload.get("recipient_id")
            recipient = db.query(User).filter(User.id == recipient_id).first()
            if not recipient:
                raise HTTPException(404, "Recipient referenced by ledger not found")
            return ForensicResult(
                identified_recipient_id=recipient_id,
                username=recipient.username,
                session_id=payload.get("session_id", "unknown"),
                watermark=watermark,
                signature_valid=False,  # we only have ledger data
                ledger_integrity=verify_chain(db),
                decryption_time=datetime.fromisoformat(
                    payload["timestamp"].replace("Z", "+00:00")
                ) if payload.get("timestamp") else datetime.utcnow(),
                verifiable_record={
                    "source": "ledger_only",
                    "block_index": block.index,
                    "block_hash": block.current_hash,
                    "payload": payload,
                },
                message="Attribution recovered from immutable ledger.",
            )

        recipient = db.query(User).filter(User.id == event.recipient_id).first()
        if not recipient:
            raise HTTPException(404, "Recipient not found")

        # Rebuild the exact message that was signed
        doc = db.query(Document).filter(Document.id == event.document_id).first()
        record = {
            "session_id": event.session_id,
            "document_id": event.document_id,
            "recipient_id": event.recipient_id,
            "watermark": event.watermark_payload,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None,
            "content_hash": doc.original_content_hash if doc else None,
            "filename": doc.filename if doc else None,
        }
        # Ensure deterministic order
        message = json.dumps(record, sort_keys=True).encode("utf-8")

        sig_valid = dilithium_verify(
            recipient.dilithium_public_key,
            message,
            event.signature,
        )
        chain_ok = verify_chain(db)

        return ForensicResult(
            identified_recipient_id=event.recipient_id,
            username=recipient.username,
            session_id=event.session_id,
            watermark=watermark,
            signature_valid=sig_valid,
            ledger_integrity=chain_ok,
            decryption_time=event.timestamp,
            verifiable_record={
                "event_id": event.id,
                "signature": event.signature,
                "public_key": recipient.dilithium_public_key,
                "document_id": event.document_id,
                "decrypted_path": event.decrypted_path,
            },
            message=(
                "Attribution successful. "
                f"Signature valid={sig_valid}, Ledger intact={chain_ok}."
            ),
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@router.get("/ledger/verify")
def verify_ledger_integrity(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ok = verify_chain(db)
    return {
        "ledger_integrity": ok,
        "message": "Chain is intact" if ok else "TAMPERING DETECTED – hash chain broken",
    }


@router.get("/ledger/blocks")
def list_ledger_blocks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models import LedgerBlock
    blocks = db.query(LedgerBlock).order_by(LedgerBlock.index.asc()).all()
    return [
        {
            "index": b.index,
            "previous_hash": b.previous_hash,
            "current_hash": b.current_hash,
            "nonce": b.nonce,
            "timestamp": b.timestamp.isoformat() if b.timestamp else None,
            "data_preview": b.data[:200] + ("..." if len(b.data) > 200 else ""),
        }
        for b in blocks
    ]
