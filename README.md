# ⚡ WealthSense AI

### Intelligent Personal Finance Platform

**WealthSense AI** is a full-stack, production-grade personal finance intelligence platform.  
Upload your bank CSV → get instant AI-powered insights, anomaly alerts, budget forecasts, and a GPT-4 financial advisor — all running on your own data.


## 🎯 Features

### 🧠 AI & Intelligence
| Feature | Description |
|---------|-------------|
| **GPT-4 Financial Advisor** | Chat with an AI that has full context of your real transactions |
| **Smart Categorization** | Merchant names auto-mapped to 30+ spending categories |
| **Anomaly Detection** | Flags unusual charges, suspicious merchants, and late-night transactions |
| **Budget Forecasting** | Predicts next month's spending per category based on history |
| **Subscription Scanner** | Automatically detects recurring charges (Netflix, Spotify, gym, etc.) |
| **AI Monthly Reports** | GPT-4 generates narrative financial summaries with recommendations |

### 📊 Analytics & Dashboard
- **Real-time dashboard** — KPIs, monthly trends, category breakdown, daily velocity
- **12-month trend chart** — income vs expenses with savings overlay
- **Top merchants** — ranked by spend with drill-down capability
- **Interactive charts** — powered by Recharts with smooth animations

### 🏦 Data Ingestion
- **Multi-bank CSV support** — Chase, Bank of America, Citi, Capital One, AmEx, Wells Fargo, HSBC, Plaid
- **Auto-format detection** — intelligently detects column structure from any CSV
- **SHA-256 deduplication** — prevents importing the same transaction twice
- **50+ institution formats** supported

### 🔐 Security & Auth
- JWT-based authentication with bcrypt password hashing
- Per-user data isolation — users only see their own data
- Secure token refresh and session management


## 🖥 Demo

### Dashboard
> Real-time KPIs, spending trends, category breakdown, top merchants and anomaly alerts

### AI Advisor
> GPT-4 powered chat with full context of your transaction history

### Transactions
> Filterable, searchable table with category filters and CSV import

---

## 🛠 Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| API Framework | **FastAPI** (Python 3.11) — async, auto-documented REST API |
| Database | **PostgreSQL 15** — primary relational store |
| ORM | **SQLAlchemy** with Alembic migrations |
| Cache | **Redis 7** — session caching and rate limiting |
| Auth | **JWT** + **bcrypt** |

### AI / ML
| Component | Technology |
|-----------|-----------|
| LLM | **GPT-4o** via OpenAI API |
| Embeddings | **text-embedding-3-small** for semantic search |
| Vector DB | **Pinecone** for RAG-based Q&A over transactions |
| Categorization | Keyword-based merchant mapping + GPT-4 fallback |
| Anomaly Detection | Statistical outlier detection on transaction patterns |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | **Next.js 14** with TypeScript |
| Styling | **Tailwind CSS** with custom dark theme |
| Charts | **Recharts** — AreaChart, BarChart, PieChart |
| State | **SWR** for data fetching + React Query |
| Streaming | Server-Sent Events for real-time AI chat |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Containerization | **Docker** + **Docker Compose** |
| CI/CD | **GitHub Actions** |
| Cloud | **AWS ECS** + **Terraform** (production) |
| Monitoring | **Prometheus** + **Grafana** |

---

## 🚀 Quickstart

