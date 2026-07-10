"""
WealthSense AI — Demo Data Seeder
Run: python -m backend.db.seed
"""
import hashlib, random, uuid, sys, os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.session import SessionLocal, engine
from backend.db.models import Base, User, Account, Transaction, TransactionType, Anomaly, AnomalyStatus, Forecast
from backend.api.routes.auth import hash_password

MERCHANTS = [
    ("STARBUCKS",          "Coffee & Cafes",        3.5,   8.0),
    ("WHOLE FOODS",        "Groceries",              45.0,  120.0),
    ("AMAZON",             "Online Shopping",        15.0,  150.0),
    ("NETFLIX",            "Streaming Services",     15.99, 15.99),
    ("SPOTIFY",            "Streaming Services",     9.99,  9.99),
    ("CHIPOTLE",           "Dining & Restaurants",   10.0,  18.0),
    ("MCDONALDS",          "Fast Food",              5.0,   12.0),
    ("SHELL GAS",          "Gas & Fuel",             35.0,  75.0),
    ("PLANET FITNESS",     "Fitness & Gym",          24.99, 24.99),
    ("CVS PHARMACY",       "Health & Pharmacy",      8.0,   45.0),
    ("TARGET",             "Online Shopping",        25.0,  90.0),
    ("UBER",               "Rideshare",              12.0,  35.0),
    ("ELECTRIC BILL",      "Utilities",              80.0,  120.0),
    ("INTERNET BILL",      "Internet & Phone",       65.0,  80.0),
    ("TRADER JOES",        "Groceries",              30.0,  80.0),
]

def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    random.seed(42)

    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == "demo@wealthsense.ai").first()
        if existing:
            print("Removing existing demo data...")
            db.delete(existing)
            db.commit()

        user = User(
            id="demo-user-001",
            email="demo@wealthsense.ai",
            hashed_password=hash_password("demo1234"),
            full_name="Alex Johnson",
            is_active=True,
            plan="pro",
        )
        db.add(user)
        db.flush()

        account = Account(
            id="demo-account-001",
            user_id=user.id,
            institution="Chase",
            account_name="Chase Checking",
            account_type="checking",
            currency="USD",
            balance=4823.50,
        )
        db.add(account)
        db.flush()

        txs = []
        start = datetime.now() - timedelta(days=180)

        for day in range(180):
            d = start + timedelta(days=day)

            # Bi-weekly payroll
            if day % 14 == 0:
                txs.append(_tx(user.id, account.id, d, "EMPLOYER DIRECT DEPOSIT",
                               round(random.uniform(3400, 3600), 2), "credit", "Salary & Income", "PAYROLL"))

            # Subscriptions on 7th
            if d.day == 7:
                for m, cat, lo, hi in [("NETFLIX","Streaming Services",15.99,15.99),
                                        ("SPOTIFY","Streaming Services",9.99,9.99),
                                        ("PLANET FITNESS","Fitness & Gym",24.99,24.99)]:
                    txs.append(_tx(user.id, account.id, d, f"{m} MONTHLY",
                                   round(random.uniform(lo, hi), 2), "debit", cat, m, True))

            # Groceries
            if d.weekday() in (0, 2, 5) and random.random() < 0.75:
                m, cat, lo, hi = random.choice([
                    ("WHOLE FOODS","Groceries",45,120),
                    ("TRADER JOES","Groceries",30,80),
                ])
                txs.append(_tx(user.id, account.id, d, f"{m} PURCHASE",
                               round(random.uniform(lo, hi), 2), "debit", cat, m))

            # Coffee weekdays
            if d.weekday() < 5 and random.random() < 0.65:
                txs.append(_tx(user.id, account.id, d, "STARBUCKS PURCHASE",
                               round(random.uniform(3.5, 8), 2), "debit", "Coffee & Cafes", "STARBUCKS"))

            # Dining
            if random.random() < 0.40:
                m, cat, lo, hi = random.choice([
                    ("CHIPOTLE","Dining & Restaurants",10,18),
                    ("MCDONALDS","Fast Food",5,12),
                ])
                txs.append(_tx(user.id, account.id, d, f"{m} PURCHASE",
                               round(random.uniform(lo, hi), 2), "debit", cat, m))

            # Gas weekly
            if d.weekday() == 5 and random.random() < 0.6:
                txs.append(_tx(user.id, account.id, d, "SHELL GAS PURCHASE",
                               round(random.uniform(35, 75), 2), "debit", "Gas & Fuel", "SHELL GAS"))

            # Utilities 15th
            if d.day == 15:
                txs.append(_tx(user.id, account.id, d, "ELECTRIC CO PAYMENT",
                               round(random.uniform(80, 120), 2), "debit", "Utilities", "ELECTRIC", True))
                txs.append(_tx(user.id, account.id, d, "INTERNET BILL",
                               round(random.uniform(65, 80), 2), "debit", "Internet & Phone", "INTERNET", True))

            # Amazon random
            if random.random() < 0.12:
                txs.append(_tx(user.id, account.id, d, "AMAZON PURCHASE",
                               round(random.uniform(15, 200), 2), "debit", "Online Shopping", "AMAZON"))

        db.bulk_save_objects(txs)
        db.flush()

        # Add one anomaly
        anm_tx = _tx(user.id, account.id, datetime.now() - timedelta(days=5),
                     "UNKNOWN INTL CHARGE", 847.32, "debit", "Other", "UNKNOWN")
        anm_tx.id = "anomaly-tx-001"
        db.add(anm_tx)
        db.flush()
        db.add(Anomaly(
            transaction_id=anm_tx.id,
            anomaly_score=0.94,
            anomaly_type="amount_spike",
            description="Unusual charge of $847.32 from unknown international merchant at 3AM.",
            status=AnomalyStatus.PENDING,
        ))

        # Add forecasts
        for i in range(1, 4):
            ps = (datetime.now() + timedelta(days=i*30)).replace(day=1)
            for cat, pred in [("Groceries",320),("Dining & Restaurants",180),
                               ("Streaming Services",55),("Coffee & Cafes",85)]:
                db.add(Forecast(
                    user_id=user.id, category=cat,
                    period_start=ps,
                    period_end=(ps + timedelta(days=32)).replace(day=1),
                    predicted_amount=pred,
                    lower_bound=pred * 0.85,
                    upper_bound=pred * 1.15,
                    model_version="v1.0",
                ))

        db.commit()
        print(f"✅ Demo data seeded: {len(txs)+1} transactions")
        print("   Login: demo@wealthsense.ai / demo1234")


def _tx(user_id, account_id, date, desc, amount, tx_type, category, merchant, recurring=False):
    import random as r
    fp = hashlib.sha256(f"{user_id}:{date.date()}:{desc}:{amount}:{r.random()}".encode()).hexdigest()
    return Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_id=account_id,
        date=date.replace(hour=r.randint(8,21)),
        description=desc,
        amount=amount,
        transaction_type=TransactionType(tx_type),
        merchant=merchant,
        category=category,
        category_confidence=round(r.uniform(0.85, 0.99), 3),
        is_recurring=recurring,
        fingerprint=fp,
    )


if __name__ == "__main__":
    seed_demo_data()
