from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json

from backend.db.session import get_db
from backend.db.models import User, ChatMessage, Transaction, TransactionType
from backend.api.routes.auth import get_current_user
from backend.core.config import settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    stream: bool = True


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict] = []


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Save user message
    db.add(ChatMessage(user_id=current_user.id, role="user", content=payload.message))
    db.commit()

    # Build financial context
    from sqlalchemy import func, desc
    from datetime import datetime, timedelta

    start = datetime.now() - timedelta(days=30)
    rows = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == TransactionType.DEBIT,
        Transaction.date >= start,
    ).group_by(Transaction.category).order_by(desc("total")).limit(8).all()

    context = "User's last 30 days spending by category:\n"
    for r in rows:
        context += f"  - {r.category or 'Other'}: ${r.total:,.2f}\n"

    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
        answer = (
            f"I can see your spending summary for the last 30 days:\n\n{context}\n"
            "To get AI-powered analysis, please add your OpenAI API key to the .env file."
        )
        db.add(ChatMessage(user_id=current_user.id, role="assistant", content=answer))
        db.commit()
        if payload.stream:
            async def _gen():
                for word in answer.split():
                    yield f"data: {json.dumps({'token': word + ' '})}\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(_gen(), media_type="text/event-stream")
        return ChatResponse(answer=answer)

    # Real OpenAI call
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    messages = [
        {"role": "system", "content": f"You are WealthSense AI, a personal finance advisor. {context}"},
        {"role": "user",   "content": payload.message},
    ]

    if payload.stream:
        async def _stream():
            full = ""
            async with client.beta.chat.completions.stream(
                model=settings.OPENAI_MODEL,
                messages=messages,
                max_tokens=800,
            ) as stream:
                async for text in stream.text_stream:
                    full += text
                    yield f"data: {json.dumps({'token': text})}\n\n"
            db.add(ChatMessage(user_id=current_user.id, role="assistant", content=full))
            db.commit()
            yield "data: [DONE]\n\n"
        return StreamingResponse(_stream(), media_type="text/event-stream")

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL, messages=messages, max_tokens=800,
    )
    answer = response.choices[0].message.content
    db.add(ChatMessage(user_id=current_user.id, role="assistant", content=answer))
    db.commit()
    return ChatResponse(answer=answer)


@router.get("/chat/history")
async def history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msgs = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).limit(limit).all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs]


@router.get("/subscriptions")
async def subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from collections import defaultdict
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.is_recurring == True,
    ).all()
    groups = defaultdict(list)
    for t in txs:
        groups[t.merchant or t.description].append(t)

    result = []
    for merchant, items in groups.items():
        result.append({
            "merchant": merchant,
            "amount": items[0].amount,
            "frequency": "monthly",
            "is_active": True,
            "total_paid_ytd": sum(i.amount for i in items),
            "category": items[0].category or "Other",
            "confidence": 0.95,
        })
    return {"subscriptions": result, "total_monthly_cost": sum(r["amount"] for r in result), "savings_opportunities": []}
