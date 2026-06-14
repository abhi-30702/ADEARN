# CLAUDE.md — AdEarn (Project 16)

> Read this fully before writing any code or creating any file.
> For deep-dive specs, read the relevant file in `docs/` — listed in Section 15.
> Solo build: you are Developer 41 (backend) AND Developer 42 (frontend/mobile).

---

## 1. Project Identity

| Field | Value |
|---|---|
| Project | AdEarn — Project 16 |
| One-liner | Ad Revenue to Customer — Get Paid to Watch Ads and Buy Products |
| Build | Production-level demo — deployable, scalable, auditable |
| Payment | Stripe test mode → swap to Cashfree/Razorpay at production |
| Owner | Abhishek K |
| Deployment | Railway (backend + DB + Redis) · Vercel (frontend) · Direct APK (mobile) |

**What it does:** Users declare purchase intent → see only matched ads → buy products → receive 1–5% cashback → cashback auto-splits: liquid 40% / self-savings 30% / parent fund 20% / charity 10%. Advertisers pay only on confirmed purchase — never on impressions.

**The three invariants — never violate these:**
1. Cashback distribution is always one atomic PostgreSQL transaction. Partial writes = financial bug.
2. Advertiser billing happens only after cashback is committed — never before.
3. Every webhook is idempotent — double-processing must be architecturally impossible.

---

## 2. Monorepo Structure

```
adearn/
├── CLAUDE.md                        ← this file
├── docs/                            ← deep-dive specs (read when needed)
│   ├── SCHEMA.md                    ← all SQL migrations
│   ├── API.md                       ← full route table + request/response shapes
│   ├── BUSINESS_LOGIC.md            ← cashback engine, fraud, matching algorithm
│   ├── TESTING.md                   ← test strategy + required test cases
│   └── DEPLOYMENT.md                ← Docker, Railway, Vercel, CI/CD
├── .env.example
├── docker-compose.yml
├── package.json                     ← npm workspaces root
├── turbo.json
│
├── packages/shared/                 ← shared TypeScript types + zod schemas
│   └── src/
│       ├── types/                   ← user.ts, campaign.ts, cashback.ts, api.ts
│       └── schemas/                 ← auth, profile, campaign, poolConfig schemas
│
├── server/                          ← Node.js / Express backend
│   ├── src/
│   │   ├── app.ts                   ← Express factory (webhooks BEFORE express.json)
│   │   ├── server.ts
│   │   ├── config/                  ← env (zod-validated), db, redis, stripe, logger
│   │   ├── routes/                  ← auth, feed, attribution, wallet, advertiser, admin, webhooks
│   │   ├── controllers/             ← thin: parse req → call service → return res
│   │   ├── services/
│   │   │   ├── cashbackEngine.service.ts   ← most critical file
│   │   │   ├── fraudDetection.service.ts
│   │   │   ├── adMatcher.service.ts
│   │   │   ├── poolDistributor.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── analytics.service.ts
│   │   ├── repositories/            ← ALL SQL lives here — no SQL in services
│   │   ├── middleware/              ← authenticate, authorize, validate, rateLimiter, errorHandler
│   │   ├── jobs/                    ← parentFundTransfer (1st), charityDisbursement (15th), expireAttributions
│   │   └── lib/
│   │       ├── payment/
│   │       │   ├── IPaymentProvider.ts     ← interface — enables Stripe→Cashfree swap
│   │       │   └── StripeProvider.ts
│   │       ├── idempotency.ts
│   │       ├── otpService.ts        ← mocked in dev (OTP_MOCK=true)
│   │       └── AppError.ts
│   ├── migrations/                  ← 001–013 SQL files (see docs/SCHEMA.md)
│   ├── seeds/                       ← demo.seed.ts, test.seed.ts
│   └── tests/
│       ├── unit/                    ← cashbackEngine, fraudDetection, poolDistributor, adMatcher
│       └── integration/             ← auth, feed, attribution, webhook, wallet
│
├── web/                             ← React 18 + TypeScript
│   └── src/
│       ├── pages/consumer/          ← Onboarding, Feed, Wallet, Profile
│       ├── pages/advertiser/        ← Dashboard, CampaignCreate, CampaignList, Analytics
│       ├── pages/admin/             ← AdminDashboard, FraudQueue, UserManagement
│       ├── components/              ← AdCard, VideoAdPlayer, CashbackPoolVisualizer, PoolSliders
│       ├── hooks/                   ← useAuth, useFeed, useWallet, useStripe
│       ├── services/api.ts          ← axios instance + all API calls
│       └── store/                   ← authStore, walletStore (Zustand)
│
└── mobile/                          ← Flutter 3.x
    └── lib/
        ├── core/                    ← api_client, auth, errors
        └── features/                ← onboarding, feed, wallet, profile, checkout
```

