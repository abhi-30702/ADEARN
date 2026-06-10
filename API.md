# docs/API.md — AdEarn API Reference

> Read this when working on: routes, controllers, frontend API calls.

---

## Base URL & Headers

```
Base URL:    /api/v1
Auth:        Authorization: Bearer <jwt_token>
Idempotency: X-Request-ID: <uuid>  (required on POST/PUT/PATCH)
Content-Type: application/json
```

## Response Envelope

```typescript
// Success
{ success: true, data: T, meta?: { total: number, page: number, per_page: number, has_more: boolean } }

// Error
{ success: false, error: { code: string, message: string, details?: Record<string, string[]> } }
```

## Error Codes

| HTTP | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| 403 | `FORBIDDEN` | Wrong role |
| 404 | `NOT_FOUND` | Resource missing |
| 409 | `CONFLICT` | Duplicate (e.g. duplicate webhook) |
| 422 | `VALIDATION_ERROR` | zod schema failure (with field details) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected error (internals hidden) |

Business codes: `SESSION_EXPIRED` · `SESSION_INVALID` · `FRAUD_REVIEW` · `BELOW_MINIMUM_CASHBACK` · `PLEDGE_REQUIRED` · `PROFILE_UPDATE_TOO_SOON` · `CAMPAIGN_BUDGET_EXHAUSTED`

---

## Auth (public — no JWT)

### POST /auth/request-otp
```json
Request:  { "mobile": "9876543210" }
Response: { "success": true, "data": { "message": "OTP sent", "expires_in": 120 } }
```
Rate limit: 3 requests per mobile per 10 minutes.

### POST /auth/verify-otp
```json
Request:  { "mobile": "9876543210", "otp": "123456" }
Response: {
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user": { "id": "uuid", "name": "Riya", "role": "consumer", "kyc_status": "verified" }
  }
}
```

### POST /auth/refresh
```json
Request:  { "refresh_token": "eyJ..." }
Response: { "success": true, "data": { "access_token": "eyJ..." } }
```

### DELETE /auth/logout
```json
Response: { "success": true, "data": { "message": "Logged out" } }
```

---

## Consumer — Profile

### GET /profile
```json
Response: {
  "success": true,
  "data": {
    "id": "uuid",
    "categories": [{ "category": "Health & Beauty", "brands": ["Mamaearth"], "spend_range": "₹1K–5K", "frequency": "Monthly" }],
    "last_updated": "2026-06-01T00:00:00Z",
    "next_update_at": "2026-07-01T00:00:00Z"
  }
}
```

### PUT /profile
```json
Request: {
  "categories": [
    { "category": "Health & Beauty", "brands": ["Mamaearth", "Plum"], "spend_range": "₹1K–5K", "frequency": "Monthly" }
  ]
}
Response: { "success": true, "data": { "updated": true, "next_update_at": "2026-07-06T00:00:00Z" } }
```

### GET /pool-config
```json
Response: {
  "success": true,
  "data": {
    "liquid_pct": 40, "savings_pct": 30, "parent_pct": 20, "charity_pct": 10,
    "savings_goal": "Emergency Fund", "savings_target": 50000,
    "parent_account": { "ifsc": "HDFC0001234", "account_number": "****5678", "name": "Suresh K", "verified": true },
    "charity_ngo": { "id": "uuid", "name": "CRY", "cause": "education" },
    "balances": { "liquid": 1250.50, "savings": 3400.00, "parent_pending": 680.00, "charity_pending": 340.00, "total_earned": 5670.50 }
  }
}
```

### PUT /pool-config
```json
Request: { "liquid_pct": 40, "savings_pct": 30, "parent_pct": 20, "charity_pct": 10 }
// Must sum to 100. Returns 422 VALIDATION_ERROR if not.
Response: { "success": true, "data": { "updated": true } }
```

---

## Consumer — Feed & Attribution

### GET /feed
```json
Response: {
  "success": true,
  "data": {
    "ads": [
      {
        "campaign_id": "uuid",
        "brand": "Mamaearth",
        "product": "Vitamin C Face Serum",
        "cashback_rate": 0.03,
        "estimated_cashback_rupees": 44.97,
        "creative_url": "https://cdn.adearn.in/...",
        "creative_type": "video",
        "duration_sec": 30,
        "advertiser_quality_score": 4.2
      }
    ],
    "next_refresh_at": "2026-06-06T18:00:00Z"
  }
}
```

