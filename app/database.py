from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

if not settings.DATABASE_URL.startswith("postgresql+psycopg://"):
    raise RuntimeError(
        "PostgreSQL is required. DATABASE_URL must start with "
        "postgresql+psycopg://"
    )

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> None:
    """Fail startup early if PostgreSQL cannot be reached."""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