---

## 3. Technology Stack

### Backend
| Layer | Tech | Notes |
|---|---|---|
| Language | TypeScript 5.x strict | No `any`. Financial bugs caught at compile time |
| Runtime | Node.js 20 LTS | |
| Framework | Express 4.x | |
| Database | PostgreSQL 16 | Raw `pg` — no ORM |
| Cache / Queue | Redis 7.x via `ioredis` | Idempotency, rate limits, retry queue |
| Payments | Stripe Node SDK 14.x | Behind `IPaymentProvider` interface |
| Auth | JWT RS256 via `jsonwebtoken` | |
| Validation | `zod` 3.x | All inputs + env vars |
| Logging | `pino` + `pino-http` | Structured JSON. Never console.log |
| Scheduler | `node-cron` | Monthly jobs |
| Error tracking | Sentry `@sentry/node` | |
| Testing | `jest` + `supertest` | |

### Frontend
| Layer | Tech |
|---|---|
| Language | TypeScript 5.x strict |
| Framework | React 18 + Vite |
| Routing | TanStack Router (type-safe) |
| Server state | TanStack Query (caching + polling) |
| Client state | Zustand |
| HTTP | axios (interceptors for auth + errors) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | recharts |
| Forms | react-hook-form + zod |
| Payments | @stripe/react-stripe-js |

### Mobile
| Layer | Tech |
|---|---|
| Framework | Flutter 3.x |
| State | Riverpod 2.x |
| HTTP | Dio 5.x |
| Payments | flutter_stripe 10.x |
| Storage | flutter_secure_storage |
| Navigation | go_router |

---

## 4. Environment Variables

Never commit `.env`. App refuses to start if any required var is missing.

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://adearn:adearn@localhost:5432/adearn_dev
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=adearn:
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
JWT_EXPIRES_IN=24h
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OTP_MOCK=true
OTP_EXPIRY_SECONDS=120
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=adearn-creatives-dev
AWS_REGION=ap-south-1
EMAIL_MOCK=true
CASHBACK_MAX_PER_TRANSACTION=500
CASHBACK_MIN_PER_TRANSACTION=1
FRAUD_SCORE_THRESHOLD=0.8
ATTRIBUTION_WINDOW_HOURS=24
SENTRY_DSN=
```

`web/.env.example`: `VITE_API_URL` · `VITE_STRIPE_PUBLISHABLE_KEY` · `VITE_SENTRY_DSN`

---

## 5. Critical Business Logic

> Full code implementations in `docs/BUSINESS_LOGIC.md`

### Cashback Engine — 5 writes, 1 transaction
```
BEGIN
  1. INSERT cashback_transactions
  2. UPSERT pool_balances (increment 4 pools + total_earned)
  3. UPDATE campaigns SET spent_to_date += cashbackAmount
  4. UPDATE attribution_sessions SET status=converted
  5. INSERT audit_log
