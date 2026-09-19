from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import hashlib
import hmac
import os

from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.crypto.pq_kem import generate_kyber_keypair
from app.crypto.pq_sign import generate_dilithium_keypair
from app.models import User

settings = get_settings()

PASSWORD_ITERATIONS = 310_000
PASSWORD_PREFIX = "pbkdf2_sha256"


def _derive_password_hash(password: str, salt: bytes, iterations: int = PASSWORD_ITERATIONS) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")

    salt = os.urandom(16)
    digest = _derive_password_hash(password, salt)
    return (
        f"{PASSWORD_PREFIX}${PASSWORD_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode().rstrip('=')}$"
        f"{base64.urlsafe_b64encode(digest).decode().rstrip('=')}"
    )


def _verify_pbkdf2(password: str, stored: str) -> bool:
    try:
        prefix, iterations_text, salt_text, digest_text = stored.split("$", 3)
        if prefix != PASSWORD_PREFIX:
            return False

        iterations = int(iterations_text)
        salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
        expected = base64.urlsafe_b64decode(digest_text + "=" * (-len(digest_text) % 4))
        actual = _derive_password_hash(password, salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def verify_password(plain: str, hashed: str) -> bool:
    # New accounts use PBKDF2-SHA256.
    if hashed.startswith(f"{PASSWORD_PREFIX}$"):
        return _verify_pbkdf2(plain, hashed)

    # Compatibility for accounts created by the older bcrypt implementation.
    try:
        from passlib.context import CryptContext
        legacy_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return legacy_context.verify(plain, hashed)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def register_user(
    db: Session,
    username: str,
    password: str,
    email: Optional[str] = None,
) -> User:
    username = username.strip()
    email = email.strip() if email else None

    if len(username) < 3:
        raise ValueError("Username must be at least 3 characters")

    if not password:
        raise ValueError("Password cannot be empty")

    if db.query(User).filter(User.username == username).first():
        raise ValueError("Username already registered")

    if email and db.query(User).filter(User.email == email).first():
        raise ValueError("Email already registered")

    dil_pk, dil_sk = generate_dilithium_keypair()
    kyber_pk, kyber_sk = generate_kyber_keypair()

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        dilithium_public_key=dil_pk,
        dilithium_private_key=dil_sk,
        kyber_public_key=kyber_pk,
        kyber_private_key=kyber_sk,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Username or email is already registered") from exc

    db.refresh(user)
    return user


def authenticate_user(
    db: Session,
    username: str,
    password: str,
) -> Optional[User]:
    user = db.query(User).filter(User.username == username.strip()).first()
    if not user:
        return None

    return user if verify_password(password, user.hashed_password) else None
