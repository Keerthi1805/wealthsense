from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from backend.db.session import get_db
from backend.db.models import User, Report, Transaction, TransactionType, ReportStatus
from backend.api.routes.auth import get_current_user
from backend.core.config import settings

router = APIRouter()


class ReportOut(BaseModel):
    id: str
    title: Optional[str]
    period_month: int
    period_year: int
    status: str
    created_at: datetime
    summary_json: Optional[dict]
    class Config:
        from_attributes = True


@router.get("/", response_model=List[ReportOut])
async def list_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).all()


@router.post("/generate", response_model=ReportOut, status_code=202)
async def generate(
    month: int = datetime.now().month,
    year:  int = datetime.now().year,
    background: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.period_month == month,
        Report.period_year  == year,
        Report.status.in_(["queued", "generating", "ready"]),
    ).first()
    if existing:
        return existing

    report = Report(
        user_id=current_user.id,
        title=f"WealthSense Report — {datetime(year, month, 1).strftime('%B %Y')}",
        period_month=month,
        period_year=year,
        status=ReportStatus.QUEUED,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    background.add_task(_generate_report, report.id, current_user.id, month, year)
    return report


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return r


async def _generate_report(report_id: str, user_id: str, month: int, year: int):
    from backend.db.session import SessionLocal
    import calendar

    with SessionLocal() as db:
        db.query(Report).filter(Report.id == report_id).update({"status": ReportStatus.GENERATING})
        db.commit()

        try:
            start = datetime(year, month, 1)
            end   = datetime(year, month, calendar.monthrange(year, month)[1])
            txs   = db.query(Transaction).filter(
                Transaction.user_id == user_id,
                Transaction.date.between(start, end),
            ).all()

            total_spend  = sum(t.amount for t in txs if t.transaction_type == TransactionType.DEBIT)
            total_income = sum(t.amount for t in txs if t.transaction_type == TransactionType.CREDIT)
            cat_breakdown: dict = {}
            for t in txs:
                if t.transaction_type == TransactionType.DEBIT:
                    cat = t.category or "Other"
                    cat_breakdown[cat] = cat_breakdown.get(cat, 0) + t.amount

            top_cats = sorted(cat_breakdown.items(), key=lambda x: x[1], reverse=True)[:5]
            summary = {
                "total_spend":     round(total_spend, 2),
                "total_income":    round(total_income, 2),
                "net_savings":     round(total_income - total_spend, 2),
                "savings_rate":    round((total_income - total_spend) / total_income * 100, 1) if total_income else 0,
                "top_categories":  [{"category": c, "amount": round(a, 2)} for c, a in top_cats],
                "total_txs":       len(txs),
            }

            # Try AI narrative
            if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your"):
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                prompt = (
                    f"Write a 3-paragraph financial report for {datetime(year,month,1).strftime('%B %Y')}.\n"
                    f"Income: ${total_income:,.2f}, Spend: ${total_spend:,.2f}, "
                    f"Net: ${total_income-total_spend:,.2f}\n"
                    f"Top categories: {', '.join(f'{c}: ${a:.0f}' for c,a in top_cats)}\n"
                    "Be specific, actionable, and professional."
                )
                resp = await client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[{"role":"user","content":prompt}],
                    max_tokens=600,
                )
                summary["narrative"] = resp.choices[0].message.content
            else:
                summary["narrative"] = (
                    f"**{datetime(year,month,1).strftime('%B %Y')} Financial Summary**\n\n"
                    f"Total income: ${total_income:,.2f} | Total spend: ${total_spend:,.2f} | "
                    f"Net savings: ${total_income-total_spend:,.2f}\n\n"
                    f"Top spending areas: {', '.join(c for c,_ in top_cats[:3])}.\n\n"
                    "Add your OpenAI API key for AI-generated insights and recommendations."
                )

            db.query(Report).filter(Report.id == report_id).update({
                "status": ReportStatus.READY,
                "summary_json": summary,
                "completed_at": datetime.now(),
            })
            db.commit()

        except Exception as e:
            db.query(Report).filter(Report.id == report_id).update({"status": ReportStatus.FAILED})
            db.commit()