COMMIT — any error → ROLLBACK, no partial writes
```

Pool splits use integer arithmetic (paise). Charity pool gets the remainder. Never floats.

### Webhook Flow
```
POST /webhooks/stripe
  → constructEvent() — invalid sig → 400
  → HTTP 200 immediately (process async)
  → Redis SETNX idempotency — exists → skip
  → SELECT session FOR UPDATE — expired → skip
  → fraudDetection.score() — >0.8 → review queue
  → cashbackEngine.processCashback() [atomic]
  → setImmediate: FCM + WhatsApp + advertiser webhook
```

**CRITICAL:** Webhook route registered BEFORE `express.json()`. Uses `express.raw()`.

### Fraud Detection (score 0.0–1.0, threshold 0.8)
| Rule | Weight | Trigger |
|---|---|---|
| Conversion velocity | 0.40 | > 5 cashbacks same user in 24h |
| New account high-value | 0.30 | Account < 7 days + purchase > ₹5,000 |
| Geo mismatch | 0.20 | Payment IP outside India |
| Profile mismatch | 0.10 | Brand not in declared profile |

### Ad Matching
JSONB overlap query: `campaigns.target_profile->categories` vs `purchase_profiles.categories`. Excludes: ads seen in 48h, over-budget campaigns, non-active status.

---

## 6. API Routes

> Full request/response shapes + error codes in `docs/API.md`

```
Auth:        POST /auth/request-otp  POST /auth/verify-otp
Profile:     GET/PUT /profile        GET/PUT /pool-config
Feed:        GET /feed               POST /feed/:id/view
Attribution: POST /attribution/start  GET /attribution/:id
Wallet:      GET /wallet             GET /transactions   POST /reviews
Advertiser:  POST /advertiser/onboard
             POST/GET /advertiser/campaigns
             GET /advertiser/campaigns/:id/stats
             GET /advertiser/analytics (+ /export)
Admin:       GET/PUT /admin/users/:id/suspend
             GET/PUT /admin/fraud-queue/:id/approve
             GET/PUT /admin/advertisers/:id/approve
             GET /admin/financials  GET /admin/charity-ledger (public)
Webhooks:    POST /webhooks/stripe  (Stripe-Signature only — no JWT)
Health:      GET /health            (always public)
```

Response: `{ success: true, data: T }` or `{ success: false, error: { code, message } }`

---

## 7. Code Conventions

**Hard rules — no exceptions:**
- TypeScript strict — no `any`, no `!` on external data
- No SQL in services — only in `repositories/`
- No business logic in controllers — only parse req + call service + return res
- Parameterised queries only — `$1, $2` — never string interpolation
- `DECIMAL(12,2)` for all money — never `FLOAT`
- All financial DB writes in `BEGIN/COMMIT/ROLLBACK`
- Never `console.log` — always `logger.info/warn/error` with structured fields
- Never hardcode secrets — always `process.env.*`

**Naming:** files `kebab-case.ts` · classes `PascalCase` · functions `camelCase` · constants `UPPER_SNAKE_CASE` · DB columns `snake_case`

**Commits:** `feat(scope): description` · `fix(scope): description` · `test(scope): description`

---

## 8. Security Rules

- Webhook route BEFORE `express.json()` — uses `express.raw()`
- All webhooks verified via `stripe.webhooks.constructEvent()`
- Rate limits: OTP 3/10min · verify 5/5min · API 100/min · admin 200/min
- JWT RS256 with `role` claim: `consumer` / `advertiser` / `admin`
- `SELECT ... FOR UPDATE` on attribution sessions (race condition prevention)
- Admin routes require `role: admin` in JWT — not just auth

---

## 9. Development Commands

```bash
# Setup
cp server/.env.example server/.env
docker-compose up -d

# Migrations & seed
cd server && npm run migrate
cd server && npm run seed:demo        # full demo scenario
cd server && npm run seed:test

# Dev (3 terminals)
cd server && npm run dev              # :3000
cd web    && npm run dev              # :5173
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Test payment
stripe trigger payment_intent.succeeded

# Quality
npm run typecheck && npm run lint && npm run format

