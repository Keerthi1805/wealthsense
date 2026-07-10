from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging
import uvicorn

from backend.api.routes import transactions, auth, advisor, reports, analytics, ingestion
from backend.core.config import settings
from backend.db.session import engine
from backend.db import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("WealthSense AI starting...")
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database ready")
    yield
    logger.info("WealthSense AI shutting down...")


app = FastAPI(
    title="WealthSense AI",
    description="Intelligent Personal Finance Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router,         prefix="/api/v1/auth",        tags=["Auth"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(ingestion.router,    prefix="/api/v1/ingest",       tags=["Ingestion"])
app.include_router(advisor.router,      prefix="/api/v1/advisor",      tags=["Advisor"])
app.include_router(analytics.router,    prefix="/api/v1/analytics",    tags=["Analytics"])
app.include_router(reports.router,      prefix="/api/v1/reports",      tags=["Reports"])


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
