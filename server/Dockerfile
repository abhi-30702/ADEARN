# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root manifests first for better layer caching
COPY package.json ./
COPY server/package.json ./server/
COPY packages/shared/package.json ./packages/shared/

# npm registry connections over Docker Desktop's network can idle-time-out on
# slow links; raise the idle-timeout threshold itself (fetch-timeout) as well
# as the retry backoff, since EIDLETIMEOUT isn't always retried at the
# default 300s threshold.
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install all dependencies (including devDeps needed for tsc)
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY server/ ./server/

# Build shared types then server
RUN cd packages/shared && npx tsc --outDir dist --declaration

# packages/shared's package.json points "main" at ./src/index.ts so host dev
# tooling (tsx, Vite, jest) can execute the TypeScript source directly. The
# compiled server run by this image only has dist/ available, so repoint
# main/types at the built output for this image only — the source package.json
# on disk (and therefore host dev) is untouched.
RUN cd packages/shared && npm pkg set main=./dist/index.js types=./dist/index.d.ts

RUN cd server && npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: non-root user
RUN addgroup -S adearn && adduser -S adearn -G adearn

WORKDIR /app

# Copy workspace root for npm workspaces resolution
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install production dependencies only
RUN npm install --workspaces --include-workspace-root --omit=dev

# Copy built artifacts (package.json here overwrites the one used for the
# install above, swapping in the dist-pointing "main" set during the build)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY server/migrations/ ./server/migrations/

# Switch to non-root
USER adearn

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server/dist/server.js"]
