# AdEarn

**Intent-matched, purchase-triggered cashback advertising platform.**

> *Get paid in real cashback for purchases you were already going to make.*

---

## Architecture

```
adearn/
├── backend/          Node.js 20 + Express 4 API
│   └── src/
│       ├── routes/           REST endpoints
│       ├── controllers/      Request handlers
│       ├── services/
│       │   ├── cashbackEngine.js   ← Core business logic
│       │   └── fraudService.js     ← Rule-based fraud scoring
│       ├── middleware/       Auth, rate limiting, validation
│       ├── models/           schema.sql (PostgreSQL 16)
│       ├── config/           DB, Redis, Stripe
│       ├── jobs/             Cron jobs (parent fund, charity, retry)
│       └── utils/            Logger, JWT, response helpers
├── frontend/         React 18 + Vite + Zustand
│   └── src/
│       ├── pages/            Consumer | Advertiser | Admin views
│       ├── services/api.js   Axios client with JWT interceptor
│       └── store/            Zustand auth store
├── infra/
│   └── docker/docker-compose.yml   PostgreSQL 16 + Redis 7
└── scripts/setup.sh  One-command local dev setup
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 LTS+ |
| Docker Desktop | Latest |
| Stripe CLI | Latest |

### 1. Clone & setup

```bash
git clone <repo-url> adearn
cd adearn
bash scripts/setup.sh
```

The setup script installs dependencies, copies `.env` files, and starts Docker services.

### 2. Configure Stripe

Edit `backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Get these from [dashboard.stripe.com](https://dashboard.stripe.com) (test mode).

### 3. Run

```bash
# Terminal 1 — Backend API
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend

# Terminal 3 — Stripe webhook forwarding (dev only)
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Frontend | http://localhost:5173 |
| Health check | http://localhost:3000/health |
| Charity ledger (public) | http://localhost:5173/charity-ledger |

---

## Development Credentials

**OTP (dev mode):** Any Indian mobile number, OTP is always `123456`.

**Stripe test cards:**

| Card | Scenario |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0025 0000 3155` | Requires 3D Secure |

Use any future expiry date and any 3-digit CVC.

---

## Core Cashback Flow (end-to-end)

```
1. User logs in via OTP → JWT issued
2. GET /api/v1/feed → intent-matched ads returned
3. User views ad → POST /api/v1/attribution/start → session created (24hr window)
4. User completes Stripe Checkout payment
5. Stripe fires payment_intent.succeeded webhook → POST /api/v1/webhooks/stripe
6. Cashback engine:
   a. Verify Stripe signature (constructEvent)
   b. Check idempotency (Redis + DB on payment_intent_id)
   c. Lookup attribution session
   d. Calculate cashback (1–5% of purchase)
   e. Run fraud scoring (6 rules, weighted)
   f. Atomic PostgreSQL transaction:
      - Write cashback_transactions
      - Update wallet pool balances
      - Update NGO accumulated balance
      - Update campaign spend_to_date
      - Mark session as converted
   g. Notify user (FCM push + WhatsApp if opted in)
7. Transaction visible at GET /api/v1/transactions
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/request-otp` | Send OTP to mobile |
| POST | `/api/v1/auth/verify-otp` | Verify OTP, get JWT |
| GET | `/api/v1/feed` | Intent-matched ad feed |
| POST | `/api/v1/attribution/start` | Start ad-to-purchase session |
| GET | `/api/v1/wallet` | Pool balances |
| GET | `/api/v1/transactions` | Cashback history |
| POST | `/api/v1/webhooks/stripe` | Stripe payment webhook |
| GET | `/public/charity-ledger` | Public NGO disbursements |

---

## Background Jobs

| Job | Schedule | Description |
|---|---|---|
| Parent fund transfer | 1st of month, midnight IST | IMPS to parent bank accounts |
| Charity disbursement | 15th of month, midnight IST | Batch to NGO accounts |
| Webhook retry | Every minute | Retry failed webhook events |
| Session expiry | Every hour | Expire 24hr attribution windows |

---

## Fraud Detection Rules

| Rule | Threshold | Score Weight |
|---|---|---|
| Conversion velocity | > 5/day per user | 0.30 |
| Device fingerprint mismatch | Ad view ≠ purchase device | 0.25 |
| Geo mismatch | Non-India IP at purchase | 1.00 (auto-reject) |
| Spend anomaly | Purchase > 10× declared monthly spend | 0.20 |
| Refund pattern | > 2 refunds in 30 days | 0.35 |
| New account high-value | Account < 7 days + purchase > ₹5,000 | 0.40 |

- Score ≥ 0.80 → manual review queue
- Score ≥ 0.95 → auto-reject

---

## Payment Layer (Demo vs Production)

| Component | Demo (College build) | Production |
|---|---|---|
| Payments | Stripe test mode | Cashfree / Razorpay (UPI, NACH, IMPS) |
| KYC | OTP only | Digilocker + Aadhaar |
| Bank verification | Mocked | Penny drop |
| Recurring billing | Stripe Billing | NACH mandate |

See PRD §21 and §17 for the production swap checklist.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express 4 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Frontend | React 18, Vite, Zustand |
| Payments | Stripe (demo) |
| Auth | JWT (RS256) + mobile OTP |
| Jobs | node-cron |
| Containers | Docker Compose (dev) |
