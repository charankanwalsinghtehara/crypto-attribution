import pytest

def test_project_imports():
    from app.main import app
    paths = {r.path for r in app.routes}
    assert "/health" in paths
    assert "/forensic/ledger/blocks" in paths
    assert "/forensic/ledger/verify" in paths
    assert "/users/" in paths
    assert "/users/crypto/status" in paths
