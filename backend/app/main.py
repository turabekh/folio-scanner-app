from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.routers import auth, documents
from app.services.storage import check_bucket

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.localhost",
        "http://localhost:9000",
        "http://192.168.1.104:9000",
        "http://192.168.1.104:8000",
        "capacitor://localhost",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    value = result.scalar()
    return {"status": "ok", "db_responded": value == 1}


@app.get("/health/storage")
async def health_storage():
    ok = await check_bucket()
    return {"status": "ok", "bucket_exists": ok}


@app.get("/")
async def root():
    return {"app": settings.app_name}