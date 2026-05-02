import structlog
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.rate_limit import limiter
from app.database import get_db
from app.routers import auth, documents, search
from app.services.storage import check_bucket


configure_logging(settings.log_level)
logger = structlog.get_logger()


app = FastAPI(title=settings.app_name)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestContextMiddleware)

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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled exception", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(search.router)


@app.on_event("startup")
async def startup_event():
    logger.info(
        "api starting",
        environment=settings.environment,
        log_level=settings.log_level,
    )


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