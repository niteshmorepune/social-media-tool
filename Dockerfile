FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Use the committed lockfile (npm ci) rather than re-resolving dependencies
# fresh on every build — a floating install meant every deploy could pick up
# a different, untested version of anything and break on completely
# unrelated code (confirmed 2026-09-18: 3 separate builds each failed on a
# different file purely from dependency drift between deploys).
RUN npm ci --legacy-peer-deps

COPY . .

# @prisma/client's own postinstall hook does not reliably regenerate the
# client in this environment (confirmed 2026-09-18 — a clean `npm ci`
# alone left a stale/incomplete client, causing "no exported member"
# errors cascading into ~50 implicit-any errors across unrelated files).
# Explicit step, same pattern Drishti's own Dockerfile already uses.
RUN npx prisma generate

# NEXT_PUBLIC_ vars are baked in at build time
ENV NEXT_PUBLIC_APP_URL=https://socialmediadost.com
ENV NEXT_PUBLIC_APP_NAME="Social Media Dost"
ENV NODE_ENV=production

RUN npx next build

EXPOSE 3000
ENV PORT=3000

CMD ["npx", "next", "start"]
