"""
Digital signatures using NIST ML-DSA (Dilithium) when available.

The code first tries real post-quantum libraries (pqcrypto / quantcrypt).
If they are not installed it falls back to Ed25519 so the rest of the
system remains fully functional for development and demos.

Replace the fallback with a real ML-DSA implementation for production.
"""

from __future__ import annotations
import hashlib
from typing import Tuple

# ---------------------------------------------------------------------------
# Try real PQ libraries
# ---------------------------------------------------------------------------
HAS_REAL_PQ = False
_pq_impl = None

try:
    from pqcrypto.sign import ml_dsa_65 as dilithium
    HAS_REAL_PQ = True
    _pq_impl = "pqcrypto"
except ImportError:
    try:
        # Alternative package name variations
        from quantcrypt.dss import Dilithium
        HAS_REAL_PQ = True
        _pq_impl = "quantcrypt"
    except ImportError:
        pass

# Classical fallback (Ed25519) – clearly marked
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization


def generate_dilithium_keypair() -> Tuple[str, str]:
    """
    Returns (public_key_hex, private_key_hex)
    """
    if HAS_REAL_PQ and _pq_impl == "pqcrypto":
        pk, sk = dilithium.generate_keypair()
        return pk.hex(), sk.hex()

    # ---- FALLBACK (Ed25519) ----
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    sk_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pk_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return pk_bytes.hex(), sk_bytes.hex()


def dilithium_sign(private_key_hex: str, message: bytes) -> str:
    """Sign message → hex signature"""
    if HAS_REAL_PQ and _pq_impl == "pqcrypto":
        sk = bytes.fromhex(private_key_hex)
        sig = dilithium.sign(sk, message)
        return sig.hex()

    # ---- FALLBACK ----
    sk = ed25519.Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private_key_hex))
    return sk.sign(message).hex()


def dilithium_verify(public_key_hex: str, message: bytes, signature_hex: str) -> bool:
    """Verify signature. Returns True if valid."""
    if HAS_REAL_PQ and _pq_impl == "pqcrypto":
        try:
            pk = bytes.fromhex(public_key_hex)
            sig = bytes.fromhex(signature_hex)
            dilithium.verify(pk, message, sig)
            return True
        except Exception:
            return False

    # ---- FALLBACK ----
    try:
        pk = ed25519.Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
        pk.verify(bytes.fromhex(signature_hex), message)
        return True
    except Exception:
        return False


def is_using_real_pq() -> bool:
    return HAS_REAL_PQ
