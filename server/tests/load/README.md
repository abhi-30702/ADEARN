# Load Testing with k6

This directory contains load test scripts for AdEarn using [k6](https://k6.io), a modern load testing framework written in Go.

## Prerequisites

### Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Windows (Chocolatey):**
```bash
choco install k6
```

**Linux (apt):**
```bash
sudo apt-get install k6
```

**Or download directly:** https://k6.io/docs/getting-started/installation/

### Server must be running

The load tests hit a live server. Before running any test, ensure the backend is running:

```bash
# From repo root
docker-compose up -d           # Start PostgreSQL + Redis
cd server && npm run migrate   # Apply DB migrations
cd server && npm run dev       # Start Express server on :3000
```

## Running Tests

### Webhook Flood Test

This test hammers the Stripe webhook endpoint at **500 requests/minute** (≈ 8.33 req/s) for 2 minutes, sending 1000 total webhook events. The test verifies:
- HTTP 200 responses
- Response body contains `{ received: true }`
- 95th percentile response time < 500ms
- Error rate < 1%

**Against local development server (default):**
```bash
k6 run server/tests/load/webhook-flood.js
```

**Against a remote server (e.g., Railway staging):**
```bash
BASE_URL=https://your-railway-url.railway.app \
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret \
k6 run server/tests/load/webhook-flood.js
```

**With verbose output:**
```bash
k6 run --verbose server/tests/load/webhook-flood.js
```

**With live web dashboard (requires k6 cloud account):**
```bash
k6 run -o cloud server/tests/load/webhook-flood.js
```

## Test Details

### webhook-flood.js

**What it tests:**
- Raw webhook throughput under sustained load
- Server response latency under spike conditions
- Idempotency guard behavior (each event has unique `evt_load_<uuid>` ID)
- HTTP 200 with `{ received: true }` for valid signatures

**Load profile:**
- **Rate:** 500 webhooks/minute for 2 minutes
- **Total requests:** 1000
- **Virtual users (VUs):** 20 pre-allocated, up to 50 max
- **Executor:** `constant-arrival-rate` (smooth, predictable ramp)

**Success criteria (thresholds):**
- 95th percentile response time: < 500ms
- Error rate: < 1%

**What the test does NOT test:**
- Full cashback transaction flow (DB writes, Redis lookups)
- Fraud detection scoring
- Pool distribution logic
- Notification delivery

It tests the **webhook entry point** in isolation — signature validation, idempotency checks, and async dispatch. The server's `setImmediate(() => webhookService.processStripeEvent(...))` happens in the background; this test only measures the HTTP response phase.

## Interpreting Results

### Sample Output

```
     data_received..................: 100 KB  50 KB/s
     data_sent......................: 250 KB  125 KB/s
     http_req_blocked...............: avg=2.1ms   min=1ms    max=10ms   p(90)=3ms    p(95)=4ms
     http_req_connecting............: avg=0.8ms   min=0ms    max=5ms    p(90)=1ms    p(95)=2ms
     http_req_duration..............: avg=78ms    min=15ms   max=420ms  p(90)=150ms  p(95)=280ms ✓
     http_req_failed................: 0%      ✓
     http_req_receiving.............: avg=5ms     min=2ms    max=15ms   p(90)=8ms    p(95)=10ms
     http_req_sending...............: avg=15ms    min=10ms   max=30ms   p(90)=20ms   p(95)=25ms
     http_req_waiting...............: avg=58ms    min=5ms    max=375ms  p(90)=120ms  p(95)=240ms
     http_reqs......................: 1000     500/min
     http_req_tls_handshaking.......: avg=0ms     min=0ms    max=0ms    p(90)=0ms    p(95)=0ms
     iteration_duration.............: avg=2s      min=1.98s  max=2.02s  p(90)=2.01s  p(95)=2.01s
     iterations.....................: 1000     500/min
     vus............................: 20      min=20     max=50
     vus_max........................: 50
```

**Green checkmarks (✓)** = thresholds passed
**Red Xs (✗)** = thresholds failed

**Key metrics to watch:**
- `http_req_duration [p(95)]` — 95th percentile latency. Should be < 500ms ✓
- `http_req_failed` — Percentage of failed requests. Should be < 1% ✓
- `vus` — Virtual users active during test. Shows if rate was sustainable
- `iterations` — Total requests. Should equal 1000 for webhook-flood.js

### When Things Go Wrong

**Threshold violated: `http_req_duration [p(95)]`**
- Webhook handler is slow — check if Redis/DB is slow
- Server CPU maxed out — increase instance size or optimize handler
- GC pauses — profile with `node --prof` and analyze with `node --prof-process`

**Threshold violated: `http_req_failed rate > 1%`**
- Signature validation failing — check `STRIPE_WEBHOOK_SECRET` env var
- Server returning 5xx errors — check server logs for exceptions
- Server out of memory — check `docker stats`

**Test never finishes or gets stuck:**
- Server crashed — check `docker-compose logs server`
- Firewall blocking connections — check network connectivity
- k6 out of file descriptors — increase `ulimit -n`

## Notes on Idempotency

Each webhook event has a unique `evt_load_<uuid>` ID, so the server's Redis idempotency guard will process each event exactly once. This is intentional — we're testing **throughput**, not idempotency itself. (Idempotency is tested in `server/tests/integration/webhook.test.ts`.)

If you want to test idempotency instead, modify `makePaymentSucceededEvent()` to use a static `eventId`, then re-run the test twice — the second run should see 0 errors as all events are deduplicated by Redis.

## Cleanup

After load testing, check server health:

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "db": "connected",
  "redis": "connected",
  "timestamp": "2025-06-14T10:30:45.123Z"
}
```

If not, restart services:
```bash
docker-compose down -v
docker-compose up -d
```

## Further Reading

- [k6 documentation](https://k6.io/docs)
- [k6 best practices](https://k6.io/docs/testing-guides/load-testing-best-practices)
- [Constant arrival rate executor](https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate)
- [Thresholds guide](https://k6.io/docs/using-k6/thresholds)
