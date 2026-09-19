# SIH26237 Offline / Air-Gapped Deployment

This package is designed for deployment without public cloud KMS or public
blockchain networks.

## Runtime

Run the FastAPI backend and React frontend on the secured local network.
PostgreSQL is local to the environment.

Required environment variables:

- DATABASE_URL
- SECRET_KEY
- REQUIRE_REAL_PQ=true

The application must have the `pqcrypto` package installed from an approved
offline wheel/package repository before the environment is disconnected.

## Security model

- ML-KEM-768: NIST FIPS 203 key encapsulation.
- ML-DSA-65: NIST FIPS 204 digital signatures.
- Recipient/session-specific forensic watermark.
- Signed decryption record.
- Tamper-evident ledger.
- No public blockchain.
- No cloud KMS dependency.

## Important implementation note

The ledger included in this project is a local hash-chained audit ledger. It is
tamper-evident, but a single PostgreSQL instance is not equivalent to a
multi-node distributed consensus network. For a strict DLT deployment, run the
ledger component as multiple independently administered permissioned nodes and
replicate/consensus-validate signed records between them.
