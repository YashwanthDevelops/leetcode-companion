from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to sqlite for ease of development if no URL provided yet, or just warn
    # For now, we'll try to use the env var, and if missing, it might crash or we can default to a local sqlite
    print("WARNING: DATABASE_URL not found in .env. Using defaults or failing.")
    # Defaulting to sqlite for safety if they haven't set it up yet, so the app doesn't crash immediately
    # DATABASE_URL = "sqlite+aiosqlite:///./sql_app.db" # Optional fallback
    pass

# Handle supabase weirdness with 'postgres://' vs 'postgresql://' if needed
# Ensure we use an async driver (asyncpg)
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not "asyncpg" in DATABASE_URL:
         DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=True) if DATABASE_URL else None

# Async Session Factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
