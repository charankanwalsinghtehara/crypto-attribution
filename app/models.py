import hashlib

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(200), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    dilithium_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    dilithium_private_key: Mapped[str] = mapped_column(Text, nullable=False)
    kyber_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    kyber_private_key: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    documents_sent = relationship("Document", back_populates="sender")
    decryption_events = relationship("DecryptionEvent", back_populates="recipient")
    document_recipients = relationship("DocumentRecipient", back_populates="recipient")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    filename: Mapped[str] = mapped_column(String(300), nullable=False)
    encrypted_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_content_hash: Mapped[str | None] = mapped_column(String(128))
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", back_populates="documents_sent")
    recipients = relationship(
        "DocumentRecipient", back_populates="document", cascade="all, delete-orphan"
    )
    decryption_events = relationship("DecryptionEvent", back_populates="document")


class DocumentRecipient(Base):
    __tablename__ = "document_recipients"
    __table_args__ = (
        UniqueConstraint("document_id", "recipient_id", name="uq_document_recipient"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    encapsulated_key: Mapped[str | None] = mapped_column(Text)

    document = relationship("Document", back_populates="recipients")
    recipient = relationship("User", back_populates="document_recipients")


class DecryptionEvent(Base):
    __tablename__ = "decryption_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), nullable=False, index=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    watermark_payload: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    signature: Mapped[str] = mapped_column(Text, nullable=False)
    decrypted_path: Mapped[str | None] = mapped_column(String(500))
    timestamp: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="decryption_events")
    recipient = relationship("User", back_populates="decryption_events")


class LedgerBlock(Base):
    __tablename__ = "ledger_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    index: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    previous_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    data: Mapped[str] = mapped_column(Text, nullable=False)
    nonce: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)

    def calculate_hash(self) -> str:
        payload = (
            f"{self.index}"
            f"{self.previous_hash}"
            f"{self.timestamp.isoformat() if self.timestamp else ''}"
            f"{self.data}"
            f"{self.nonce}"
        )
        return hashlib.sha3_256(payload.encode("utf-8")).hexdigest()