### POST /feed/:campaign_id/view
Records ad view. No body required.
```json
Response: { "success": true, "data": { "viewed": true } }
```

### POST /attribution/start
Creates attribution session + Stripe PaymentIntent.
```json
Request:  { "campaign_id": "uuid" }
Response: {
  "success": true,
  "data": {
    "session_id": "uuid",
    "expires_at": "2026-06-07T12:00:00Z",
    "payment_intent_id": "pi_xxx",
    "client_secret": "pi_xxx_secret_xxx",
    "cashback_preview": { "rate": 0.03, "estimated_rupees": 44.97 }
  }
}
```

---

## Consumer — Wallet

### GET /wallet
```json
Response: {
  "success": true,
  "data": {
    "balances": { "liquid": 1250.50, "savings": 3400.00, "parent_pending": 680.00, "charity_pending": 340.00, "total_earned": 5670.50 },
    "savings_goal": { "name": "Emergency Fund", "target": 50000, "progress": 3400, "pct": 6.8 }
  }
}
```

### GET /transactions?page=1&per_page=20
```json
Response: {
  "success": true,
  "data": [
    {
      "id": "uuid",
      "brand": "Mamaearth",
      "product": "Vitamin C Face Serum",
      "purchase_amount": 1499,
      "cashback_amount": 44.97,
      "pools": { "liquid": 17.99, "savings": 13.49, "parent": 8.99, "charity": 4.50 },
      "status": "completed",
      "created_at": "2026-06-06T12:05:23Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "per_page": 20, "has_more": true }
}
```

### POST /reviews
```json
Request: {
  "campaign_id": "uuid",
  "transaction_id": "uuid",
  "relevance_score": 5,
  "honesty_score": 4,
  "value_score": 5
}
Response: { "success": true, "data": { "composite_score": 4.6, "created": true } }
```

---

## Advertiser

### POST /advertiser/onboard
```json
Request: {
  "company_name": "Mamaearth",
  "gst_number": "27AAACM1234F1ZP",
  "contact_email": "ads@mamaearth.in",
  "contact_mobile": "9123456789",
  "pledge_signed": true
}
Response: { "success": true, "data": { "advertiser_id": "uuid", "status": "pending" } }
```
Returns 422 `PLEDGE_REQUIRED` if `pledge_signed: false`.

### POST /advertiser/campaigns
```json
Request: {
  "name": "Summer Skincare Sale",
  "creative_url": "https://s3.amazonaws.com/...",
  "creative_type": "video",
  "target_profile": { "categories": ["Health & Beauty"], "brands": ["Mamaearth"] },
  "cashback_rate": 0.03,
  "daily_cap": 10000,
  "total_budget": 200000,
  "starts_at": "2026-07-01T00:00:00Z",
  "ends_at": "2026-07-31T23:59:59Z"
}
Response: { "success": true, "data": { "campaign_id": "uuid", "status": "pending_review" } }
```

### GET /advertiser/campaigns/:id/stats
```json
Response: {
  "success": true,
  "data": {
    "campaign_id": "uuid",
    "period": "2026-07-01 to 2026-07-15",
    "impressions": 12450,
    "conversions": 1743,
    "conversion_rate": 0.14,
    "total_spend": 78435.00,
    "avg_cashback_paid": 45.00,
    "quality_score": 4.2,
    "audience_quality_pct": 0.89
  }
}
```

---

## Webhook — Stripe Inbound

```
POST /api/v1/webhooks/stripe
Headers: Stripe-Signature: t=xxx,v1=xxx
Body: raw (NOT parsed JSON — uses express.raw())
```

Stripe event structure:
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 149900,
      "currency": "inr",
      "metadata": { "adearn_session_id": "uuid", "user_id": "uuid", "campaign_id": "uuid" }
    }
  }
}
```

Responses:
- `200 { "received": true }` — always (regardless of processing outcome)
- `400 { "error": "invalid_signature" }` — bad signature

---

## Health Check (always public)

```
GET /health
Response: { "status": "ok", "version": "1.0.0", "db": "connected", "redis": "connected" }
```

---

## S3 Presigned Upload (ad creatives)

```
POST /advertiser/upload-url
Request:  { "filename": "summer-ad.mp4", "content_type": "video/mp4" }
Response: { "upload_url": "https://s3.amazonaws.com/...", "cdn_url": "https://cdn.adearn.in/..." }
```

Frontend uploads directly to S3 using the presigned URL. The `cdn_url` is what goes into the campaign `creative_url`.
