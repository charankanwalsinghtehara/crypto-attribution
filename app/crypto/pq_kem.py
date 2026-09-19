"""
NIST-standardized ML-KEM implementation for SIH26237.

Production/SIH mode requires the real pqcrypto ML-KEM implementation.
No classical X25519 fallback is silently accepted.
"""
from __future__ import annotations

try:
    from pqcrypto.kem.ml_kem_768 import (
        generate_keypair,
        encrypt,
        decrypt,
        PUBLIC_KEY_SIZE,
        SECRET_KEY_SIZE,
        CIPHERTEXT_SIZE,
        PLAINTEXT_SIZE,
    )
    REAL_PQ = True
except ImportError as exc:
    REAL_PQ = False
    _IMPORT_ERROR = exc

    def _missing(*args, **kwargs):
        raise RuntimeError(
            "NIST ML-KEM-768 is required for SIH26237. "
            "Install the 'pqcrypto' package before starting the application."
        ) from _IMPORT_ERROR

    generate_keypair = _missing
    encrypt = _missing
    decrypt = _missing
    PUBLIC_KEY_SIZE = SECRET_KEY_SIZE = CIPHERTEXT_SIZE = PLAINTEXT_SIZE = 0


def is_using_real_pq() -> bool:
    return REAL_PQ


def generate_kyber_keypair():
    return generate_keypair()


def encapsulate(public_key: bytes):
    return encrypt(public_key)


def decapsulate(ciphertext: bytes, private_key: bytes):
    return decrypt(private_key, ciphertext)
