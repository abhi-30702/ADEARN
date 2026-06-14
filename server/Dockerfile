# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root manifests first for better layer caching
COPY package.json ./
COPY server/package.json ./server/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including devDeps needed for tsc)
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY packages/shared/ ./packages/shared/
COPY server/ ./server/

# Build shared types then server
RUN cd packages/shared && npx tsc --outDir dist --declaration
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

# Install production dependencies only
RUN npm install --workspaces --include-workspace-root --omit=dev

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY server/migrations/ ./server/migrations/

# Switch to non-root
USER adearn

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server/dist/server.js"]
