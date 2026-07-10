from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, Integer, ForeignKey, Enum, JSON, Index
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid, enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class TransactionType(str, enum.Enum):
    DEBIT  = "debit"
    CREDIT = "credit"

class AnomalyStatus(str, enum.Enum):
    PENDING   = "pending"
    CONFIRMED = "confirmed"
    DISMISSED = "dismissed"

class ReportStatus(str, enum.Enum):
    QUEUED     = "queued"
    GENERATING = "generating"
    READY      = "ready"
    FAILED     = "failed"


class User(Base):
    __tablename__ = "users"
    id              = Column(String, primary_key=True, default=gen_uuid)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(255))
    is_active       = Column(Boolean, default=True)
    plan            = Column(String(50), default="free")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    accounts        = relationship("Account",     back_populates="user", cascade="all, delete-orphan")
    transactions    = relationship("Transaction", back_populates="user")
    reports         = relationship("Report",      back_populates="user")
    chat_messages   = relationship("ChatMessage", back_populates="user")


class Account(Base):
    __tablename__ = "accounts"
    id           = Column(String, primary_key=True, default=gen_uuid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    institution  = Column(String(255), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(100))
    currency     = Column(String(10), default="USD")
    balance      = Column(Float, default=0.0)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    user         = relationship("User",        back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")


class Transaction(Base):
    __tablename__ = "transactions"
    id                  = Column(String, primary_key=True, default=gen_uuid)
    user_id             = Column(String, ForeignKey("users.id"),    nullable=False)
    account_id          = Column(String, ForeignKey("accounts.id"), nullable=False)
    date                = Column(DateTime(timezone=True), nullable=False, index=True)
    description         = Column(Text, nullable=False)
    amount              = Column(Float, nullable=False)
    transaction_type    = Column(Enum(TransactionType), nullable=False)
    merchant            = Column(String(255))
    category            = Column(String(100), index=True)
    category_confidence = Column(Float, default=0.0)
    is_recurring        = Column(Boolean, default=False)
    fingerprint         = Column(String(64), unique=True, index=True)
    raw_data            = Column(JSON)
    notes               = Column(Text)
    tags                = Column(JSON, default=list)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    user                = relationship("User",    back_populates="transactions")
    account             = relationship("Account", back_populates="transactions")
    anomaly             = relationship("Anomaly", back_populates="transaction", uselist=False)
    __table_args__ = (Index("ix_tx_user_date", "user_id", "date"),)


class Anomaly(Base):
    __tablename__ = "anomalies"
    id             = Column(String, primary_key=True, default=gen_uuid)
    transaction_id = Column(String, ForeignKey("transactions.id"), unique=True)
    anomaly_score  = Column(Float, nullable=False)
    anomaly_type   = Column(String(100))
    description    = Column(Text)
    status         = Column(Enum(AnomalyStatus), default=AnomalyStatus.PENDING)
    detected_at    = Column(DateTime(timezone=True), server_default=func.now())
    transaction    = relationship("Transaction", back_populates="anomaly")


class Forecast(Base):
    __tablename__ = "forecasts"
    id               = Column(String, primary_key=True, default=gen_uuid)
    user_id          = Column(String, ForeignKey("users.id"), nullable=False)
    category         = Column(String(100), nullable=False)
    period_start     = Column(DateTime(timezone=True), nullable=False)
    period_end       = Column(DateTime(timezone=True), nullable=False)
    predicted_amount = Column(Float, nullable=False)
    lower_bound      = Column(Float)
    upper_bound      = Column(Float)
    model_version    = Column(String(50))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "reports"
    id           = Column(String, primary_key=True, default=gen_uuid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    title        = Column(String(500))
    period_month = Column(Integer, nullable=False)
    period_year  = Column(Integer, nullable=False)
    status       = Column(Enum(ReportStatus), default=ReportStatus.QUEUED)
    summary_json = Column(JSON)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    user         = relationship("User", back_populates="reports")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id         = Column(String, primary_key=True, default=gen_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    role       = Column(String(20), nullable=False)
    content    = Column(Text, nullable=False)
    sources    = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user       = relationship("User", back_populates="chat_messages")
