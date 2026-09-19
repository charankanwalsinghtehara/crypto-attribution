"""
Key Encapsulation Mechanism using NIST ML-KEM (Kyber) when available.

Falls back to a simple ECDH-style shared secret derivation for demos.
"""

from __future__ import annotations
import os
import hashlib
from typing import Tuple

HAS_REAL_PQ = False
_pq_impl = None

try:
    from pqcrypto.kem import ml_kem_768 as kyber
    HAS_REAL_PQ = True
    _pq_impl = "pqcrypto"
except ImportError:
    pass

from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def generate_kyber_keypair() -> Tuple[str, str]:
    """Returns (public_key_hex, private_key_hex)"""
    if HAS_REAL_PQ and _pq_impl == "pqcrypto":
        pk, sk = kyber.generate_keypair()
        return pk.hex(), sk.hex()

    # ---- FALLBACK (X25519) ----
    private_key = x25519.X25519PrivateKey.generate()
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


def kyber_encapsulate(public_key_hex: str) -> Tuple[str, str]:
    """
    Returns (ciphertext_hex, shared_secret_hex)
    """
    if HAS_REAL_PQ and _pq_impl == "pqcrypto":
        pk = bytes.fromhex(public_key_hex)
        ct, ss = kyber.encapsulate(pk)
        return ct.hex(), ss.hex()

    # ---- FALLBACK ----
    # Simulate encapsulation with ephemeral X25519
    ephemeral = x25519.X25519PrivateKey.generate()
    peer_pk = x25519.X25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
    shared = ephemeral.exchange(peer_pk)
    # Derive 32-byte secret
    derived = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"crypto-attribution-kem",
    ).derive(shared)
    # Ciphertext = ephemeral public key
    eph_pk = ephemeral.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return eph_pk.hex(), derived.hex()


def kyber_decapsulate(private_key_hex: str, ciphertext_hex: str) -> str:
    """Returns shared_secret_hex"""
    if HAS_REAL_PQ and _pq_impl == "pqcrypto":
        sk = bytes.fromhex(private_key_hex)
        ct = bytes.fromhex(ciphertext_hex)
        ss = kyber.decapsulate(sk, ct)
        return ss.hex()

    # ---- FALLBACK ----
    sk = x25519.X25519PrivateKey.from_private_bytes(bytes.fromhex(private_key_hex))
    eph_pk = x25519.X25519PublicKey.from_public_bytes(bytes.fromhex(ciphertext_hex))
    shared = sk.exchange(eph_pk)
    derived = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"crypto-attribution-kem",
    ).derive(shared)
    return derived.hex()


def is_using_real_pq() -> bool:
    return HAS_REAL_PQ
