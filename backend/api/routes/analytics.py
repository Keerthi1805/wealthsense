from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

from backend.db.session import get_db
from backend.db.models import User, Transaction, Anomaly, Forecast, TransactionType, AnomalyStatus
from backend.api.routes.auth import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now         = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month  = (month_start - timedelta(days=1)).replace(day=1)
    ytd_start   = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    uid         = current_user.id

    def sum_amount(start, end=None, tx_type=TransactionType.DEBIT):
        q = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == uid,
            Transaction.transaction_type == tx_type,
            Transaction.date >= start,
        )
        if end:
            q = q.filter(Transaction.date < end)
        return round(q.scalar() or 0.0, 2)

    this_spend  = sum_amount(month_start)
    last_spend  = sum_amount(last_month, month_start)
    this_income = sum_amount(month_start, tx_type=TransactionType.CREDIT)
    ytd_spend   = sum_amount(ytd_start)
    ytd_income  = sum_amount(ytd_start, tx_type=TransactionType.CREDIT)
    savings_rate = round((ytd_income - ytd_spend) / ytd_income * 100, 1) if ytd_income > 0 else 0
    mom_pct      = round((this_spend - last_spend) / last_spend * 100, 1) if last_spend else 0

    # Categories
    cat_rows = db.query(Transaction.category, func.sum(Transaction.amount).label("t")).filter(
        Transaction.user_id == uid,
        Transaction.transaction_type == TransactionType.DEBIT,
        Transaction.date >= month_start,
    ).group_by(Transaction.category).order_by(desc("t")).limit(8).all()

    # Monthly trend
    monthly_trend = []
    for i in range(11, -1, -1):
        s = (now - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0)
        e = (s + timedelta(days=32)).replace(day=1)
        sp = sum_amount(s, e)
        inc = sum_amount(s, e, TransactionType.CREDIT)
        monthly_trend.append({"month": s.strftime("%b %Y"), "spend": sp, "income": inc, "savings": round(inc-sp,2)})

    # Top merchants
    mer_rows = db.query(Transaction.merchant, func.sum(Transaction.amount).label("t")).filter(
        Transaction.user_id == uid,
        Transaction.transaction_type == TransactionType.DEBIT,
        Transaction.date >= month_start,
        Transaction.merchant.isnot(None),
    ).group_by(Transaction.merchant).order_by(desc("t")).limit(5).all()

    # Anomalies
    anm_rows = db.query(Anomaly, Transaction).join(Transaction).filter(
        Transaction.user_id == uid,
        Anomaly.status == AnomalyStatus.PENDING,
    ).order_by(Anomaly.anomaly_score.desc()).limit(3).all()

    # Forecasts
    fc_rows = db.query(Forecast).filter(Forecast.user_id == uid, Forecast.period_start >= now).limit(6).all()

    return {
        "kpis": {
            "this_month_spend":   this_spend,
            "last_month_spend":   last_spend,
            "mom_change_pct":     mom_pct,
            "this_month_income":  this_income,
            "this_month_savings": round(this_income - this_spend, 2),
            "savings_rate_pct":   savings_rate,
            "ytd_spend":          ytd_spend,
            "ytd_income":         ytd_income,
            "pending_anomalies":  len(anm_rows),
        },
        "categories":    [{"category": r.category or "Other", "amount": round(r.t, 2)} for r in cat_rows],
        "monthly_trend": monthly_trend,
        "top_merchants": [{"merchant": r.merchant, "total": round(r.t, 2)} for r in mer_rows],
        "recent_anomalies": [
            {"merchant": tx.merchant or tx.description, "amount": tx.amount,
             "date": tx.date.strftime("%Y-%m-%d"), "type": a.anomaly_type,
             "description": a.description, "score": a.anomaly_score}
            for a, tx in anm_rows
        ],
        "upcoming_forecasts": [
            {"category": f.category, "period_start": f.period_start.strftime("%Y-%m-%d"),
             "predicted_amount": f.predicted_amount, "lower_bound": f.lower_bound, "upper_bound": f.upper_bound}
            for f in fc_rows
        ],
    }


@router.get("/spending-velocity")
async def velocity(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = datetime.now() - timedelta(days=days)
    rows  = db.query(func.date(Transaction.date).label("day"), func.sum(Transaction.amount).label("total")).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == TransactionType.DEBIT,
        Transaction.date >= start,
    ).group_by("day").order_by("day").all()
    return [{"date": str(r.day), "amount": round(r.total, 2)} for r in rows]
