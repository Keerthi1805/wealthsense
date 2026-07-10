from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel
import hashlib

from backend.db.session import get_db
from backend.db.models import Transaction, User, Account, TransactionType
from backend.api.routes.auth import get_current_user

router = APIRouter()


class TransactionOut(BaseModel):
    id: str
    account_id: str
    date: datetime
    description: str
    amount: float
    transaction_type: str
    merchant: Optional[str]
    category: Optional[str]
    category_confidence: float
    is_recurring: bool
    tags: List[str]
    notes: Optional[str]
    class Config:
        from_attributes = True

class PaginatedTransactions(BaseModel):
    items: List[TransactionOut]
    total: int
    page: int
    page_size: int
    pages: int


@router.get("/", response_model=PaginatedTransactions)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    recurring_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if category:       q = q.filter(Transaction.category == category)
    if start_date:     q = q.filter(Transaction.date >= start_date)
    if end_date:       q = q.filter(Transaction.date <= end_date)
    if min_amount:     q = q.filter(Transaction.amount >= min_amount)
    if max_amount:     q = q.filter(Transaction.amount <= max_amount)
    if recurring_only: q = q.filter(Transaction.is_recurring == True)
    if search:
        q = q.filter(
            Transaction.description.ilike(f"%{search}%") |
            Transaction.merchant.ilike(f"%{search}%")
        )
    total = q.count()
    items = q.order_by(desc(Transaction.date)).offset((page-1)*page_size).limit(page_size).all()
    return PaginatedTransactions(items=items, total=total, page=page, page_size=page_size, pages=max(1, -(-total//page_size)))


@router.get("/summary/by-category")
async def by_category(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction.category, func.sum(Transaction.amount).label("total"), func.count(Transaction.id).label("count")).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == TransactionType.DEBIT,
    )
    if start_date: q = q.filter(Transaction.date >= start_date)
    if end_date:   q = q.filter(Transaction.date <= end_date)
    rows = q.group_by(Transaction.category).order_by(desc("total")).all()
    return [{"category": r.category or "Uncategorized", "total": round(r.total, 2), "count": r.count} for r in rows]


@router.get("/{tx_id}", response_model=TransactionOut)
async def get_transaction(tx_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.patch("/{tx_id}", response_model=TransactionOut)
async def update_transaction(
    tx_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for k, v in payload.items():
        if hasattr(tx, k):
            setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{tx_id}", status_code=204)
async def delete_transaction(tx_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
