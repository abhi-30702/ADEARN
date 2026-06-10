# AdEarn — Product Requirements Document

---

| Field | Value |
|---|---|
| **Document** | Product Requirements Document |
| **Project** | AdEarn — Project 16 |
| **Version** | 2.0 |
| **Status** | Approved for Development |
| **Build Standard** | Production-level demo — deployable, scalable, auditable |
| **Payment Layer** | Stripe test mode (abstracted behind `IPaymentProvider` for production swap) |
| **Owner** | Abhishek K |
| **Last Updated** | June 2026 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users & Personas](#4-target-users--personas)
5. [Core Concepts & Definitions](#5-core-concepts--definitions)
6. [Solution Architecture](#6-solution-architecture)
7. [Feature Specifications](#7-feature-specifications)
   - 7.1 [Consumer Features](#71-consumer-features)
   - 7.2 [Advertiser Features](#72-advertiser-features)
   - 7.3 [Admin & Ops Features](#73-admin--ops-features)
8. [User Flows](#8-user-flows)
9. [Data Models](#9-data-models)
10. [API Specification](#10-api-specification)
11. [Business Logic Contracts](#11-business-logic-contracts)
12. [Technology Stack](#12-technology-stack)
13. [System Architecture](#13-system-architecture)
14. [Security & Fraud Prevention](#14-security--fraud-prevention)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Development Milestones](#16-development-milestones)
17. [Testing Requirements](#17-testing-requirements)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Risk Register](#19-risk-register)
20. [Compliance & Regulatory](#20-compliance--regulatory)
21. [Cross-Platform Integrations](#21-cross-platform-integrations)
22. [Out of Scope — v1.0](#22-out-of-scope--v10)
23. [Changelog](#23-changelog)

---

## 1. Executive Summary

AdEarn is an **intent-matched, purchase-triggered cashback advertising platform** built for the Indian market.

The advertising industry in India operates on a structurally broken model: advertisers pay billions for impressions, 60–70% of which never reach an actual buyer. Platform intermediaries — Facebook, Google, YouTube — extract 15–30% as a cut regardless of whether the ad ever led to a purchase. The consumer, whose attention and data power the entire system, receives nothing.

AdEarn eliminates the intermediary and realigns every incentive:

- **Consumers** declare what they buy → see only relevant ads → earn 1–5% cashback on confirmed purchases
- **Advertisers** pay only on confirmed purchase completion — zero wasted impression spend
- **Cashback** auto-distributes across four user-defined financial pools: liquid, self-savings, parent fund, and charity

The result is the first platform where every rupee of advertising spend either confirms a sale or returns to the consumer as real money.

**One-line pitch:** *Get paid in real cashback for purchases you were already going to make.*

### The Three Invariants

These rules are absolute and must never be violated in any version of the product:

1. **Cashback is atomic.** Every pool distribution is a single PostgreSQL transaction. Partial writes are a financial bug.
2. **Advertiser billing follows cashback.** Advertisers are charged only after cashback is successfully committed — never before.
3. **Every webhook is idempotent.** Double-processing the same payment event must be architecturally impossible.

---

## 2. Problem Statement

### 2.1 The Broken Advertising Economy

India's digital advertising market spends approximately **₹15,000 crore annually**. The structural problems are:

| Stakeholder | Current Reality | Economic Impact |
|---|---|---|
| Advertiser | Pays per impression regardless of conversion | 60–70% of spend reaches no buyer |
| Consumer | Attention and data monetised without compensation | Zero economic return |
| Society | Ad platform intermediaries extract 15–30% of every rupee | ₹2,250–4,500 Cr extracted annually as pure intermediary fee |

### 2.2 Root Cause: Misaligned Incentives

The system is broken not because of malice but because of misaligned incentives at every layer:

- **Ad platforms** are paid per impression — they are incentivised to maximise volume, not conversion quality
- **Advertisers** have no mechanism to reach only confirmed buyers — they must spray and pray
- **Consumers** have no economic incentive to engage honestly — they gain nothing either way

### 2.3 How AdEarn Fixes Each Misalignment

| Stakeholder | Problem | AdEarn Fix |
|---|---|---|
| Platform | Paid per impression | AdEarn earns only on confirmed purchase |
| Advertiser | Pays for non-converters | Billed only on confirmed conversion |
| Consumer | Gets nothing | Receives 1–5% cashback + auto-savings |

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- Build India's first purchase-triggered, intent-matched cashback advertising marketplace
- Achieve advertiser conversion ROI measurably superior to Meta and Google benchmarks
- Generate meaningful recurring passive income for consumers through honest ad engagement
- Automate personal financial discipline through cashback pool auto-distribution
- Establish cross-ecosystem financial identity via EduCIBIL and SkillsDrome integrations

### 3.2 KPIs

| Metric | Month 3 | Month 6 | Month 12 | Measurement Method |
|---|---|---|---|---|
| Monthly Active Users (MAU) | 2,000 | 10,000 | 1,00,000 | Users with ≥1 transaction in 30 days |
| Active Advertisers | 10 | 50 | 500 | Advertisers with live campaign |
| Ad-to-Purchase Conversion Rate | > 8% | > 12% | > 20% | Conversions / Attribution sessions |
| Advertiser ROI vs. traditional | 1.2× | 1.5× | 2.5× | AdEarn CPL vs. Meta/Google benchmark |
| Avg. monthly cashback per user | ₹60 | ₹150 | ₹500 | Total cashback / MAU |
| Cashback disbursed (monthly) | ₹1.2L | ₹15L | ₹5Cr | Sum of completed cashback_transactions |
| Parent fund transferred (monthly) | ₹25,000 | ₹1L | ₹10L | Sum of parent_amount in completed jobs |
| Charity pool distributed (monthly) | ₹12,500 | ₹50,000 | ₹5L | Sum of charity_amount in completed jobs |
| Cashback fraud rate | < 2% | < 1% | < 0.5% | Reversed transactions / Total transactions |
| Webhook processing latency (p99) | < 10s | < 5s | < 3s | Time from webhook receipt to DB commit |

### 3.3 Demo Success Criteria (College Presentation)

The demo is considered successful if a panel observer can independently verify:

- An ad appeared in the feed only because the user declared that brand in their purchase profile
- Cashback was credited within 5 seconds of a Stripe test payment confirming
- The cashback amount split correctly across all four pools
- The advertiser was billed the correct amount on their dashboard
- The same payment cannot trigger cashback twice (idempotency demo)

---

## 4. Target Users & Personas

### 4.1 Consumer Personas

#### Persona A — Riya, Urban Millennial (Primary)

| Attribute | Value |
|---|---|
| Age | 26 |
| City | Pune |
| Income | ₹45,000/month |
| Devices | iPhone 13 + MacBook |
| Spending | ₹8,000–12,000/month online |

**Behaviour:** Shops online weekly; brand-loyal in skincare, apparel, and food delivery. Sees 200+ ads per day across platforms. Sends ₹3,000/month to parents via UPI.

**Pain points:** Irrelevant ads all day. Gets nothing for her attention. Manual parent transfers forget sometimes.

**Goals:** Earn cashback on purchases she was already making. Automate parent fund. Build savings without thinking about it.

**Journey:** Onboards via web → declares Mamaearth + Myntra + Zomato → sets parent fund 20% → earns ₹150–400/month cashback → parent gets ₹30–80 automatically

---

#### Persona B — Arjun, Tier-2 City User (Growth Segment)

| Attribute | Value |
|---|---|
| Age | 22 |
| City | Nashik |
| Income | ₹18,000/month |
| Devices | Redmi Android (2GB RAM) |
| Spending | ₹3,000–5,000/month online |

**Behaviour:** Primary device Android, uses UPI for everything, active on WhatsApp, watches YouTube for hours. Wants to save but has no system.

**Pain points:** No savings discipline. Sees irrelevant ads constantly. Income too low to feel savings are worthwhile.

**Goals:** Small but consistent cashback that adds up. Savings happen automatically without willpower. Charity feels good.

**Journey:** Onboards via WhatsApp link → mobile app → declares Boat + Flipkart + Swiggy → 10% to charity (CRY) → earns ₹40–80/month

---

#### Persona C — Priya, Working Parent (Retention Segment)

| Attribute | Value |
|---|---|
| Age | 34 |
| City | Bengaluru |
| Income | ₹80,000/month |
| Devices | Samsung + iPad |
| Spending | ₹25,000–40,000/month online |

**Behaviour:** High-spend across groceries, electronics, children's products. Two ageing parents in hometown. Wants data to work for her. Reads community reviews.

**Pain points:** High spend but no rewards loyalty. Worried about parents' financial security. Sceptical of advertising claims.

**Goals:** Maximum cashback volume. Savings goal (education fund for child). Reliable parent fund.

**Journey:** Sets 30% savings + 25% parent fund + 5% charity → earns ₹500–1,000/month → reviews ads actively → becomes top community reviewer

---

### 4.2 Advertiser Personas

#### Persona D — D2C Brand (SME Advertiser)

| Attribute | Value |
|---|---|
| Company | 10–50 employees |
| Monthly ad budget | ₹2–10L |
| Current channels | Meta, Google Ads, influencer |
| Pain point | CAC too high; can't verify if ads reach actual buyers |
| Goal | Pay per confirmed buyer; audience quality data |

**Journey:** Signs up → passes anti-surge pledge → uploads video creative → sets 3% cashback rate → sees conversion dashboard → compares ROI vs. Meta → converts to long-term advertiser

---

#### Persona E — Enterprise FMCG Brand

| Attribute | Value |
|---|---|
| Company | 500+ employees |
| Monthly ad budget | ₹50L+ |
| Current channels | TV, OTT, programmatic |
| Pain point | No direct conversion data from mass media; high intermediary costs |
| Goal | Reach declared buyers; lower effective CPL; API access for CRM |

**Journey:** Business development deal → custom cashback rate negotiation → API integration with CRM → monthly ROI report → multi-brand campaign strategy

---

## 5. Core Concepts & Definitions

| Term | Definition |
|---|---|
| **Declared Purchase Intent** | A user's self-reported monthly list of brands, products, and categories they actively buy. The sole input to the ad-matching engine. No behavioural inference. |
| **Attribution Session** | A 24-hour time window created when a user views an ad. If a purchase occurs within this window, cashback is triggered. |
| **Attribution Window** | 24 hours from ad view start. Purchases outside this window do not qualify for cashback. |
| **Cashback Pool** | One of four auto-distribution buckets: liquid, self-savings, parent fund, charity. |
| **Conversion Event** | A confirmed Stripe `payment_intent.succeeded` webhook that triggers the cashback engine. |
| **Cashback Rate** | 1–5% of confirmed purchase price, set by advertiser per campaign. |
| **Pool Config** | User's percentage allocation across 4 pools. Must sum to 100. Enforced at DB and API layers. |
| **Advertiser Quality Score** | Rolling 30-day weighted average of community ad ratings (Relevance 40% + Honesty 40% + Value 20%). |
| **Anti-Surge Pledge** | Contractual commitment by advertiser not to raise prices on items advertised on AdEarn. |
| **Parent Fund** | The percentage of cashback automatically transferred to the user's registered parent/guardian bank account monthly. |
| **Fraud Score** | A 0.0–1.0 risk score computed by the fraud detection rule engine. Above threshold (0.8) → manual review queue. |
| **Idempotency Key** | `payment_intent_id` from Stripe — used to ensure a cashback event is processed exactly once even if the webhook is received multiple times. |
| **Platform Fee** | 8% of cashback amount. AdEarn's operational margin on each confirmed conversion. |
| **IPaymentProvider** | The TypeScript interface that abstracts payment processing — allows Stripe → Cashfree/Razorpay swap at production without touching business logic. |

---

## 6. Solution Architecture

### 6.1 Core Value Pipeline

```
USER ACTION                           SYSTEM ACTION
─────────────────────────────────────────────────────────────────
Declares purchase profile          →  Stored in purchase_profiles (JSONB)
                                       JSONB GIN index built for fast matching
Views ad feed                      →  adMatcher queries JSONB overlap
                                       Returns campaigns matching declared categories
Taps ad → watches creative         →  Attribution session created (24hr window)
                                       payment_intent created on Stripe
Completes purchase                 →  Stripe payment_intent.succeeded webhook
                                       Signature verified via constructEvent
Cashback computed                  →  cashback = purchase_amount × cashback_rate
                                       Capped at ₹500, minimum ₹1
Fraud scored                       →  4-rule engine, weighted score 0.0–1.0
                                       >0.8 → manual review queue
Atomic distribution                →  BEGIN PostgreSQL transaction
                                       Insert cashback_transactions
                                       Update pool_balances (4 pools)
                                       Update campaign spent_to_date
                                       Mark attribution_session converted
                                       Insert audit_log entry
                                       COMMIT
Post-commit (async)                →  Push notification (FCM)
                                       WhatsApp message (opted-in users)
                                       Advertiser webhook (if configured)
                                       Mixpanel conversion event
Advertiser billed                  →  Charge = purchase_amount × cashback_rate + 8% platform fee
```

### 6.2 Cashback Pool Distribution

| Pool | Default | Minimum | Destination | Transfer Schedule |
|---|---|---|---|---|
| Liquid | 40% | 0% | Instantly spendable — user wallet | Immediate |
| Self-savings | 30% | 0% | Goal-linked savings | Accumulates in pool_balances |
| Parent fund | 20% | 0% | Direct bank transfer to registered parent | 1st of each month (min ₹100) |
| Charity | 10% | 0% | User-selected 80G-registered NGO | 15th of each month (batched) |

Rules:
- All four pool percentages must sum to exactly 100 (enforced by DB constraint AND zod schema)
- Minimum 2 pools must be active (non-zero)
- Charity to 0% is allowed but parent fund name changes to "Social Impact Fund" in UI

### 6.3 Billing Model

```
Advertiser Charge  =  (purchase_amount × cashback_rate) + Platform Fee
Platform Fee       =  8% of cashback amount
Net to Consumer    =  cashback_amount (100% — platform fee is on top, not deducted)

Example:
  Purchase: ₹1,499
  Cashback rate: 3%
  Cashback to consumer: ₹44.97
  Platform fee: ₹3.60 (8% of ₹44.97)
  Total advertiser charge: ₹48.57
  Consumer receives: ₹44.97 (liquid ₹17.99 / savings ₹13.49 / parent ₹8.99 / charity ₹4.50)
```

---

## 7. Feature Specifications

### 7.1 Consumer Features

---

#### F-C01 — User Purchase Profile

**Priority:** P0 | **Phase:** 1 | **Owner:** Frontend

**Description:** Users declare the brands, categories, and spending patterns that define their purchase intent. This is the foundational input to the entire matching engine. No ads are served without a profile.

**Functional Requirements:**

- Multi-step onboarding wizard: category selection → brand selection → spend range → frequency
- Category taxonomy: FMCG, Electronics, Apparel, Food & Beverage, Health & Beauty, Home & Kitchen, Travel, Sports, Books & Education
- Brand-level declaration within each selected category
- Spend range per category: ₹500–1K / ₹1K–5K / ₹5K–10K / ₹10K+
- Purchase frequency: Daily / Weekly / Monthly / Occasionally
- Profile completeness score: users with < 2 active categories see a completion nudge
- Update cycle: profile editable once every 30 days; next update date shown in UI
- Linked UPI ID field (informational in demo; functional in production)
- Profile versioned — each update creates a new record; previous version retained for audit

**Acceptance Criteria:**

- Full onboarding completable in ≤ 5 minutes on a 3G Android connection
- Profile data encrypted at rest (AES-256 via RDS encryption)
- Users with < 2 categories see guided prompt on every login until resolved
- Update timestamp and next-update-at always displayed in profile settings

---

#### F-C02 — Personalised Ad Feed

**Priority:** P0 | **Phase:** 1 | **Owner:** Frontend

**Description:** The ad feed is the user-facing surface of the intent-matching engine. Every ad shown must match the user's declared purchase profile. Zero speculative, behavioural, or lookalike targeting exists.

**Functional Requirements:**

- Feed populated exclusively from declared-intent matches (JSONB overlap query)
- Ad formats v1: video (15–60 sec MP4), banner (static JPG/PNG), audio (30–60 sec MP3 via WhatsApp/call)
- Each ad card displays: brand name, product name, cashback rate %, estimated cashback amount in ₹, creative thumbnail
- Anti-duplicate rule: same ad not shown to same user within 48 hours
- Feed refresh: every 6 hours or manual pull-to-refresh
- Ad load time ≤ 2 seconds on 4G
- Empty state: clear CTA to expand purchase profile if no matched campaigns exist
- Feed sorted: by cashback rate (desc) then advertiser quality score (desc)
- Audit log: every ad view recorded with timestamp for attribution session creation

**Acceptance Criteria:**

- 100% of served ads match ≥ 1 declared category (verifiable via audit log)
- No ad from a brand outside the user's declared profile ever appears
- Empty state shown immediately when no campaigns match — never blank screen
- Video ads autoplay muted; tap to unmute

---

#### F-C03 — Instant Cashback Engine

**Priority:** P0 | **Phase:** 2 | **Owner:** Backend

**Description:** The cashback engine is the financial core of AdEarn. It listens to Stripe `payment_intent.succeeded` webhooks and executes a single atomic PostgreSQL transaction distributing cashback to all four pools simultaneously.

**Functional Requirements:**

- Webhook endpoint: `POST /api/v1/webhooks/stripe`
- Signature verification: `stripe.webhooks.constructEvent(payload, sig, secret)` on every event
- Attribution window: purchase must occur within 24 hours of ad view to qualify
- Cashback calculation: `purchase_amount × cashback_rate`
- Maximum cashback per transaction: ₹500 (hard cap, fraud prevention)
- Minimum cashback per transaction: ₹1 (below this, pooled to next month's payout)
- Idempotency: `payment_intent_id` checked against Redis before processing; duplicate → skip + log
- Fraud check: score computed before any DB write; score > 0.8 → manual review queue
- Atomic write: all 5 DB operations inside one `BEGIN/COMMIT` transaction
- Retry logic: failed cashback auto-retried 3× at 1-min intervals; after 3 failures → manual queue
- Refund handling: if Stripe refund webhook received within 7 days → reverse cashback from pools
- User notification: in-app push + WhatsApp (opted-in) within 5 seconds of commit
- Advertiser billing: charge created in Stripe after cashback commit

**Cashback Atomic Transaction — 5 writes, 1 transaction:**

```
BEGIN
  1. INSERT cashback_transactions (all amounts, fraud_score, status=completed)
  2. UPSERT pool_balances (increment all 4 pool amounts + total_earned)
  3. UPDATE campaigns SET spent_to_date = spent_to_date + cashback_amount
  4. UPDATE attribution_sessions SET status=converted, converted_at=NOW(), payment_intent_id=...
  5. INSERT audit_log (event=cashback.processed, all amounts)
COMMIT
```

**Acceptance Criteria:**

- Cashback credited to pool_balances within 3 seconds of webhook receipt (p95)
- Webhook signature validated on 100% of events — unsigned events → 400, logged
- Zero double-credit possible (idempotency enforced at Redis layer before any DB access)
- Retry queue fully drains within 10 minutes under normal load
- Rollback verifiable: DB state unchanged after any mid-transaction failure
- Platform fee (8%) added to advertiser charge on top of consumer cashback

---

#### F-C04 — Auto-Savings Pool Distribution

**Priority:** P0 | **Phase:** 2 | **Owner:** Frontend + Backend

**Description:** Every cashback event automatically routes money into four user-defined pools without any user action required. Users configure percentages once; the system handles all distribution.

**Functional Requirements:**

- Pool config UI: four percentage inputs (Liquid / Self-savings / Parent fund / Charity)
- Real-time validation: must sum to 100, all values ≥ 0, at least 2 non-zero
- Self-savings goal: optional label (e.g. "Emergency Fund") + target amount; progress bar in UI
- Parent fund: requires parent's name + bank IFSC + account number; verified via mock penny drop (confirmed penny drop at production)
- Parent fund transfer schedule: automated on the 1st of each month; minimum ₹100 balance to trigger; carried forward if below minimum
- Charity pool: user selects NGO from pre-vetted list (updateable once every 90 days)
- Charity disbursements: batched on 15th of each month; public audit ledger at `GET /api/v1/admin/charity-ledger` (no auth)
- All pool adjustments take effect on the next cashback event (no retroactive redistribution)

**Acceptance Criteria:**

- Pool config change reflected within 0ms on next cashback event
- Parent fund penny drop (mock) completes in ≤ 2 seconds
- Monthly parent transfers initiated within 1 hour of midnight on the 1st
- Public charity ledger accessible without authentication
- Pool percentages enforced at both DB level (CHECK constraint) and API level (zod)

---

#### F-C05 — Community Ad Review

**Priority:** P1 | **Phase:** 3 | **Owner:** Frontend

**Description:** Post-cashback rating system that generates advertiser quality scores, drives platform quality, and gives consumers a voice about advertising practices.

**Functional Requirements:**

- Rating prompt: appears 5 seconds after cashback notification; dismissible once
- Three rating dimensions:
  - **Relevance** (40% weight): "Was this ad for something you actually buy?"
  - **Honesty** (40% weight): "Was the product accurately represented?"
  - **Value** (20% weight): "Was the cashback worth your engagement?"
- Each dimension: 1–5 star rating (required; cannot submit with any blank)
- Composite score: `(relevance × 0.4) + (honesty × 0.4) + (value × 0.2)`
- Flag option: users can flag ads for specific violations (misleading claim / price surge / irrelevant / spam)
- One review per user per transaction (unique constraint enforced)
- Advertiser quality score: rolling 30-day average of all composite scores for that advertiser's campaigns

**Quality Score Thresholds:**

| Score Range | Action | Notification |
|---|---|---|
| ≥ 4.5 | Preferred feed placement (no extra cost) | None |
| 3.0 – 4.5 | Normal operation | None |
| < 3.0 | Warning issued | Email to advertiser |
| < 2.5 | Campaign paused (auto) | Email + dashboard alert |
| < 2.0 for 30 days | Account suspended | Email + admin notification |

**Acceptance Criteria:**

- Composite score computed correctly for all edge cases
- Quality score recalculates within 1 minute of new review submission
- Suspended campaigns immediately stop appearing in any user's feed
- Flagged ads enter review queue within 5 minutes; admin notified

---

#### F-C06 — Wallet & Transaction Ledger

**Priority:** P0 | **Phase:** 2 | **Owner:** Frontend

**Description:** The consumer's financial dashboard showing real-time pool balances, savings goal progress, full transaction history, and pool distribution breakdown per transaction.

**Functional Requirements:**

- Four pool balance cards with live values (TanStack Query polling every 30 seconds)
- Savings goal widget: goal name, target amount, current balance, progress percentage bar
- Transaction list: paginated (20 per page), reverse chronological
- Per-transaction detail: brand, product, purchase amount, cashback amount, pool breakdown, status, timestamp
- Filter by: date range, campaign/brand, status (completed / under_review / reversed)
- Lifetime stats: total earned, total transactions, avg cashback per purchase
- Download statement: CSV export of transaction history (any date range)

**Acceptance Criteria:**

- Pool balances update within 35 seconds of cashback event (30s poll + 5s buffer)
- Paginated list handles 1,000+ transactions without performance degradation
- CSV export includes all fields with correct decimal formatting

---

#### F-C07 — WhatsApp & Audio Ad Integration

**Priority:** P1 | **Phase:** 3 | **Owner:** Backend

**Description:** Audio-format ad delivery via WhatsApp Business API for users who prefer not to use the app actively. Critical for Tier-2/3 user reach.

**Functional Requirements:**

- WhatsApp opt-in: user subscribes to AdEarn WhatsApp number; explicit consent stored with timestamp
- Ad delivery: audio message (30–60 sec) sent via WhatsApp Cloud API; includes brand, cashback rate, and purchase link
- Attribution: purchase within 24 hours of WhatsApp ad delivery qualifies for cashback
- Opt-out: "STOP" reply → immediate unsubscription (within 60 seconds)
- Frequency cap: maximum 2 WhatsApp audio ads per user per week (server-enforced, not client-enforced)
- Opt-in required explicitly — never auto-enrolled
- Call ad format: outbound IVR call (separate opt-in); user presses 1 to receive SMS purchase link

**Acceptance Criteria:**

- STOP opt-out honoured within 60 seconds
- Frequency cap enforced server-side with Redis counter
- Audio ad delivered within 30 minutes of campaign trigger
- Zero users receive ads without explicit opt-in on record

---

### 7.2 Advertiser Features

---

#### F-A01 — Campaign Manager

**Priority:** P0 | **Phase:** 1 | **Owner:** Frontend + Backend

**Description:** Self-serve web portal for advertisers to create, manage, monitor, and analyse ad campaigns.

**Functional Requirements:**

**Onboarding:**
- Company name, GST number (15-char format validated), contact details
- Bank account for billing (IFSC + account number)
- Stripe customer creation (demo: Stripe test mode)
- Anti-surge pledge: mandatory checkbox with full pledge text visible; blocks form submission if unchecked
- Pledge stored with timestamp and IP address for audit

**Campaign Creation Wizard:**
- Campaign name + description
- Creative upload: video (MP4, max 100MB, 15–60 sec) / banner (JPG/PNG, max 5MB) / audio (MP3, max 10MB, 30–60 sec)
- Creatives uploaded to AWS S3 via presigned URL; served via CloudFront
- Target profile: select categories + optionally subcategories + brands
- Cashback rate: slider 1–5% (increments of 0.5%)
- Daily spend cap: minimum ₹500/day
- Total campaign budget
- Campaign start and end dates
- Creative preview before submission

**Campaign Lifecycle States:**

```
draft → pending_review → active → paused → completed
                       ↓
                  suspended (by admin or quality score breach)
```

**Acceptance Criteria:**

- Campaign creation completable in ≤ 10 minutes
- Creative upload validated client-side for format + size before S3 upload
- Anti-surge pledge non-skippable (form submit disabled without check)
- Campaign goes live within 15 minutes of admin approval
- Paused campaigns stop serving immediately (feed query excludes status ≠ active)

---

#### F-A02 — Conversion Tracking API

**Priority:** P0 | **Phase:** 2 | **Owner:** Backend

**Description:** Technical infrastructure connecting purchase confirmation to ad view attribution.

**Functional Requirements:**

- Online purchase: Stripe `payment_intent.succeeded` webhook
- In-store purchase: Stripe Payment Link QR code → user pays → Payment Link webhook fires → same attribution engine
- Attribution session: created on ad view; expires 24 hours later
- Deduplication: `payment_intent_id` is a UNIQUE constraint in `attribution_sessions`; duplicate = 409
- Advertiser-side webhook (optional): AdEarn fires conversion event to advertiser's configured endpoint on each confirmed sale
- Attribution session status visible to advertiser in campaign detail (open / converted / expired counts)
- Advertiser webhook signed with HMAC-SHA256; signature header `X-AdEarn-Signature`

**Acceptance Criteria:**

- Attribution session created within 200ms of ad view event
- Webhook processed within 500ms of Stripe delivery
- 409 Conflict returned for duplicate `payment_intent_id` — no double processing
- Advertiser webhook delivery retried 3× on failure; logged on all outcomes

---

#### F-A03 — Analytics Dashboard

**Priority:** P1 | **Phase:** 3 | **Owner:** Frontend + Backend

**Description:** Real-time campaign performance dashboard showing conversions, spend, audience quality, and ROI benchmarking.

**Functional Requirements:**

- Summary KPI cards: total spend, total conversions, conversion rate, avg cashback paid, quality score
- Time-series charts (recharts): daily spend, daily conversions, conversion rate trend (last 30 days)
- Audience quality breakdown: % of converters who are declared buyers in target category
- Campaign-level drilldown: all metrics filterable per campaign
- ROI comparison: AdEarn effective CPL vs. Meta/Google industry benchmarks (static reference in v1; live API in v2)
- Quality score history chart: 30-day rolling score trend
- Export: PDF report (branded, server-generated via pdfkit) + CSV raw data
- Date range picker: any custom range, presets for last 7/30/90 days
- Enterprise API access: REST endpoints for advertiser stats, API key authentication

**Acceptance Criteria:**

- Dashboard data refreshes every 5 minutes (TanStack Query background polling)
- PDF report generated and downloadable within 30 seconds
- All charts render correctly on 1280px and 1920px widths
- API response ≤ 500ms for any date range up to 90 days

---

### 7.3 Admin & Ops Features

---

#### F-O01 — Admin Dashboard

**Priority:** P1 | **Phase:** 3 | **Owner:** Frontend + Backend

**Description:** Internal operations dashboard for platform management, fraud review, and financial oversight.

**Functional Requirements:**

**User Management:**
- Search users by mobile, name, email
- View full profile, transaction history, fraud flags
- Suspend / restore / delete accounts
- View and edit KYC status

**Advertiser Management:**
- Approve / reject / suspend advertiser accounts
- Override quality score threshold actions
- View all campaigns across all advertisers
- Approve / reject / suspend individual campaigns with reason

**Fraud Queue:**
- List all transactions with status `under_review`
- Per-transaction: fraud score breakdown, user history, purchase context
- Approve cashback (releases to user) or reject (reverses and flags account)
- Bulk approve / reject

**Financial Overview:**
- Total cashback disbursed (today / month / all time)
- Platform fees collected
- Parent fund transfers pending + completed
- Charity pool accumulated per NGO
- Campaign spend across all advertisers

**NGO Management:**
- Add / remove NGOs from charity list
- View accumulated balance per NGO
- Trigger manual disbursement

**System Health:**
- Webhook queue depth (Redis)
- Retry queue depth
- Recent errors (Sentry link)
- DB connection pool status

**Audit Log Viewer:**
- Full audit_log table, filterable by actor, entity type, action, date range
- Immutable — no delete or edit from admin UI

**Acceptance Criteria:**

- All admin actions recorded in audit_log with actor_id, IP, timestamp
- Fraud queue action (approve/reject) reflected in user wallet within 30 seconds
- Admin routes protected by `role: admin` JWT claim — not just authentication

---

## 8. User Flows

### 8.1 Consumer Onboarding

```
Landing / App install
        ↓
Mobile number entry
        ↓
OTP sent (Twilio SMS / console log in demo)
        ↓
OTP verification → JWT issued (access + refresh tokens)
        ↓
Name + email collection
        ↓
KYC screen (mocked in demo: auto-approved; real Digilocker at production)
        ↓
Purchase Profile Setup
  Step 1: Category selection (pick ≥ 2)
  Step 2: Brand selection per category
  Step 3: Spend range + frequency per category
        ↓
Pool Configuration
  Four sliders defaulting to 40/30/20/10
  [if parent > 0%] → parent bank account entry → penny drop mock verification
  [if charity > 0%] → NGO selection
        ↓
Savings goal setup (optional)
        ↓
Home screen (Ad feed)
```

### 8.2 Cashback Earn Flow (Happy Path)

```
User opens ad feed (GET /api/v1/feed)
        ↓
Ad card displayed (matched to declared profile)
        ↓
User taps ad → video/audio plays full-screen
        ↓
POST /api/v1/attribution/start
  → Attribution session created (24hr window)
  → Stripe PaymentIntent created with metadata.adearn_session_id
  → client_secret returned to frontend
        ↓
Stripe Checkout / Elements shown
        ↓
User completes payment (test card 4242...)
        ↓
Stripe sends payment_intent.succeeded webhook
        ↓
POST /api/v1/webhooks/stripe received
  → Signature verified
  → Idempotency check (Redis) — passes
  → Fraud score computed — below threshold
  → Atomic transaction:
      INSERT cashback_transactions
      UPSERT pool_balances
      UPDATE campaigns.spent_to_date
      UPDATE attribution_sessions.status = converted
      INSERT audit_log
  → COMMIT
        ↓
Async post-commit:
  → FCM push notification
  → WhatsApp message (if opted in)
        ↓
User sees wallet update (TanStack Query refetch)
        ↓
Post-cashback rating prompt shown (5 sec delay)
        ↓
User rates ad (relevance + honesty + value)
        ↓
Advertiser quality score updated
```

### 8.3 Advertiser Campaign Flow

```
Advertiser signup
  → GST number verified (format check)
  → Stripe customer created
  → Anti-surge pledge signed
        ↓
Campaign creation wizard (F-A01)
        ↓
Creative uploaded to S3 via presigned URL
        ↓
Campaign submitted → status: pending_review
        ↓
Admin reviews (SLA: 4 business hours) → approved
        ↓
Campaign status: active → appears in consumer feed
        ↓
Conversion events fire → cashback distributed → advertiser billed
        ↓
Daily spend cap monitoring (cron job checks every hour)
        ↓
Campaign end date reached OR budget exhausted → status: completed
        ↓
Final performance report available for download
```

### 8.4 Fraud Review Flow

```
payment_intent.succeeded received
        ↓
Fraud score computed > 0.8
        ↓
Cashback transaction inserted with status: under_review
        ↓
Admin notified (email + fraud queue UI update)
        ↓
Admin reviews:
  [Approve] → UPDATE cashback_transactions SET status=completed
              → UPSERT pool_balances (add amounts)
              → Notify user
  [Reject]  → UPDATE cashback_transactions SET status=reversed
             → audit_log entry with reason
             → User account flag incremented
             → If 3+ flags → account review
```

---

## 9. Data Models

All tables use:
- `UUID` primary keys via `gen_random_uuid()`
- `TIMESTAMPTZ` for all timestamps (never `TIMESTAMP`)
- `DECIMAL(12,2)` for all financial amounts (never `FLOAT`)
- `NOT NULL` on all required fields
- `CHECK` constraints on all enums and business rules

```sql
-- ────────────────────────────────────────────────────────────────
-- Migration 001: Extensions
-- ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- Migration 002: users
-- ────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile       VARCHAR(15) UNIQUE NOT NULL,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255),
  kyc_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (kyc_status IN ('pending','verified','rejected')),
  role         VARCHAR(20) NOT NULL DEFAULT 'consumer'
               CHECK (role IN ('consumer','advertiser','admin')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  fraud_flags  SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- Migration 003: purchase_profiles
-- ────────────────────────────────────────────────────────────────
CREATE TABLE purchase_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categories     JSONB NOT NULL DEFAULT '[]',
  -- format: [{ category: string, brands: string[], spend_range: string, frequency: string }]
  version        SMALLINT NOT NULL DEFAULT 1,
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_update_at TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

-- ────────────────────────────────────────────────────────────────
-- Migration 004: pool_configs
-- ────────────────────────────────────────────────────────────────
CREATE TABLE pool_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liquid_pct      SMALLINT NOT NULL DEFAULT 40,
  savings_pct     SMALLINT NOT NULL DEFAULT 30,
  parent_pct      SMALLINT NOT NULL DEFAULT 20,
  charity_pct     SMALLINT NOT NULL DEFAULT 10,
  savings_goal    VARCHAR(255),
  savings_target  DECIMAL(12,2),
  parent_account  JSONB,
  -- format: { ifsc: string, account_number: string, name: string, verified: boolean }
  charity_ngo_id  UUID REFERENCES ngos(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pool_pct_sum     CHECK (liquid_pct + savings_pct + parent_pct + charity_pct = 100),
  CONSTRAINT pool_non_negative CHECK (liquid_pct >= 0 AND savings_pct >= 0
                                   AND parent_pct >= 0 AND charity_pct >= 0)
);

-- ────────────────────────────────────────────────────────────────
-- Migration 005: ngos
-- ────────────────────────────────────────────────────────────────
CREATE TABLE ngos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  registration_no     VARCHAR(100) UNIQUE NOT NULL,
  cause               VARCHAR(50) NOT NULL
                      CHECK (cause IN ('education','environment','elderly_care','healthcare')),
  bank_account        JSONB NOT NULL,
  accumulated_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- Migration 006: advertisers
-- ────────────────────────────────────────────────────────────────
CREATE TABLE advertisers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name       VARCHAR(255) NOT NULL,
  gst_number         VARCHAR(20) UNIQUE NOT NULL,
  contact_email      VARCHAR(255) NOT NULL,
  contact_mobile     VARCHAR(15) NOT NULL,
  billing_account    JSONB,
  quality_score      DECIMAL(3,2) NOT NULL DEFAULT 5.00
                     CHECK (quality_score BETWEEN 0 AND 5),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','suspended')),
  pledge_signed      BOOLEAN NOT NULL DEFAULT false,
  pledge_signed_at   TIMESTAMPTZ,
  pledge_ip          INET,
  stripe_customer_id VARCHAR(255),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- Migration 007: campaigns
-- ────────────────────────────────────────────────────────────────
CREATE TABLE campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  creative_url     VARCHAR(500) NOT NULL,
  creative_type    VARCHAR(10) NOT NULL
                   CHECK (creative_type IN ('video','banner','audio')),
  target_profile   JSONB NOT NULL,
  -- format: { categories: string[], brands: string[], subcategories: string[] }
  cashback_rate    DECIMAL(4,3) NOT NULL
                   CHECK (cashback_rate BETWEEN 0.01 AND 0.05),
  daily_cap        DECIMAL(12,2) NOT NULL CHECK (daily_cap >= 500),
  total_budget     DECIMAL(12,2) NOT NULL CHECK (total_budget > 0),
  spent_to_date    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN
                     ('draft','pending_review','active','paused','completed','suspended')),
  rejection_reason TEXT,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES users(id),
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- Migration 008: attribution_sessions
-- ────────────────────────────────────────────────────────────────
CREATE TABLE attribution_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_viewed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','converted','expired')),
  converted_at      TIMESTAMPTZ,
  payment_intent_id VARCHAR(255) UNIQUE,
  purchase_amount   DECIMAL(12,2),
  cashback_amount   DECIMAL(12,2),
  CONSTRAINT expires_after_view CHECK (expires_at > ad_viewed_at)
);

-- ────────────────────────────────────────────────────────────────
-- Migration 009: cashback_transactions
-- ────────────────────────────────────────────────────────────────
CREATE TABLE cashback_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribution_id  UUID NOT NULL REFERENCES attribution_sessions(id),
  purchase_amount DECIMAL(12,2) NOT NULL CHECK (purchase_amount > 0),
  cashback_amount DECIMAL(12,2) NOT NULL CHECK (cashback_amount > 0),
  liquid_amount   DECIMAL(12,2) NOT NULL CHECK (liquid_amount >= 0),
  savings_amount  DECIMAL(12,2) NOT NULL CHECK (savings_amount >= 0),
  parent_amount   DECIMAL(12,2) NOT NULL CHECK (parent_amount >= 0),
  charity_amount  DECIMAL(12,2) NOT NULL CHECK (charity_amount >= 0),
  platform_fee    DECIMAL(12,2) NOT NULL CHECK (platform_fee >= 0),
  status          VARCHAR(20) NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('pending','completed','reversed','failed','under_review')),
  fraud_score     DECIMAL(5,4) CHECK (fraud_score BETWEEN 0 AND 1),
  reversal_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  CONSTRAINT pool_sum_check CHECK (
    liquid_amount + savings_amount + parent_amount + charity_amount = cashback_amount
  )
);

-- ────────────────────────────────────────────────────────────────
-- Migration 010: pool_balances (running totals per user)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE pool_balances (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  liquid_balance   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (liquid_balance >= 0),
  savings_balance  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (savings_balance >= 0),
  parent_pending   DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (parent_pending >= 0),
  charity_pending  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (charity_pending >= 0),
  total_earned     DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- Migration 011: ad_reviews
-- ────────────────────────────────────────────────────────────────
CREATE TABLE ad_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  transaction_id  UUID NOT NULL REFERENCES cashback_transactions(id),
  relevance_score SMALLINT NOT NULL CHECK (relevance_score BETWEEN 1 AND 5),
  honesty_score   SMALLINT NOT NULL CHECK (honesty_score BETWEEN 1 AND 5),
  value_score     SMALLINT NOT NULL CHECK (value_score BETWEEN 1 AND 5),
  composite_score DECIMAL(3,2) NOT NULL,
  flag_reason     VARCHAR(50)
                  CHECK (flag_reason IN ('misleading_claim','price_surge','irrelevant','spam')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, transaction_id)
);

-- ────────────────────────────────────────────────────────────────
-- Migration 012: audit_log (INSERT only — never UPDATE or DELETE)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50)  NOT NULL,
  entity_id    UUID,
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- Migration 013: indexes
-- ────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_mobile             ON users(mobile);
CREATE INDEX idx_attribution_user_status  ON attribution_sessions(user_id, status);
CREATE INDEX idx_attribution_payment      ON attribution_sessions(payment_intent_id);
CREATE INDEX idx_attribution_expires      ON attribution_sessions(expires_at)
                                          WHERE status = 'open';
CREATE INDEX idx_cashback_user_created    ON cashback_transactions(user_id, created_at DESC);
CREATE INDEX idx_cashback_status          ON cashback_transactions(status);
CREATE INDEX idx_campaigns_status_dates   ON campaigns(status, starts_at, ends_at);
CREATE INDEX idx_campaigns_advertiser     ON campaigns(advertiser_id);
CREATE INDEX idx_reviews_campaign         ON ad_reviews(campaign_id, created_at DESC);
CREATE INDEX idx_audit_entity             ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_profile_categories       ON purchase_profiles USING GIN(categories);
CREATE INDEX idx_campaign_target          ON campaigns USING GIN(target_profile);
```

---

## 10. API Specification

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <jwt_token>` on all protected routes
**Idempotency:** `X-Request-ID: <uuid>` required on all POST/PUT/PATCH write operations
**Content-Type:** `application/json`

### 10.1 Response Envelope

```typescript
// Success
{ success: true, data: T, meta?: { total: number, page: number, per_page: number, has_more: boolean } }

// Error
{ success: false, error: { code: string, message: string, details?: Record<string, string[]> } }
```

### 10.2 Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request body or query |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT but insufficient role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g. duplicate webhook) |
| 422 | `VALIDATION_ERROR` | Schema validation failure (with field-level details) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error (internals hidden from client) |

Specific business codes: `SESSION_EXPIRED`, `SESSION_INVALID`, `FRAUD_REVIEW`, `BELOW_MINIMUM_CASHBACK`, `CAMPAIGN_BUDGET_EXHAUSTED`, `PROFILE_UPDATE_TOO_SOON`, `PLEDGE_REQUIRED`

### 10.3 Full Route Table

```
── Auth (public) ─────────────────────────────────────────────────
POST   /auth/request-otp           { mobile: string }
POST   /auth/verify-otp            { mobile: string, otp: string }
POST   /auth/refresh               { refresh_token: string }
DELETE /auth/logout                (auth required)

── Consumer — Onboarding ─────────────────────────────────────────
POST   /onboarding/complete        { name, email, kyc_ref? }

── Consumer — Profile ────────────────────────────────────────────
GET    /profile                    → current purchase profile
PUT    /profile                    { categories: CategoryEntry[] }
GET    /pool-config                → pool percentages + balances + parent/charity info
PUT    /pool-config                { liquid_pct, savings_pct, parent_pct, charity_pct, ... }

── Consumer — Feed ───────────────────────────────────────────────
GET    /feed                       → [AdCard] (max 20, intent-matched)
POST   /feed/:campaign_id/view     → record view (no body)

── Consumer — Attribution & Purchase ─────────────────────────────
POST   /attribution/start          { campaign_id: string } → { session_id, client_secret }
GET    /attribution/:id            → session status + expiry

── Consumer — Wallet ─────────────────────────────────────────────
GET    /wallet                     → pool balances + savings goal progress
GET    /transactions               ?page=1&per_page=20&status=&brand=&from=&to=
GET    /transactions/:id           → full detail
GET    /transactions/export        ?from=&to= → CSV file download
POST   /reviews                    { campaign_id, transaction_id, relevance, honesty, value }

── Advertiser ────────────────────────────────────────────────────
POST   /advertiser/onboard         { company_name, gst_number, contact_email, ... }
GET    /advertiser/me              → advertiser profile + quality_score
PUT    /advertiser/me              → update contact details
POST   /advertiser/campaigns       { name, creative_url, target_profile, cashback_rate, ... }
GET    /advertiser/campaigns       ?status=&page=
GET    /advertiser/campaigns/:id
PUT    /advertiser/campaigns/:id   → update non-live fields / pause
GET    /advertiser/campaigns/:id/stats → conversion KPIs
GET    /advertiser/analytics       ?from=&to= → aggregate performance
GET    /advertiser/analytics/export?from=&to= → PDF download

── Admin (role: admin JWT claim required) ────────────────────────
GET    /admin/users                ?search=&page=
PUT    /admin/users/:id/suspend
PUT    /admin/users/:id/restore
GET    /admin/advertisers          ?status=pending
PUT    /admin/advertisers/:id/approve
PUT    /admin/advertisers/:id/suspend { reason: string }
GET    /admin/campaigns            ?status=pending_review
PUT    /admin/campaigns/:id/approve
PUT    /admin/campaigns/:id/suspend  { reason: string }
GET    /admin/fraud-queue          ?page=
PUT    /admin/fraud-queue/:id/approve
PUT    /admin/fraud-queue/:id/reject  { reason: string }
GET    /admin/financials           → platform financial summary
GET    /admin/ngos                 → NGO list + balances
POST   /admin/ngos                 { name, registration_no, cause, bank_account }
GET    /admin/charity-ledger       (public — no auth)
GET    /admin/audit-log            ?actor=&entity_type=&from=&to=&page=

── Webhooks (no JWT — Stripe-Signature verification only) ────────
POST   /webhooks/stripe            → payment_intent.succeeded + refund events
```

### 10.4 Key Request/Response Examples

**POST /attribution/start**
```json
Request:  { "campaign_id": "uuid" }
Response: {
  "success": true,
  "data": {
    "session_id": "uuid",
    "expires_at": "2026-06-07T12:00:00Z",
    "client_secret": "pi_xxx_secret_xxx",
    "payment_intent_id": "pi_xxx",
    "cashback_preview": { "rate": 0.03, "estimated_rupees": 44.97 }
  }
}
```

**GET /wallet**
```json
{
  "success": true,
  "data": {
    "balances": {
      "liquid": 1250.50,
      "savings": 3400.00,
      "parent_pending": 680.00,
      "charity_pending": 340.00,
      "total_earned": 5670.50
    },
    "savings_goal": { "name": "Emergency Fund", "target": 50000, "progress": 3400, "pct": 6.8 }
  }
}
```

**POST /webhooks/stripe (inbound Stripe event)**
```json
{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 149900,
      "currency": "inr",
      "status": "succeeded",
      "metadata": { "adearn_session_id": "session_uuid", "user_id": "user_uuid" }
    }
  }
}
Response: { "received": true }
```

---

## 11. Business Logic Contracts

These contracts are immutable. Any code that violates them is a bug.

### Contract 1 — Pool Sum Invariant
`liquid_amount + savings_amount + parent_amount + charity_amount = cashback_amount`
Enforced by: DB CHECK constraint, zod schema, integer arithmetic in `poolDistributor.service.ts`

### Contract 2 — Cashback Atomicity
All five writes (cashback_transactions, pool_balances, campaigns, attribution_sessions, audit_log) happen in a single PostgreSQL transaction. If any one fails, all five roll back. No intermediate state is ever visible.

### Contract 3 — Idempotency
No `payment_intent_id` may trigger cashback more than once. Check order: Redis lookup → if found, skip. If not found, write to Redis with TTL=7days, then process. The Redis write happens BEFORE the DB transaction to prevent race conditions under concurrent webhook delivery.

### Contract 4 — Fraud-First
Fraud score is computed and evaluated BEFORE any DB write. No data is persisted for a transaction entering manual review except the review queue entry itself.

### Contract 5 — Attribution Session Locking
Attribution sessions are fetched with `SELECT ... FOR UPDATE` to prevent two concurrent webhook deliveries from both processing the same session.

### Contract 6 — Financial Arithmetic
All pool amount calculations use integer arithmetic (convert to paise, compute, convert back). The charity pool receives the remainder after the other three pools are rounded, ensuring the sum invariant holds exactly.

### Contract 7 — Billing Sequence
Advertiser is billed (Stripe charge created) only after the PostgreSQL transaction has successfully committed. Billing failure does not reverse cashback — it enters a billing retry queue.

### Contract 8 — Webhook Response Timing
The `/webhooks/stripe` endpoint returns `HTTP 200` immediately (within 500ms) before processing cashback. Processing happens async after the response. This prevents Stripe from retrying due to timeout.

---

## 12. Technology Stack

### Backend (`server/`)

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Language | TypeScript | 5.x strict | Financial bug prevention at compile time |
| Runtime | Node.js | 20 LTS | High concurrency for webhook processing |
| Framework | Express.js | 4.x | Minimal abstraction, well-understood |
| Database | PostgreSQL | 16 | ACID compliance; JSONB for intent matching |
| DB Client | `pg` (node-postgres) | 8.x | Raw queries — full control, no ORM leak |
| Cache / Queue | Redis via `ioredis` | 7.x | Idempotency keys, rate limiting, retry queue |
| Payments | `stripe` Node SDK | 14.x | Abstracted behind `IPaymentProvider` |
| Auth | `jsonwebtoken` | 9.x | RS256 asymmetric key signing |
| Validation | `zod` | 3.x | Runtime type safety on all inputs + env |
| Logging | `pino` + `pino-http` | 9.x | Structured JSON, fast, production-grade |
| Scheduler | `node-cron` | 3.x | Monthly parent + charity jobs |
| Error tracking | Sentry `@sentry/node` | 8.x | |
| Testing | `jest` + `supertest` | | |

### Frontend (`web/`)

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Language | TypeScript | 5.x strict | |
| Framework | React | 18 | |
| Build | Vite | 5.x | |
| Routing | TanStack Router | 1.x | Type-safe file-based routes |
| Server state | TanStack Query | 5.x | Caching, background polling, loading states |
| Client state | Zustand | 4.x | Minimal boilerplate |
| HTTP | axios | 1.x | Interceptors for auth + error normalisation |
| Styling | Tailwind CSS | 3.x | |
| Components | shadcn/ui | latest | Accessible, composable primitives |
| Charts | recharts | 2.x | Advertiser analytics |
| Forms | react-hook-form + zod | | |
| Payments | `@stripe/react-stripe-js` | | Stripe Elements |
| Error tracking | Sentry `@sentry/react` | 8.x | |

### Mobile (`mobile/`)

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Flutter 3.x | Single codebase Android + iOS; best mid-range Android perf |
| State | Riverpod 2.x | Compile-safe providers |
| HTTP | Dio 5.x | Interceptors, cancellation |
| Payments | flutter_stripe 10.x | |
| Secure storage | flutter_secure_storage 9.x | JWT persistence |
| Navigation | go_router 13.x | Declarative, deep link support |

### Infrastructure

| Service | Local Dev | Production |
|---|---|---|
| PostgreSQL | Docker | Railway managed PostgreSQL |
| Redis | Docker | Railway managed Redis |
| Backend | `tsx watch` (nodemon) | Railway Docker deploy |
| Frontend | Vite dev server | Vercel |
| Mobile | Flutter emulator | Direct APK + Expo EAS |
| Webhooks | Stripe CLI `stripe listen` | Stripe Dashboard endpoint |
| Logs | pino-pretty (coloured) | Railway log drain |
| Errors | Console | Sentry |

---

## 13. System Architecture

### 13.1 High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  React Web (advertiser + admin)  │  Flutter Mobile (consumer)    │
└─────────────────────┬────────────────────────────────────────────┘
                      │ HTTPS REST
┌─────────────────────▼────────────────────────────────────────────┐
│                    API GATEWAY (AWS / Railway)                    │
│         TLS termination · Rate limiting · CORS                   │
└──────────┬──────────────────────────────────────────────────────┘
           │
     ┌─────┴──────────────────────────────┐
     │                                    │
┌────▼──────────────────┐   ┌─────────────▼────────────────────────┐
│   Express API Server  │   │         Webhook Endpoint             │
│  (auth, feed, wallet, │   │   POST /api/v1/webhooks/stripe       │
│   advertiser, admin)  │   │   (raw body, Stripe sig verify)      │
└────┬──────────────────┘   └─────────────┬────────────────────────┘
     │                                    │
     │          ┌─────────────────────────┘
     │          │
┌────▼──────────▼────────────────────────────────────────────────┐
│                     Services Layer                              │
│  adMatcher  │  cashbackEngine  │  fraudDetection  │  analytics │
└────┬─────────────────┬──────────────────────────────────────────┘
     │                 │
┌────▼──────┐   ┌──────▼───────┐
│PostgreSQL │   │    Redis     │
│(pg pool)  │   │(idempotency, │
│           │   │ rate limit,  │
│           │   │ retry queue) │
└───────────┘   └──────────────┘
     │
┌────▼────────────────────────────────────────────────────────────┐
│                   External Services                             │
│  Stripe API  │  AWS S3  │  CloudFront  │  Sentry  │  Twilio   │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Cashback Engine — Internal Flow

```
POST /webhooks/stripe
        │
        ▼
stripe.webhooks.constructEvent()
        │ invalid sig → 400, log warn, return
        │ valid ↓
HTTP 200 returned immediately (async from here)
        │
        ▼
event.type === 'payment_intent.succeeded' ?
        │ no → return
        │ yes ↓
Redis SETNX adearn:idempotency:pi_{id}
        │ key exists → already processed, return
        │ set OK ↓
GET attribution_session WHERE id = metadata.adearn_session_id
  AND status = 'open'
  FOR UPDATE
        │ not found / expired → log, return
        │ found ↓
fraudDetection.score(userId, amount, sessionId)
        │ score > 0.8 → insert under_review record, notify admin
        │ score ≤ 0.8 ↓
poolDistributor.calculate(cashbackAmount, poolConfig)
        │ (integer arithmetic, charity gets remainder)
        ↓
BEGIN PostgreSQL transaction
  INSERT cashback_transactions (status=completed)
  UPSERT pool_balances (increment 4 pools + total_earned)
  UPDATE campaigns SET spent_to_date += cashbackAmount
  UPDATE attribution_sessions SET status=converted, payment_intent_id=...
  INSERT audit_log
COMMIT
        │ error → ROLLBACK, log error, Redis key remains (idempotency preserved)
        │ committed ↓
setImmediate async:
  FCM push notification
  WhatsApp message (if opted-in)
  Advertiser webhook (if configured)
  Mixpanel event
  Stripe charge (advertiser billing)
```

### 13.3 Intent-Matching Query

```sql
-- adMatcher.service.ts — core query
SELECT c.*,
       a.company_name,
       a.quality_score AS advertiser_quality_score
FROM campaigns c
JOIN advertisers a ON a.id = c.advertiser_id AND a.status = 'active'
JOIN purchase_profiles p ON p.user_id = $1 AND p.is_active = true
LEFT JOIN attribution_sessions s ON
  s.campaign_id = c.id
  AND s.user_id = $1
  AND s.ad_viewed_at > NOW() - INTERVAL '48 hours'
WHERE c.status = 'active'
  AND c.starts_at <= NOW()
  AND c.ends_at   >= NOW()
  AND c.spent_to_date < c.total_budget
  AND c.target_profile->'categories' ?|
      ARRAY(SELECT jsonb_array_elements_text(p.categories->'categories'))
  AND s.id IS NULL   -- anti-duplicate: exclude ads seen in last 48h
ORDER BY c.cashback_rate DESC, a.quality_score DESC
LIMIT 20;
```

---

## 14. Security & Fraud Prevention

### 14.1 Security Architecture

| Layer | Control | Implementation |
|---|---|---|
| Transport | TLS 1.3 minimum | Railway / Vercel enforced |
| Headers | Security headers | `helmet` with CSP, HSTS, COOP |
| Authentication | JWT RS256 | 2048-bit key pair; private key in secrets manager |
| Authorisation | Role-based | `role` claim in JWT: consumer / advertiser / admin |
| Input validation | Schema validation | `zod` on every request body before DB access |
| Rate limiting | Per-endpoint limits | `express-rate-limit` with Redis store |
| Webhook auth | Stripe signature | `stripe.webhooks.constructEvent` — HMAC-SHA256 |
| Database | Parameterised queries | `$1, $2` always — zero string interpolation |
| Secrets | Environment variables | AWS Secrets Manager / Railway secrets |
| PCI DSS | No card data stored | Stripe Elements handles all card data |
| Encryption at rest | AES-256 | RDS encryption enabled |
| Audit trail | Immutable log | `audit_log` table — INSERT only, no updates |

### 14.2 Rate Limits

| Endpoint | Window | Limit | Rationale |
|---|---|---|---|
| `POST /auth/request-otp` | 10 minutes | 3 per mobile | Prevent OTP bombing |
| `POST /auth/verify-otp` | 5 minutes | 5 attempts | Prevent brute force |
| All authenticated endpoints | 1 minute | 100 requests | General protection |
| Advertiser API | 1 hour | 500 requests | Higher limit for integrations |
| Admin endpoints | 1 minute | 200 requests | |

### 14.3 Fraud Detection Rules (v1)

Fraud score = weighted sum of triggered rules. Score ∈ [0.0, 1.0]. Threshold: 0.8.

| Rule | Weight | Trigger Condition |
|---|---|---|
| Conversion velocity | 0.40 | > 5 completed cashback transactions by same user in 24 hours |
| New account high-value | 0.30 | Account age < 7 days AND purchase > ₹5,000 |
| Geolocation mismatch | 0.20 | Payment IP geolocates outside India |
| Profile-purchase mismatch | 0.10 | Purchased brand not in user's declared profile |

Scores above 0.8: transaction inserted as `under_review`, admin notified, user not informed. Scores above 0.95: transaction auto-rejected without manual review.

### 14.4 Financial Security

- All financial DB writes use `BEGIN/COMMIT/ROLLBACK` explicit transactions
- `SELECT ... FOR UPDATE` row locking on attribution sessions prevents concurrent conversion
- All pool amounts stored as `DECIMAL(12,2)` — never `FLOAT`
- Pool sum constraint enforced at both DB level and application level
- Cashback cap (₹500) enforced in service layer, not just UI

---

## 15. Non-Functional Requirements

### 15.1 Performance

| Metric | Requirement | Measurement |
|---|---|---|
| API response time (p95) | ≤ 300ms | All read endpoints |
| API response time (p99) | ≤ 500ms | All endpoints |
| Cashback webhook processing | ≤ 3 seconds (p95) | From receipt to DB commit |
| Ad feed load | ≤ 2 seconds | On 4G connection |
| Mobile cold start | ≤ 3 seconds | On 2GB RAM Android |
| DB query time (p99) | ≤ 100ms | All indexed queries |
| PDF export generation | ≤ 30 seconds | Any date range |

### 15.2 Availability

| Component | SLA Target |
|---|---|
| Core API | 99.9% monthly |
| Webhook endpoint | 99.95% monthly |
| Database (RDS) | 99.99% (managed) |
| Frontend | 99.9% (Vercel SLA) |

### 15.3 Scalability

- System handles 1,00,000 MAU and 10,000 concurrent API sessions without architecture change
- Webhook endpoint handles 500 events/minute sustained with auto-scaling
- Database read replicas provisioned at 50,000 MAU threshold
- Redis cluster mode enabled at 10,000 webhook events/day threshold

### 15.4 Accessibility & Device Support

- Mobile: Android 8.0+ (API 26), iOS 14+
- Web: Chrome 90+, Safari 14+, Firefox 88+, Edge 90+
- Responsive: 375px (mobile) through 1920px (desktop)
- WCAG AA colour contrast on all interactive elements
- Minimum font size: 14px body text

### 15.5 Observability Requirements

- Every request logged with: `requestId`, `method`, `path`, `statusCode`, `durationMs`, `userId`
- Every financial event logged at `info` level with all amounts and pool splits
- Every error logged with full stack trace at `error` level
- Sentry error tracking with environment tagging
- Health check endpoint (`GET /health`) always returns 200 with DB + Redis connectivity status

---

## 16. Development Milestones

### Phase 1 — Foundation (Week 1–4)
**Goal:** Core infrastructure + auth + profile + basic ad serving

| Week | Deliverables |
|---|---|
| 1 | Monorepo scaffold (Turborepo), docker-compose, shared TypeScript types, all DB migrations |
| 2 | Auth service (OTP mock + JWT RS256), middleware stack (validate, authenticate, authorize, rateLimiter, requestLogger, errorHandler) |
| 3 | Purchase profile API, pool config API, advertiser onboarding + pledge signing |
| 4 | Ad feed endpoint (intent-matching JSONB query), campaign CRUD, React consumer onboarding wizard, advertiser portal skeleton |

**Exit criteria:** User completes onboarding → profile stored → advertiser creates campaign → ad appears in feed for matched user

### Phase 2 — Cashback Core (Week 5–8)
**Goal:** Full purchase-to-cashback pipeline working end-to-end with Stripe

| Week | Deliverables |
|---|---|
| 5 | `IPaymentProvider` + `StripeProvider`, PaymentIntent creation endpoint, attribution session management |
| 6 | Stripe webhook handler + `constructEvent`, Redis idempotency, `cashbackEngine.service.ts` (atomic transaction) |
| 7 | `fraudDetection.service.ts` (4-rule engine), manual review queue, `poolDistributor.service.ts` (integer arithmetic) |
| 8 | Notification service (FCM + mock), consumer wallet UI (balances + ledger), advertiser spend tracking |

**Exit criteria:** End-to-end demo works: ad view → Stripe test payment → webhook → cashback in pools within 3 seconds

### Phase 3 — Community, Analytics & Operations (Week 9–12)
**Goal:** Full platform operational with quality controls and admin tooling

| Week | Deliverables |
|---|---|
| 9 | Community ad review API + composite score engine, advertiser quality score thresholds, email alerts |
| 10 | Parent fund monthly transfer cron job, charity disbursement cron job, public charity ledger |
| 11 | Advertiser analytics dashboard (recharts), PDF export (pdfkit), CSV export |
| 12 | Admin dashboard (fraud queue, user/advertiser management, financials, audit log viewer) |

**Exit criteria:** Quality score auto-pauses campaign, parent fund job runs and transfers, admin can approve/reject fraud queue items

### Phase 4 — Mobile, Polish & Deployment (Week 13–16)
**Goal:** Production-ready mobile app + full deployment + demo readiness

| Week | Deliverables |
|---|---|
| 13 | Flutter mobile app — all consumer screens (onboarding, feed, wallet, profile, Stripe checkout) |
| 14 | Load testing (k6: 500 webhooks/min), full regression test suite, security hardening review |
| 15 | Railway deployment (backend + DB + Redis), Vercel deployment (frontend), Dockerfile production config |
| 16 | OpenAPI 3.0 spec, README with setup guide, demo seed data verified, APK built for demo device |

**Exit criteria:** Full 11-step demo scenario works end-to-end on deployed Railway + Vercel URLs

---

## 17. Testing Requirements

### 17.1 Required Test Coverage

Every service file must have corresponding unit tests. Every route must have integration tests.

| File | Required tests |
|---|---|
| `cashbackEngine.service.ts` | Happy path, session expired, fraud flag triggers, DB rollback on error, idempotency (duplicate payment), pool sum correctness, cashback cap enforcement |
| `poolDistributor.service.ts` | All pool config combinations, rounding to exact sum, zero-pool handling |
| `fraudDetection.service.ts` | Each rule in isolation, combined score, threshold boundary |
| `adMatcher.service.ts` | Matching on declared category, exclusion of non-matching, exclusion of seen-in-48h, exclusion of over-budget campaigns |
| `webhooks.routes.ts` | Valid webhook processes cashback, invalid signature → 400, duplicate payment_intent → idempotent (no double credit), fraud-flagged → under_review |
| `auth.routes.ts` | OTP request, verify, expired OTP, max attempts exceeded |
| `wallet.routes.ts` | Correct pool balances, correct transaction history, pagination |
| `advertiser.routes.ts` | Campaign CRUD, pledge required, budget cap validation |

### 17.2 Test Infrastructure

```typescript
// Each integration test suite uses a transaction that rolls back after each test
// No test database state bleeds between tests

beforeAll(async () => await testDb.runMigrations());
beforeEach(async () => await testDb.beginTransaction());
afterEach(async () => await testDb.rollbackTransaction());
afterAll(async () => await testDb.close());
```

### 17.3 Critical Test: Cashback Idempotency

```typescript
it('cannot credit cashback twice for the same payment_intent', async () => {
  // First webhook
  await request(app)
    .post('/api/v1/webhooks/stripe')
    .set('stripe-signature', validSig)
    .send(stripeEvent)
    .expect(200);

  const balanceAfterFirst = await getPoolBalance(userId);

  // Second identical webhook (Stripe retry simulation)
  await request(app)
    .post('/api/v1/webhooks/stripe')
    .set('stripe-signature', validSig)
    .send(stripeEvent)
    .expect(200);

  const balanceAfterSecond = await getPoolBalance(userId);

  // Pool balance must be identical — no double credit
  expect(balanceAfterSecond.liquid_balance).toEqual(balanceAfterFirst.liquid_balance);
  expect(balanceAfterSecond.total_earned).toEqual(balanceAfterFirst.total_earned);
});
```

---

## 18. Deployment & Infrastructure

### 18.1 Local Development Stack

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: adearn, POSTGRES_PASSWORD: adearn, POSTGRES_DB: adearn_dev }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes

  pgadmin:
    image: dpage/pgadmin4
    environment: { PGADMIN_DEFAULT_EMAIL: admin@adearn.local, PGADMIN_DEFAULT_PASSWORD: admin }
    ports: ["5050:80"]
```

### 18.2 Production Targets

| Service | Platform | Config |
|---|---|---|
| Backend API | Railway | Docker deploy, auto-scale, env secrets |
| PostgreSQL | Railway managed | Automated daily backups |
| Redis | Railway managed | |
| Frontend | Vercel | Auto-deploy on `main` push |
| Mobile | Direct APK (demo) | Play Store + App Store post-demo |
| Webhooks | Stripe Dashboard | HTTPS endpoint on Railway URL |

### 18.3 CI/CD

GitHub Actions on every push to `main` and `develop`:
1. `npm run typecheck` — zero TypeScript errors
2. `npm run lint` — zero ESLint warnings
3. `npm run test:ci` — all tests pass with test DB service
4. `npm run build` — production build succeeds

No merges to `main` without all four checks passing.

### 18.4 Health Check

```
GET /health
Response: { status: "ok", version: "1.0.0", db: "connected", redis: "connected", timestamp: "..." }
```

---

## 19. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Cashback fraud (fake purchase accounts) | High | High | 4-rule fraud scoring, velocity limits, new account holds, manual review queue |
| R2 | Advertiser cold-start (insufficient ad inventory) | High | High | Pre-seed 10 anchor advertisers before launch, 3-month subsidised cashback programme |
| R3 | Double cashback from Stripe retry | Medium | Critical | Redis idempotency key checked before DB access; `SELECT FOR UPDATE` session lock |
| R4 | Stripe webhook latency spike | Low | High | Respond 200 immediately, process async; retry queue with 3× retry; manual reconciliation job |
| R5 | Anti-surge pledge non-compliance | Medium | High | Price monitoring integration (Phase 2), contractual penalty, user price-report mechanism |
| R6 | Payment gateway swap breaking cashback | Low | High | `IPaymentProvider` abstraction isolates swap to config change only |
| R7 | Consumer data breach (DPDPA) | Low | Critical | AES-256 at rest, TLS in transit, no raw Aadhaar stored, access control audit quarterly |
| R8 | Pool sum floating-point error | Low | High | Integer arithmetic in poolDistributor, DB CHECK constraint, unit test for all edge cases |
| R9 | App Store / Play Store rejection | Low | Medium | Pre-review against financial app policies, cashback classified as discount not income |
| R10 | Low consumer retention post-first-cashback | Medium | Medium | Monthly savings summary push, parent fund reminders, savings goal progress notifications |

---

## 20. Compliance & Regulatory

### 20.1 Financial (India)

- **Cashback classification:** Trade discount/rebate — not income. At < ₹10,000/year per user, no TDS deduction required under Section 194R. Legal opinion to be obtained pre-launch.
- **Parent fund transfers:** Personal bank transfers; standard KYC applies above ₹50,000 threshold
- **Charity disbursements:** Only to 80G-registered NGOs; annual statements published
- **Payment processing (demo):** Stripe test mode — no real money. At production: Cashfree or Razorpay (both RBI-licensed Payment Aggregators) handles all settlement; AdEarn operates as marketplace layer

### 20.2 Data Protection — DPDPA 2023

| Requirement | Implementation |
|---|---|
| Explicit consent | Consent recorded with timestamp, version, and IP at each data collection point |
| Purpose limitation | Purchase profile data used only for ad matching — never sold or shared |
| Data minimisation | KYC reference token stored (not raw Aadhaar); minimum PII collected |
| Right to erasure | Full account + data deletion within 72 hours of written request |
| Data localisation | All data stored on AWS Mumbai (ap-south-1) |
| Breach notification | Users notified within 72 hours of confirmed breach |

### 20.3 Advertising Standards

- Ad creatives reviewed against ASCI guidelines before campaign approval
- Anti-surge pledge is binding; breach → immediate suspension + penalty invoice
- Community-flagged ads reviewed within 24 hours; escalated to ASCI at 30 days if unresolved

---

## 21. Cross-Platform Integrations

AdEarn is Project 16 in a broader ecosystem. These integrations are stubbed in v1.

| Platform | Integration | v1 Stub | Production |
|---|---|---|---|
| EduCIBIL (Project 1) | REST API — share cashback behaviour score to credit model | Return mock `{ score: 720, tier: "gold" }` | Monthly OAuth 2.0 sync job |
| SkillsDrome (Project 2) | Webhook — +1% elevated cashback for course purchases | Check `pi.metadata.platform === "SkillsDrome"` | Outbound HMAC-signed webhook |

All ecosystem calls isolated in dedicated service files. Never inline in routes.

Shared ecosystem API standards:
- Base URL: `https://api.<platform>.in/v1/`
- Auth: Bearer JWT or OAuth 2.0 client credentials
- Errors: RFC 7807 Problem Details format
- Pagination: cursor-based (`?after=<cursor>&limit=<n>`)

---

## 22. Out of Scope — v1.0

| Feature | Status | Target |
|---|---|---|
| Mutual fund / SIP savings pool linkage | Deferred | v2 (post-launch) |
| Fixed deposit savings pool | Deferred | v2 |
| BNPL cashback eligibility | Deferred | v3 |
| Physical POS terminal integration | Deferred | v3 |
| International advertiser onboarding | Deferred | v3 |
| Programmatic RTB / real-time bidding | Deferred | v2 |
| AI ad creative optimisation | Deferred | v2 |
| UPI payments | Deferred | Production swap |
| NACH recurring advertiser mandate | Deferred | Production swap |
| Digilocker KYC (real) | Deferred | Production |
| Live penny drop verification | Deferred | Production |
| Multi-level referral / MLM | **Permanently excluded** | Never |
| Crypto / token-based cashback | **Permanently excluded** | Never |

---

## 23. Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | May 2026 | Initial PRD — full feature spec, Razorpay payment layer |
| 1.1 | June 2026 | Razorpay replaced with Stripe test mode; Section 21 (Stripe demo setup) added |
| 2.0 | June 2026 | Full rewrite to production-level standard. Added: core concept definitions, business logic contracts, full API table with error codes, complete SQL schemas with constraints, testing requirements with critical test examples, deployment infrastructure, architecture diagrams, `IPaymentProvider` abstraction, CLAUDE.md alignment |

---

*AdEarn PRD v2.0 — Project 16*
*This document is the authoritative product specification. All implementation decisions must be consistent with the contracts defined in Section 11. The CLAUDE.md file is the engineering companion to this document.*
*Classification: Confidential — authorised team members only.*
