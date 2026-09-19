"""
NIST-standardized ML-DSA implementation for SIH26237.

Production/SIH mode requires the real pqcrypto ML-DSA implementation.
No classical Ed25519 fallback is silently accepted.
"""
from __future__ import annotations

try:
    from pqcrypto.sign.ml_dsa_65 import (
        generate_keypair,
        sign,
        verify,
        PUBLIC_KEY_SIZE,
        SECRET_KEY_SIZE,
        SIGNATURE_SIZE,
    )
    REAL_PQ = True
except ImportError as exc:
    REAL_PQ = False
    _IMPORT_ERROR = exc

    def _missing(*args, **kwargs):
        raise RuntimeError(
            "NIST ML-DSA-65 is required for SIH26237. "
            "Install the 'pqcrypto' package before starting the application."
        ) from _IMPORT_ERROR

    generate_keypair = _missing
    sign = _missing
    verify = _missing
    PUBLIC_KEY_SIZE = SECRET_KEY_SIZE = SIGNATURE_SIZE = 0


def is_using_real_pq() -> bool:
    return REAL_PQ


def generate_dilithium_keypair():
    return generate_keypair()


def sign_message(private_key: bytes, message: bytes) -> bytes:
    return sign(message, private_key)


def verify_signature(public_key: bytes, message: bytes, signature: bytes) -> bool:
    try:
        verify(public_key, message, signature)
        return True
    except Exception:
        return False
