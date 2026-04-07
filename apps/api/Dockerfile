FROM node:20-alpine AS base
RUN apk add --no-cache curl
WORKDIR /app

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS builder
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared --include-workspace-root
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# esbuild bundles everything into a single dist/server.js
RUN npm run build --workspace=apps/api

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared --include-workspace-root --omit=dev
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]
