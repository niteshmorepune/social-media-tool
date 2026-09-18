FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# `npm ci` against a lockfile committed from a non-Linux dev machine does NOT
# reliably resolve Linux/musl-specific optional native binaries (confirmed
# 2026-09-18 — lightningcss's linux-x64-musl.node was missing under `npm ci`,
# even though the exact same lockfile's `npm install` locally on Windows
# works fine). A fresh, platform-aware `npm install` run directly inside this
# container correctly detects its own OS/libc and pulls the right binaries —
# this is very likely why the Dockerfile originally deleted the lockfile at
# all, before this comment existed to say so explicitly.
RUN rm -f package-lock.json && npm install --legacy-peer-deps

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
