# syntax=docker/dockerfile:1.7

# ─── Build stage ──────────────────────────────────────────────────────────
FROM node:24-alpine AS build

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app
COPY . .
RUN pnpm run build && \
    pnpm prune --prod

# ─── Runtime stage ────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

# Don't run as root
RUN addgroup -g 1001 -S app && \
    adduser -S -D -H -u 1001 -G app app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BODY_SIZE_LIMIT=256M

COPY --from=build --chown=app:app /app/build ./build
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3000

# adapter-node outputs an `index.js` entry under `build/`
CMD ["node", "build"]
