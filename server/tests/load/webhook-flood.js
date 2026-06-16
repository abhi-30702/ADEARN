import http from 'k6/http';
import { check, sleep } from 'k6';
import { hmac } from 'k6/crypto';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = __ENV.STRIPE_WEBHOOK_SECRET || 'whsec_test_integration_adearn';
// Dummy session ID in Stripe metadata — a static UUID is fine since we're testing
// raw throughput, not the full cashback flow (DB/Redis not required for this test)
const DUMMY_SESSION_ID = '00000000-0000-0000-0000-000000000001';

// ─── k6 options: 500 req/min for 2 minutes ────────────────────────────────────
export const options = {
  scenarios: {
    webhook_flood: {
      executor: 'constant-arrival-rate',
      rate: 500,           // 500 iterations per timeUnit
      timeUnit: '1m',      // per minute
      duration: '2m',      // run for 2 minutes
      preAllocatedVUs: 20, // enough VUs to sustain the rate
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95th percentile response time < 500ms
    http_req_failed: ['rate<0.01'],     // error rate < 1%
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signWebhookPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = hmac('sha256', secret, signedPayload, 'hex');
  return `t=${timestamp},v1=${signature}`;
}

function makePaymentSucceededEvent() {
  const eventId = `evt_load_${uuidv4()}`;
  const paymentIntentId = `pi_load_${uuidv4()}`;

  return JSON.stringify({
    id: eventId,
    object: 'event',
    type: 'payment_intent.succeeded',
    api_version: '2025-02-24.acacia',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 149900,
        currency: 'inr',
        status: 'succeeded',
        metadata: {
          session_id: DUMMY_SESSION_ID,
          client_ip: '127.0.0.1',
        },
      },
    },
  });
}

// ─── Default function (called per VU iteration) ────────────────────────────────

export default function () {
  const payload = makePaymentSucceededEvent();
  const sig = signWebhookPayload(payload, WEBHOOK_SECRET);

  const res = http.post(
    `${BASE_URL}/api/v1/webhooks/stripe`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': sig,
      },
    },
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has received:true': (r) => {
      try {
        return JSON.parse(r.body).received === true;
      } catch {
        return false;
      }
    },
  });
}
