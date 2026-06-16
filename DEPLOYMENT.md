# docs/DEPLOYMENT.md — AdEarn Deployment Guide

> Read this when working on: Dockerfile, Railway setup, Vercel config, GitHub Actions CI/CD.

---

## Local Dev Stack

```bash
# Start postgres + redis + pgadmin
docker-compose up -d

# Check services
docker-compose ps
docker-compose logs -f postgres

# pgAdmin UI
http://localhost:5050
Email: admin@adearn.local  Password: admin

# Full reset (wipes all data)
docker-compose down -v && docker-compose up -d
```

### `docker-compose.yml`

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: adearn
      POSTGRES_PASSWORD: adearn
      POSTGRES_DB: adearn_dev
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U adearn"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    volumes: [redisdata:/data]

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@adearn.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports: ["5050:80"]
    depends_on: [postgres]

volumes:
  pgdata:
  redisdata:
```

---

## server/Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/package.json ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### `.dockerignore`
```
node_modules
dist
.env
*.test.ts
tests/
.git
```

---

## Railway Deployment (Production)

### Setup
1. Create Railway project
2. Add PostgreSQL service (Railway managed)
3. Add Redis service (Railway managed)
4. Create web service from GitHub repo, root: `server/`, Dockerfile: `server/Dockerfile`
5. Set environment variables in Railway dashboard (from `.env.example`)
6. Set `DATABASE_URL` and `REDIS_URL` from Railway's auto-generated service URLs

### Auto-deploy on push to `main`
Railway auto-deploys when GitHub Actions CI passes.

### Post-deploy migration
```bash
# Run once after first deploy
railway run npm run migrate
railway run npm run seed:demo
```

---

## Vercel Deployment (Frontend)

### Setup
1. Connect GitHub repo to Vercel
2. Set root directory: `web/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set env vars: `VITE_API_URL` (Railway backend URL) · `VITE_STRIPE_PUBLISHABLE_KEY`

### Auto-deploy
Vercel auto-deploys `web/` on push to `main`. Preview deployments on all PRs.

---

## GitHub Actions CI — `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: adearn
          POSTGRES_PASSWORD: adearn
          POSTGRES_DB: adearn_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ["5432:5432"]
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping"
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }

      - name: Install dependencies
        run: cd server && npm ci

      - name: TypeScript check
        run: cd server && npm run typecheck

      - name: Lint
        run: cd server && npm run lint

      - name: Run migrations
        run: cd server && npm run migrate
        env:
          DATABASE_URL: postgresql://adearn:adearn@localhost:5432/adearn_test

      - name: Tests
        run: cd server && npm run test:ci
        env:
          DATABASE_URL: postgresql://adearn:adearn@localhost:5432/adearn_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
          JWT_PRIVATE_KEY: ${{ secrets.JWT_PRIVATE_KEY_TEST }}
          JWT_PUBLIC_KEY: ${{ secrets.JWT_PUBLIC_KEY_TEST }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY_TEST }}
          STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET_TEST }}
          OTP_MOCK: true
          EMAIL_MOCK: true
          CASHBACK_MAX_PER_TRANSACTION: 500
          CASHBACK_MIN_PER_TRANSACTION: 1
          FRAUD_SCORE_THRESHOLD: "0.8"
          ATTRIBUTION_WINDOW_HOURS: "24"

      - name: Build
        run: cd server && npm run build

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: cd web && npm ci
      - run: cd web && npm run typecheck
      - run: cd web && npm run lint
      - run: cd web && npm run build
        env:
          VITE_API_URL: http://localhost:3000/api/v1
          VITE_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
```

### GitHub Secrets required
- `JWT_PRIVATE_KEY_TEST` — RS256 private key for test env
- `JWT_PUBLIC_KEY_TEST` — RS256 public key
- `STRIPE_SECRET_KEY_TEST` — `sk_test_...`
- `STRIPE_WEBHOOK_SECRET_TEST` — `whsec_...`

---

## Generate JWT Keys

```bash
# Generate RS256 key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Escape newlines for env var
cat private.pem | awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' > private_escaped.txt
cat public.pem  | awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' > public_escaped.txt
```

Paste the escaped content as `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in `.env`.

---

## Health Check

The server always exposes:
```
GET /health
Response: { "status": "ok", "version": "1.0.0", "db": "connected", "redis": "connected", "timestamp": "..." }
```

Used by Railway health check and monitoring.

---

## Stripe Webhook Production Setup

1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. Endpoint URL: `https://<railway-url>/api/v1/webhooks/stripe`
3. Events to listen: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy Signing Secret → add as `STRIPE_WEBHOOK_SECRET` in Railway env

---

## Turbo Build Pipeline — `turbo.json`

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

Build order: `packages/shared` → `server` + `web` (parallel).
