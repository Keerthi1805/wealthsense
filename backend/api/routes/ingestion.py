from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hashlib, uuid, re, io
from datetime import datetime

from backend.db.session import get_db
from backend.db.models import User, Account, Transaction, TransactionType
from backend.api.routes.auth import get_current_user

router = APIRouter()

# ── Category keyword mapper ───────────────────────────────────────────────────
CATEGORY_MAP = {
    "Groceries":            ["whole foods","trader joe","kroger","safeway","aldi","costco","walmart grocery","publix","wegmans","sprouts","market","grocery"],
    "Dining & Restaurants": ["cheesecake factory","olive garden","applebee","darden","restaurant","dining","sushi","pizza hut","dominos","panera","subway","taco bell","burger king","wendys","chick-fil","popeyes","five guys","shake shack"],
    "Fast Food":            ["mcdonalds","mcdonald","kfc","mcd","fast food","in-n-out","jack in the box","sonic drive"],
    "Coffee & Cafes":       ["starbucks","dunkin","coffee","cafe","espresso","dutch bros","peet"],
    "Streaming Services":   ["netflix","hulu","disney","hbo","paramount","peacock","apple tv","youtube premium","amazon prime video","spotify","apple music","pandora","tidal","deezer"],
    "Online Shopping":      ["amazon","amzn","ebay","etsy","shopify","wayfair","alibaba"],
    "Gas & Fuel":           ["shell","chevron","exxon","mobil","bp","arco","speedway","circle k","gas","fuel","sunoco"],
    "Groceries":            ["whole foods","trader joe","kroger","safeway","publix","wegmans","sprouts","costco","aldi","walmart supercenter"],
    "Health & Pharmacy":    ["cvs","walgreens","rite aid","pharmacy","drug","medical","doctor","clinic","hospital","health"],
    "Fitness & Gym":        ["planet fitness","gym","fitness","ymca","crossfit","peloton","equinox","anytime fitness"],
    "Utilities":            ["electric","gas company","water bill","utility","utilities","pge","con ed","duke energy","internet service","comcast","att","verizon","t-mobile","spectrum"],
    "Internet & Phone":     ["internet service","comcast","xfinity","spectrum","att internet","verizon fios","tmobile","t-mobile","at&t"],
    "Rideshare":            ["uber","lyft","grab","bolt","via ride"],
    "Dining & Restaurants": ["uber eats","doordash","grubhub","instacart","postmates","seamless","deliveroo"],
    "Clothing & Apparel":   ["zara","h&m","gap","old navy","nike","adidas","target clothing","macy","nordstrom","tjmaxx","tj maxx","ross"],
    "Electronics":          ["best buy","apple store","micro center","newegg","b&h photo"],
    "Travel":               ["airbnb","hotel","marriott","hilton","hyatt","expedia","booking.com","united airlines","delta","southwest","american airlines"],
    "Entertainment":        ["amc theatre","regal cinema","movie","concert","ticketmaster","stubhub","bowling","arcade"],
    "Salary & Income":      ["direct deposit","payroll","salary","paycheck","employer"],
    "Refund":               ["venmo","zelle","cashapp","cash app","paypal","refund","reimbursement"],
    "Rent & Mortgage":      ["rent","mortgage","apartment","lease","property"],
    "Insurance":            ["insurance","geico","progressive","state farm","allstate","nationwide"],
    "Savings Transfer":     ["transfer","savings","investment","fidelity","vanguard","schwab","robinhood"],
    "Home & Garden":        ["home depot","lowes","ikea","wayfair","bed bath","williams sonoma"],
    "Personal Care":        ["salon","haircut","spa","massage","nail","beauty","sephora","ulta"],
}

def detect_category(description: str, csv_category: str = "") -> str:
    """Map description and CSV category to app category name."""
    desc_lower = description.lower()
    csv_lower  = csv_category.lower() if csv_category else ""

    # Direct CSV category matches first
    csv_direct = {
        "groceries":         "Groceries",
        "food & drink":      "Dining & Restaurants",
        "restaurants":       "Dining & Restaurants",
        "gas":               "Gas & Fuel",
        "entertainment":     "Streaming Services",
        "shopping":          "Online Shopping",
        "health":            "Health & Pharmacy",
        "health & wellness": "Fitness & Gym",
        "bills":             "Utilities",
        "travel":            "Rideshare",
        "income":            "Salary & Income",
        "payment":           "Salary & Income",
        "transfer":          "Refund",
    }
    for key, cat in csv_direct.items():
        if key in csv_lower:
            # Still check description for more precision
            break

    # Description keyword matching (more precise)
    for category, keywords in CATEGORY_MAP.items():
        for kw in keywords:
            if kw in desc_lower:
                return category

    # Fall back to CSV category mapping
    for key, cat in csv_direct.items():
        if key in csv_lower:
            return cat

    return "Other"


