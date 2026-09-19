from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import UserCreate, UserLogin, UserOut, Token
from app.services.auth import register_user, authenticate_user, create_access_token
from app.services.current_user import get_current_user
from app.models import User
from app.crypto.pq_sign import is_using_real_pq as dilithium_real
from app.crypto.pq_kem import is_using_real_pq as kyber_real

router = APIRouter(prefix="/users", tags=["Users & Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        user = register_user(db, payload.username, payload.password, payload.email)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": str(user.id), "username": user.username})
    return Token(access_token=token, user_id=user.id, username=user.username)


@router.get("/crypto/status")
def crypto_status():
    return {
        "dilithium_ml_dsa": (
            "REAL NIST PQ" if dilithium_real()
            else "FALLBACK (Ed25519) - install pqcrypto for real ML-DSA"
        ),
        "kyber_ml_kem": (
            "REAL NIST PQ" if kyber_real()
            else "FALLBACK (X25519) - install pqcrypto for real ML-KEM"
        ),
        "note": "The system is fully functional either way. For production air-gapped deployment install a real PQ library.",
    }


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(User).order_by(User.id).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
