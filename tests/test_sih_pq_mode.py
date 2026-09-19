def test_pq_modules_require_real_nist_algorithms():
    from app.crypto import pq_kem, pq_sign

    assert pq_kem.is_using_real_pq(), "ML-KEM-768 is required for SIH26237"
    assert pq_sign.is_using_real_pq(), "ML-DSA-65 is required for SIH26237"