def clean_merchant(description: str) -> str:
    """Extract clean merchant name from transaction description."""
    # Remove trailing numbers, store IDs, dates
    name = re.sub(r'\s*#\d+', '', description)
    name = re.sub(r'\s+\d{5,}', '', name)
    name = re.sub(r'\s+(f\d+|0+\d+)$', '', name, flags=re.IGNORECASE)
    name = name.strip().title()
    return name[:80] if name else description[:80]


class IngestionResult(BaseModel):
    total_rows: int
    imported:   int
    duplicates: int
    errors:     int
    institution: str
    message:    str


@router.post("/csv", response_model=IngestionResult)
async def upload_csv(
    file:       UploadFile = File(...),
    account_id: str        = None,
    db:         Session    = Depends(get_db),
    current_user: User     = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    try:
        import pandas as pd
        df = pd.read_csv(io.BytesIO(content))
        df.columns = df.columns.str.strip()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {e}")

    # ── Detect institution from column names ──────────────────────────────────
    cols_lower = set(df.columns.str.lower())
    institution = "Generic"
    if "transaction date" in cols_lower and "post date" in cols_lower:
        institution = "Chase"
    elif "debit" in cols_lower and "credit" in cols_lower:
        institution = "Citi"
    elif "posted date" in cols_lower:
        institution = "Bank of America"

    # ── Resolve column names flexibly ─────────────────────────────────────────
    def find_col(keywords):
        for c in df.columns:
            if any(k in c.lower() for k in keywords):
                return c
        return None

    date_col  = find_col(["transaction date", "date", "posted"])
    amt_col   = find_col(["amount"])
    desc_col  = find_col(["description", "desc", "name", "payee", "memo", "narrative"])
    cat_col   = find_col(["category"])

    if not date_col or not amt_col or not desc_col:
        raise HTTPException(status_code=422, detail=f"Could not find required columns (date, amount, description). Found: {list(df.columns)}")

    # ── Auto-create account ───────────────────────────────────────────────────
    if not account_id:
        acc = Account(
            user_id=current_user.id,
            institution=institution,
            account_name=f"{institution} Import",
            account_type="checking",
        )
        db.add(acc)
        db.flush()
        account_id = acc.id

    imported = duplicates = errors = 0
    seen = set()

    for _, row in df.iterrows():
        try:
            raw_date = str(row.get(date_col, "")).strip()
            raw_amt  = str(row.get(amt_col,  "")).strip()
            raw_desc = str(row.get(desc_col, "")).strip()
            raw_cat  = str(row.get(cat_col,  "")).strip() if cat_col else ""

            if not raw_date or not raw_amt or not raw_desc or raw_desc == "nan":
                errors += 1
                continue

            # Parse date
            tx_date = None
            for fmt in ["%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"]:
                try:
                    tx_date = datetime.strptime(raw_date, fmt)
                    break
                except ValueError:
                    continue
            if not tx_date:
                errors += 1
                continue

            # Parse amount
            clean_amt = re.sub(r"[$,\s]", "", raw_amt)
            try:
                amount = float(clean_amt)
            except ValueError:
                errors += 1
                continue

            if amount == 0:
                continue

            tx_type = "debit" if amount < 0 else "credit"
            amount  = abs(amount)

            # Dedup fingerprint
            fp = hashlib.sha256(
                f"{current_user.id}:{tx_date.date()}:{raw_desc}:{amount:.2f}".encode()
            ).hexdigest()

            if fp in seen:
                duplicates += 1
                continue
            if db.query(Transaction).filter(Transaction.fingerprint == fp).first():
                duplicates += 1
                seen.add(fp)
                continue

            seen.add(fp)

            # Detect category and clean merchant
            category = detect_category(raw_desc, raw_cat if raw_cat != "nan" else "")
            merchant = clean_merchant(raw_desc)

            tx = Transaction(
                id               = str(uuid.uuid4()),
                user_id          = current_user.id,
                account_id       = account_id,
                date             = tx_date,
                description      = raw_desc,
                amount           = amount,
                transaction_type = TransactionType(tx_type),
                merchant         = merchant,
                category         = category,
                category_confidence = 0.90,
                is_recurring     = any(kw in raw_desc.lower() for kw in [
                    "netflix","spotify","hulu","disney","apple music","planet fitness",
                    "gym","electric","internet service","phone bill","insurance","monthly"
                ]),
                fingerprint      = fp,
            )
            db.add(tx)
            imported += 1

        except Exception:
            errors += 1
            continue

    db.commit()

    return IngestionResult(
        total_rows  = len(df),
        imported    = imported,
        duplicates  = duplicates,
        errors      = errors,
        institution = institution,
        message     = (
            f"Imported {imported} transactions from {institution}. "
            f"{duplicates} duplicates skipped. "
            f"Categories auto-detected from merchant names."
        ),
    )
