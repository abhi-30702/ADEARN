# AdEarn

**Ad Revenue to Customer — Get Paid to Watch Ads and Buy Products**

AdEarn is a production-level cashback advertising platform where users declare purchase intent, see only matched ads, complete purchases, and receive 1–5% cashback automatically split into four pools. Advertisers are billed only after cashback is committed — never on impressions.

---

## What It Does

Users declare purchase intent and are shown only ads that match their profile via JSONB overlap queries. When a purchase is confirmed via Stripe webhook, the cashback engine runs a single atomic PostgreSQL transaction that splits earnings into four pools: liquid (40%), self-savings (30%), parent fund (20%), charity (10%). Advertisers pay only on verified conversions.

**Three invariants are always enforced:**
1. Cashback distribution is always one atomic PostgreSQL transaction — partial writes are a financial bug.
2. Advertiser billing happens only after cashback is committed — never before.
3. Every webhook is idempotent — double-processing is architecturally impossible via Redis SETNX.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js 20 + Express 4 + TypeScript 5 strict |
| Database | PostgreSQL 16 (raw `pg`, no ORM) |
| Cache / Queue | Redis 7 via ioredis |
| Payments | Stripe (test mode) behind `IPaymentProvider` interface |
| Auth | JWT RS256 |
| Frontend | React 18 + Vite + TanStack Router/Query + Tailwind CSS + shadcn/ui |
| Mobile | Flutter 3 + Riverpod + Dio + flutter_stripe |
| Monitoring | Sentry (server + web) |
| CI/CD | GitHub Actions → Railway (server) + Vercel (web) |

---

## Monorepo Structure

```
adearn/
├── server/              Node.js API (Express)
│   ├── src/
│   │   ├── routes/      REST endpoints
│   │   ├── controllers/ Thin: parse req → call service → return res
│   │   ├── services/    Business logic (cashbackEngine, fraudDetection, adMatcher…)
│   │   ├── repositories/ All SQL lives here — none in services
│   │   ├── middleware/  authenticate, authorize, validate, rateLimiter, errorHandler
│   │   └── jobs/        parentFundTransfer (1st), charityDisbursement (15th), expireAttributions
│   └── migrations/      001–013 SQL files
├── web/                 React 18 frontend
│   └── src/
│       ├── pages/       consumer/ · advertiser/ · admin/
│       ├── components/  AdCard, VideoAdPlayer, CashbackPoolVisualizer, PoolSliders
│       ├── hooks/       useAuth, useFeed, useWallet, useStripe
│       └── services/    api.ts — axios instance + all API calls
├── mobile/              Flutter consumer app
│   └── lib/
│       ├── core/        api_client, auth, errors
│       └── features/    onboarding, feed, wallet, profile, checkout
├── packages/shared/     Shared TypeScript types + zod schemas
├── docs/                API spec + business logic + schema reference
│   └── openapi.yaml
├── docker-compose.yml
└── CLAUDE.md            Full build instructions and phase tracker
```

---

## Local Setup

**Prerequisites:** Node.js 20 LTS, Docker Desktop, Stripe CLI

```bash
# 1. Clone and install
git clone https://github.com/your-org/adearn.git
cd adearn
npm install

# 2. Start infrastructure
docker-compose up -d   # PostgreSQL 16 + Redis 7

# 3. Configure server
cp server/.env.example server/.env
# Edit server/.env — add JWT RS256 keys and Stripe test keys

# 4. Run migrations and load demo data
cd server && npm run migrate
npm run seed:demo

# 5. Start server (terminal 1)
npm run dev   # http://localhost:3000

# 6. Start web (terminal 2)
cd ../web && npm run dev   # http://localhost:5173

# 7. Forward Stripe webhooks (terminal 3)
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Health check | http://localhost:3000/health |
| Frontend | http://localhost:5173 |
| Public charity ledger | http://localhost:5173/charity-ledger |

---

## Demo Accounts

Seeded by `npm run seed:demo`. OTP is always `123456` in dev mode (`OTP_MOCK=true`).

| Role | Mobile | OTP |
|---|---|---|
| Consumer | 9876543210 | 123456 |
| Advertiser | 9123456789 | 123456 |
| Admin | 9000000000 | 123456 |

---

## Demo Flow (11 Steps)

The full end-to-end scenario using the Mamaearth Vitamin C Serum campaign (₹1,499, 3% cashback):

1. Consumer login → OTP `123456`
2. Purchase profile → Health & Beauty + Mamaearth (pre-selected by seed)
3. Pool config → 40 / 30 / 20 / 10 split + parent bank pre-filled
4. Feed → Mamaearth Vitamin C Serum ad card (3% badge)
5. Tap ad → video plays → attribution session created (24h window)
6. Stripe checkout → `4242 4242 4242 4242` / `12/34` / `123`
7. Stripe CLI shows `payment_intent.succeeded`
8. Server: atomic transaction committed (< 3s) — 5 writes in one `BEGIN/COMMIT`
9. Wallet → pool balances update live via TanStack Query polling
10. Ad review → 5/5/5 scores submitted
11. Advertiser login → 1 conversion · ₹44.97 spend · 100% conversion rate

**What this proves:** intent-matching · performance billing · atomic cashback · idempotency · production-grade engineering

---

## API Reference

Full route table and request/response shapes: [`docs/API.md`](docs/API.md)

OpenAPI 3.0 spec: [`docs/openapi.yaml`](docs/openapi.yaml)

**Base URL:** `http://localhost:3000/api/v1` (dev) · `https://your-api.railway.app/api/v1` (production)