# Tests
cd server && npm test
cd server && npm run test:unit
cd server && npm run test:integration
cd server && npm run test:coverage

# Build
cd server && npm run build && cd ../web && npm run build

# Docker
docker-compose down -v               # full reset
```

---

## 10. Phase Tracker

Update checkboxes as tasks complete. Start every session: "Read CLAUDE.md. Phase: X, Task: Y."

### Phase 1 — Foundation (Week 1–4)
- [x] Monorepo scaffold: workspaces, turbo.json, docker-compose, tsconfigs, .gitignore
- [x] `packages/shared` — types + zod schemas
- [x] PostgreSQL migrations 001–013
- [x] Demo seed + test seed
- [x] `config/` — env (zod), db, redis, stripe, logger
- [x] `lib/` — AppError, idempotency, otpService, IPaymentProvider, StripeProvider
- [x] Middleware — authenticate, authorize, validate, rateLimiter, requestLogger, errorHandler
- [x] Auth routes + service (OTP mock + JWT RS256)
- [x] Purchase profile API
- [x] Pool config API (sum validation at DB + zod)
- [x] Ad feed endpoint (JSONB intent-matching)
- [x] Campaign CRUD API
- [x] Advertiser onboarding + pledge signing
- [x] React consumer onboarding wizard
- [x] React advertiser portal skeleton
- [x] GET /health + CI GitHub Actions workflow

### Phase 2 — Cashback Core (Week 5–8)
- [x] Attribution session management (create, lock, expire, convert)
- [x] Stripe PaymentIntent creation endpoint
- [x] Stripe webhook handler (express.raw + constructEvent)
- [x] Redis idempotency guard
- [x] `cashbackEngine.service.ts` — atomic 5-write transaction
- [x] `fraudDetection.service.ts` — 4-rule weighted scoring
- [x] `poolDistributor.service.ts` — integer arithmetic
- [x] `adMatcher.service.ts` — JSONB overlap query
- [x] `expireAttributions.job.ts` — every 5 min cron
- [x] Notification service (FCM + mock email)
- [x] Consumer wallet UI — balances + ledger
- [x] Advertiser spend tracking UI
- [x] Unit tests: cashbackEngine, fraudDetection, poolDistributor
- [x] Integration tests: webhook (happy path + idempotency + fraud)

### Phase 3 — Community, Analytics & Ops (Week 9–12)
- [x] Ad review API + composite score
- [x] Advertiser quality score engine (30-day rolling)
- [x] Score thresholds: warn / pause / suspend
- [x] `parentFundTransfer.job.ts` — 1st of month
- [x] `charityDisbursement.job.ts` — 15th of month + public ledger
- [x] `analytics.service.ts`
- [x] Advertiser analytics dashboard (recharts + PDF export)
- [x] Admin dashboard — fraud queue, users, advertisers
- [x] Audit log viewer
- [x] Sentry integration (server + web)
- [x] Full integration test suite

### Phase 4 — Mobile, Polish & Deploy (Week 13–16)
- [ ] Flutter mobile app — all consumer screens + Stripe checkout
- [ ] In-store QR Payment Link flow
- [ ] Load test: 500 webhooks/min (k6)
- [ ] Full regression pass
- [ ] Railway deploy (backend + DB + Redis)
- [ ] Vercel deploy (frontend)
- [ ] OpenAPI 3.0 spec
- [ ] README with local setup
- [ ] Demo seed verified on deployed URLs
- [ ] APK built for demo device

---

## 11. Session Workflow

**Start every session:**
```
"Read CLAUDE.md.
 Phase: [X] — Task: [exact unchecked item from Phase X]
 Files already created: [list relevant existing files]
 Also read: docs/[RELEVANT.md]"
