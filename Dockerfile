FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g npm@11
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS prod-deps
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g npm@11
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

FROM base AS runner
RUN apk add --no-cache openssl libc6-compat postgresql-client su-exec
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/pdfkit/js/data ./node_modules/pdfkit/js/data
COPY --from=builder /app/node_modules/pdfkit/js/data /ROOT/node_modules/pdfkit/js/data
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
COPY --chown=nextjs:nodejs scripts ./scripts
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV UPLOAD_DIR=/app/uploads
VOLUME ["/app/uploads"]
ENTRYPOINT ["./docker-entrypoint.sh"]