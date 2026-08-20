# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @acmeu/shared --workspace @acmeu/api --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json tsconfig.json package.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @acmeu/shared \
 && npm run build --workspace @acmeu/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S acmeu && adduser -S acmeu -G acmeu \
 && mkdir -p /var/lib/acmeu/storage /app/.keys \
 && chown -R acmeu:acmeu /var/lib/acmeu /app

COPY --from=deps --chown=acmeu:acmeu /app/node_modules ./node_modules
COPY --from=build --chown=acmeu:acmeu /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=acmeu:acmeu /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=acmeu:acmeu /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=acmeu:acmeu /app/apps/api/package.json ./apps/api/
COPY --chown=acmeu:acmeu package.json ./

USER acmeu
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/api/dist/index.js"]
