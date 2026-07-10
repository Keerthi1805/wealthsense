from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "WealthSense AI"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-32-chars!!"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/wealthsense"
    REDIS_URL: str = "redis://localhost:6379/0"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = 2048

    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "wealthsense-transactions"

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = "wealthsense-data"

    MLFLOW_TRACKING_URI: str = "http://localhost:5000"

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