```

**Domain isolation — separate sessions per domain:**

| Domain | Primary files | Also read |
|---|---|---|
| Backend infra | `config/`, `lib/`, `migrations/` | `docs/SCHEMA.md` |
| Backend auth | `routes/auth*`, `services/auth*` | |
| Backend cashback | `services/cashbackEngine*`, `routes/webhooks*` | `docs/BUSINESS_LOGIC.md` |
| Backend ad server | `services/adMatcher*`, `routes/feed*` | `docs/BUSINESS_LOGIC.md` |
| Backend analytics | `services/analytics*`, `routes/advertiser*` | `docs/API.md` |
| Backend jobs | `jobs/` only | |
| Frontend consumer | `web/pages/consumer/`, `components/` | `docs/API.md` |
| Frontend advertiser | `web/pages/advertiser/` | `docs/API.md` |
| Mobile | `mobile/lib/` entirely | |
| Tests | `server/tests/` — specify file | `docs/TESTING.md` |

**Before ending any session:**
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all pass
- [ ] Phase Tracker checkbox updated

---

## 12. Scope Boundaries

**Out of scope — v1.0:** Mutual fund/SIP, BNPL, physical POS, international advertisers, RTB, AI creatives, UPI (Stripe for demo), NACH, Digilocker KYC, live penny drop.

**Permanently excluded:** Multi-level referral/MLM · Crypto/token rewards

---

## 13. Architecture Decisions

| Decision | Rationale |
|---|---|
| Stripe for demo, Cashfree/Razorpay at production | Best sandbox + CLI; UPI not needed for demo |
| `IPaymentProvider` abstraction | Swap = config change, not a rewrite |
| Raw `pg`, no ORM | Full SQL control for JSONB + atomic financial writes |
| TypeScript strict mode | Financial bugs caught at compile time |
| Routes → controllers → services → repositories | Each layer independently testable |
| `pino` structured logging | JSON logs queryable; 5× faster than Winston |
| Zod at env startup | App refuses to start with missing config |
| HTTP 200 before async webhook processing | Prevents Stripe retry storms |
| Integer arithmetic in pool distributor | Floats cannot be trusted for money |
| `FOR UPDATE` on attribution sessions | Prevents race condition on concurrent webhooks |
| TanStack Query for server state | Live cashback updates via background polling |
| Flutter over React Native | Better mid-range Android perf (Tier-2 target) |
| Railway for deployment | Managed PostgreSQL + Redis + Docker in one platform |

---

## 14. Demo Scenario

`npm run seed:demo` pre-wires everything.

**Accounts:** Consumer `9876543210` · Advertiser `9123456789` · Admin `9000000000` — OTP `123456`

**Campaign:** Mamaearth Vitamin C Serum · ₹1,499 · 3% cashback · Health & Beauty

**11-step flow:**
1. Consumer login → OTP `123456`
2. Purchase profile → Health & Beauty + Mamaearth pre-selected
3. Pool config → 40/30/20/10 + parent bank pre-filled
4. Feed → Mamaearth ad card (3% badge)
5. Tap ad → video plays → attribution session created
6. Stripe checkout → `4242 4242 4242 4242` / `12/34` / `123`
7. Stripe CLI shows `payment_intent.succeeded`
8. Server log: atomic transaction committed (< 3s)
9. Wallet → balances update live
10. Ad review → 5/5/5
11. Advertiser login → 1 conversion · ₹44.97 spend · 100% rate

**What it proves:** intent-matching · performance billing · atomic cashback · idempotency · production-grade engineering

---

## 15. Reference Docs

Read these only in the session where relevant — not every session.

| File | Read when working on |
|---|---|
| `docs/SCHEMA.md` | DB migrations, repository queries, data models |
| `docs/API.md` | Routes, controllers, frontend API calls |
| `docs/BUSINESS_LOGIC.md` | Cashback engine, fraud detection, ad matching, pool distributor |
| `docs/TESTING.md` | Writing tests, test DB setup, required test cases |
| `docs/DEPLOYMENT.md` | Dockerfile, Railway, Vercel, CI/CD, GitHub Actions |

---

*CLAUDE.md — AdEarn v3.0 — Update Section 10 as tasks complete. Add decisions to Section 13.*
