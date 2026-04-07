FROM node:20-alpine AS base
RUN apk add --no-cache curl
WORKDIR /app

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared --include-workspace-root
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# Bundle server and migrate into single files
RUN npm run build --workspace=apps/api
RUN npx esbuild apps/api/src/db/migrate.ts --bundle --outfile=apps/api/dist/migrate.js --platform=node --target=node20 --format=esm --external:pg --external:dotenv

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/api --workspace=packages/shared --include-workspace-root --omit=dev
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "--input-type=module", "-e", "import('./apps/api/dist/migrate.js').then(()=>import('./apps/api/dist/server.js'))"]
