from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.routers import auth

app = FastAPI(title=settings.app_name)

app.include_router(auth.router)


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    value = result.scalar()
    return {"status": "ok", "db_responded": value == 1}


@app.get("/")
async def root():
    return {"app": settings.app_name}