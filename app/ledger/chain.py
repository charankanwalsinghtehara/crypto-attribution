"""PostgreSQL-backed, tamper-evident local hash chain."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LedgerBlock

settings = get_settings()
# PostgreSQL advisory locks are transaction-scoped and serialize ledger appends.
_LEDGER_LOCK_KEY = 748392615


def _mine(block: LedgerBlock) -> None:
    target = "0" * settings.LEDGER_DIFFICULTY
    while True:
        candidate = block.calculate_hash()
        if candidate.startswith(target):
            block.current_hash = candidate
            return
        block.nonce += 1
        if block.nonce > 5_000_000:
            raise RuntimeError("PoW difficulty too high for local environment")


def create_genesis(db: Session) -> LedgerBlock:
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _LEDGER_LOCK_KEY})
    existing = db.query(LedgerBlock).filter(LedgerBlock.index == 0).first()
    if existing:
        return existing

    timestamp = datetime.now(timezone.utc)
    block = LedgerBlock(
        index=0,
        previous_hash="0" * 64,
        timestamp=timestamp,
        data=json.dumps(
            {
                "msg": "Genesis block - Offline PQ Cryptographic Attribution Ledger",
                "created": timestamp.isoformat(),
            },
            sort_keys=True,
        ),
        nonce=0,
        current_hash="",
    )
    _mine(block)
    db.add(block)
    db.flush()
    return block


def mine_block(db: Session, data: dict[str, Any]) -> LedgerBlock:
    """Append a block inside the caller's transaction."""
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _LEDGER_LOCK_KEY})

    last = db.query(LedgerBlock).order_by(LedgerBlock.index.desc()).first()
    if last is None:
        last = create_genesis(db)

    timestamp = datetime.now(timezone.utc)
    block = LedgerBlock(
        index=last.index + 1,
        previous_hash=last.current_hash,
        timestamp=timestamp,
        data=json.dumps(data, sort_keys=True, default=str),
        nonce=0,
        current_hash="",
    )
    _mine(block)
    db.add(block)
    db.flush()
    return block


def verify_chain(db: Session) -> bool:
    blocks = db.query(LedgerBlock).order_by(LedgerBlock.index.asc()).all()
    if not blocks:
        return True

    for position, block in enumerate(blocks):
        if block.current_hash != block.calculate_hash():
            return False
        if position == 0:
            if block.index != 0 or block.previous_hash != "0" * 64:
                return False
        else:
            previous = blocks[position - 1]
            if block.index != previous.index + 1:
                return False
            if block.previous_hash != previous.current_hash:
                return False
    return True


def get_block_by_watermark(db: Session, watermark: str) -> Optional[LedgerBlock]:
    blocks = db.query(LedgerBlock).order_by(LedgerBlock.index.desc()).all()
    for block in blocks:
        try:
            payload = json.loads(block.data)
            if payload.get("watermark") == watermark:
                return block
        except (TypeError, ValueError):
            continue
    return None