**Authentication:** `Authorization: Bearer <JWT>` on all routes except `/auth/*`, `/health`, and `/public/charity-ledger`.

**Response envelope:**
```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "FRAUD_REVIEW", "message": "..." } }
```

---

## Testing

```bash
cd server

# Unit tests — no infrastructure required
npm run test:unit

# Integration tests — requires PostgreSQL + Redis
docker-compose up -d && npm run migrate
npm test

# Coverage report
npm run test:coverage
```

Test suites cover: cashback engine atomicity, fraud detection scoring, pool distributor integer arithmetic, ad matcher JSONB queries, webhook happy path, idempotency replay, fraud auto-flag, and wallet balance reads.

---

## Deployment

### Backend — Railway

1. Connect the GitHub repository to Railway.
2. Railway auto-detects `railway.toml` and builds `server/Dockerfile`.
3. Add the Railway PostgreSQL and Redis plugins — env vars are injected automatically.
4. Set remaining secrets in the Railway dashboard (see `server/.env.example` for the full list).

### Frontend — Vercel

1. Import the GitHub repository into Vercel.
2. Vercel auto-detects `web/vercel.json` and builds from the `web/` directory.
3. Set `VITE_API_URL` to your Railway backend URL and `VITE_STRIPE_PUBLISHABLE_KEY` to your Stripe publishable key.

### Load Test (k6)

```bash
# Run after deployment to verify throughput target
BASE_URL=https://your-api.railway.app \
STRIPE_WEBHOOK_SECRET=whsec_xxx \
k6 run server/tests/load/webhook-flood.js
# Target: 500 webhooks/min, p(95) < 500ms
```

---

## Mobile

```bash
# Prerequisites: Flutter 3.10+ SDK
cd mobile
flutter pub get
flutter run   # Android emulator or physical device

# Build release APK for demo
flutter build apk --release
```

The Flutter app covers all consumer screens: OTP onboarding, purchase profile setup, ad feed, attribution flow, Stripe checkout, wallet with pool breakdown, and transaction history.

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Raw `pg`, no ORM | Full SQL control for JSONB overlap queries and atomic financial writes |
| `IPaymentProvider` interface | Swap from Stripe to Cashfree/Razorpay at production is a config change, not a rewrite |
| Webhook route before `express.json()` | Stripe signature verification requires the raw request body — `express.raw()` must be registered first |
| Integer arithmetic (paise) in pool distributor | Floats cannot be trusted for money; charity pool receives the remainder to prevent rounding loss |
| `SELECT ... FOR UPDATE` on attribution sessions | Prevents race conditions when concurrent webhooks arrive for the same session |
| Redis SETNX idempotency guard | Makes double-processing of Stripe events architecturally impossible |
| HTTP 200 before async webhook processing | Prevents Stripe retry storms; work is queued via `setImmediate` |
| TanStack Query for server state | Live cashback balance updates via background polling without manual state management |

---

## Project Status

**Phase 3 — Community, Analytics & Ops** is in progress. See [`CLAUDE.md`](CLAUDE.md) Section 10 for the full phase tracker.

| Phase | Status |
|---|---|
| Phase 1 — Foundation | Complete |
| Phase 2 — Cashback Core | Complete |
| Phase 3 — Analytics & Ops | In progress |
| Phase 4 — Mobile, Polish & Deploy | Pending |

---

*AdEarn — Project 16 · Built by Abhishek K · Stripe test mode → Cashfree/Razorpay at production*
