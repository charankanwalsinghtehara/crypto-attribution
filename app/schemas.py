from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ---------- Auth / User ----------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[str] = None
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    dilithium_public_key: str
    kyber_public_key: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


# ---------- Documents ----------
class DocumentCreate(BaseModel):
    title: str
    recipient_ids: List[int] = []


class DocumentOut(BaseModel):
    id: int
    title: str
    filename: str
    sender_id: int
    original_content_hash: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Decrypt ----------
class DecryptResponse(BaseModel):
    status: str
    session_id: str
    watermark: str
    signature: str
    ledger_block_index: int
    ledger_hash: str
    download_url: str
    message: str


# ---------- Forensic ----------
class ForensicResult(BaseModel):
    identified_recipient_id: int
    username: str
    session_id: str
    watermark: str
    signature_valid: bool
    ledger_integrity: bool
    decryption_time: datetime
    verifiable_record: dict
    message: str