### Prerequisites
- [Docker Desktop](https://docker.com/products/docker-desktop) installed and running
- [Python 3.8+](https://python.org) for running the installer
- OpenAI API key (get one at [platform.openai.com](https://platform.openai.com/api-keys))

### 1. Configure environment

```bash
# Mac/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` and set your values:

```env
OPENAI_API_KEY=sk-your-openai-key-here
SECRET_KEY=your-random-32-character-secret-key
DATABASE_URL=postgresql://postgres:password@postgres:5432/wealthsense
REDIS_URL=redis://redis:6379/0
```

### 2. Start all services

```bash
docker compose up --build
```

> First build takes 3–5 minutes. Subsequent starts are under 30 seconds.

### 3. Initialize database

```bash
# Run in a new terminal after build completes
docker compose exec api alembic upgrade head
docker compose exec api python -m backend.db.seed
```

### 4. Open the app

```
http://localhost:3000
```

**Demo credentials:**
```
Email:    demo@wealthsense.ai
Password: demo1234
```

---

## 📁 Project Structure

```
wealthsense-ai/
│
├── backend/                        # FastAPI Python backend
│   ├── main.py                     # App entry point, middleware, router registration
│   ├── core/
│   │   └── config.py               # Pydantic settings (env-based config)
│   ├── db/
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── session.py              # Database session factory
│   │   ├── seed.py                 # Demo data seeder
│   │   └── migrations/             # Alembic migration scripts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py             # Register, login, JWT, /me
│   │   │   ├── transactions.py     # CRUD + filtering + pagination
│   │   │   ├── ingestion.py        # CSV upload + parsing + categorization
│   │   │   ├── advisor.py          # GPT-4 chat + subscriptions
│   │   │   ├── analytics.py        # Dashboard KPIs + trends + velocity
│   │   │   └── reports.py          # AI monthly report generation
│   │   └── middleware/
│   │       └── auth.py             # JWT dependency injection
│   ├── ml/
│   │   └── pipelines/
│   │       ├── categorizer.py      # Merchant → category mapping
│   │       ├── anomaly_detector.py # Statistical anomaly detection
│   │       ├── forecaster.py       # Spending forecasts
│   │       └── subscription_detector.py  # Recurring charge detection
│   ├── rag/
│   │   └── rag_pipeline.py         # LangChain + Pinecone RAG Q&A
│   ├── agent/
│   │   └── financial_advisor.py    # ReAct agent with financial tools
│   └── services/
│       ├── ingestion_service.py    # Multi-bank CSV parser
│       └── kafka_producer.py       # Event streaming
│
├── frontend/                       # Next.js 14 TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout + metadata
│   │   │   ├── globals.css         # Design system + animations
│   │   │   ├── page.tsx            # Root redirect
│   │   │   ├── login/page.tsx      # Auth page (login + register)
│   │   │   ├── dashboard/page.tsx  # Main dashboard with KPIs + charts
│   │   │   ├── transactions/page.tsx  # Transaction table + CSV upload
│   │   │   ├── advisor/page.tsx    # AI chat with streaming
│   │   │   ├── analytics/page.tsx  # Deep analytics + subscriptions
│   │   │   ├── reports/page.tsx    # AI monthly report viewer
│   │   │   └── settings/page.tsx   # Profile + billing
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   │   │   └── Providers.tsx   # React Query + toast providers
│   │   │   ├── ui/index.tsx        # Reusable UI components
│   │   │   └── charts/index.tsx    # Recharts wrappers
│   │   ├── lib/
│   │   │   └── api.ts              # Axios client + SWR hooks + SSE streaming
│   │   ├── hooks/index.ts          # Custom React hooks
│   │   └── types/index.ts          # TypeScript domain types
│   ├── package.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── Dockerfile
│
├── infra/
│   ├── docker/
│   │   └── Dockerfile.api          # Production API container
│   ├── terraform/
│   │   └── main.tf                 # AWS VPC, ECS, RDS, ElastiCache, ALB
│   ├── prometheus/
│   │   └── prometheus.yml          # Metrics scrape config
│   └── grafana/                    # Dashboard provisioning
│
├── tests/
│   ├── backend/
│   │   ├── test_api.py             # API integration tests
│   │   └── test_core.py            # Unit tests (auth, ingestion, fingerprinting)
│   └── ml/
│       └── test_pipelines.py       # ML pipeline unit tests
│
├── docker-compose.yml              # Local full-stack environment
├── requirements.txt                # Python dependencies
├── alembic.ini                     # Database migration config
└── .env.example                    # Environment variables template
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                                │
│              Next.js 14 Dashboard (Port 3000)                   │
│         React + TypeScript + Tailwind + Recharts                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY                                 │
│              FastAPI (Port 8000) + JWT Auth                     │
│        /auth  /transactions  /ingest  /advisor  /analytics      │
└───────┬──────────────┬───────────────┬───────────────────────────┘
        │              │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────────┐
│  PostgreSQL  │ │   Redis    │ │  OpenAI API    │
│  (Primary DB)│ │  (Cache)   │ │  GPT-4 + RAG  │
└──────────────┘ └────────────┘ └────────────────┘
```

---

## 📡 API Documentation

Once running, visit:

- **Swagger UI:** `http://localhost:8000/api/docs`
- **ReDoc:** `http://localhost:8000/api/redoc`

### Key Endpoints

```
POST   /api/v1/auth/register          Register new user
POST   /api/v1/auth/login             Login, returns JWT
GET    /api/v1/auth/me                Current user profile

GET    /api/v1/transactions/          List with filters & pagination
POST   /api/v1/transactions/          Create transaction
PATCH  /api/v1/transactions/{id}      Update category/notes
DELETE /api/v1/transactions/{id}      Delete transaction
GET    /api/v1/transactions/summary/by-category   Spending by category

POST   /api/v1/ingest/csv             Upload bank CSV file

GET    /api/v1/analytics/dashboard    Full dashboard data
GET    /api/v1/analytics/spending-velocity  Daily spend trend

POST   /api/v1/advisor/chat           GPT-4 AI chat (streaming SSE)
GET    /api/v1/advisor/chat/history   Conversation history
GET    /api/v1/advisor/subscriptions  Detected recurring charges

GET    /api/v1/reports/               List all reports
POST   /api/v1/reports/generate       Generate AI monthly report
GET    /api/v1/reports/{id}           Get report details
```

---

## 🗄 Database Schema

```
users              → id, email, hashed_password, full_name, plan
accounts           → id, user_id, institution, account_name, balance
transactions       → id, user_id, account_id, date, description, amount,
                     transaction_type, merchant, category, is_recurring,
                     fingerprint (SHA-256 dedup)
anomalies          → id, transaction_id, anomaly_score, anomaly_type, status
forecasts          → id, user_id, category, period_start, predicted_amount
reports            → id, user_id, period_month, period_year, status, summary_json
chat_messages      → id, user_id, role, content, created_at
```

---

## 🧪 Running Tests

```bash
# All tests
docker compose exec api pytest tests/ -v

# Backend API tests only
docker compose exec api pytest tests/backend/ -v

# ML pipeline tests
docker compose exec api pytest tests/ml/ -v

# With coverage report
docker compose exec api pytest tests/ --cov=backend --cov-report=term-missing
```

---

## 🌐 Production Deployment (AWS)

```bash
# Initialize Terraform
cd infra/terraform
terraform init
terraform plan -var="db_password=your-secure-password"
terraform apply

# GitHub Actions CI/CD triggers automatically on push to main:
# lint → test → docker build → ECR push → ECS deploy
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for GPT-4 |
| `SECRET_KEY` | ✅ Yes | 32+ char random string for JWT signing |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `REDIS_URL` | Optional | Redis for caching (defaults to localhost) |
| `PINECONE_API_KEY` | Optional | For RAG-based Q&A over transactions |
| `PINECONE_ENVIRONMENT` | Optional | Pinecone region (e.g. `us-east-1`) |
| `DEBUG` | Optional | `true` for verbose logging |

---

## 📊 Supported Bank CSV Formats

| Bank | Format | Auto-detected |
|------|--------|---------------|
| Chase | `Transaction Date, Post Date, Description, Category, Type, Amount` | ✅ |
| Bank of America | `Date, Description, Amount, Running Bal.` | ✅ |
| Citi / Capital One | `Date, Description, Debit, Credit` | ✅ |
| American Express | `Date, Description, Amount` | ✅ |
| Wells Fargo | Positional (no headers) | ✅ |
| HSBC | `Date, Payee, Memo, Amount` | ✅ |
| Plaid Generic | `date, name, amount, account_id` | ✅ |
| Any Generic | NLP column detection | ✅ |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with tests
4. Run the test suite: `pytest tests/ -v`
5. Commit: `git commit -m "feat: add your feature"`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request

### Commit Convention
```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Formatting changes
refactor: Code restructure
test:     Adding tests
chore:    Build/config changes
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## ⭐ Star History

If you find this project useful, please consider giving it a ⭐ star on GitHub!

---

**Built  using FastAPI, Next.js, and GPT-4**

*Portfolio project demonstrating full-stack AI engineering:*  
*Machine Learning · NLP · LLMs · RAG · Data Engineering · MLOps · Cloud · Full-Stack*


