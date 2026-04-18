# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # starts Next.js with Turbopack (default in Next 15)
npm run lint

# Production build — npm run build uses Turbopack and crashes on Hostinger; always use npx directly
npx next build --webpack

# Database
npm run db:generate    # regenerate Prisma client after schema changes
npm run db:push        # push schema to DB without migrations (used in prod — no migrations folder)
npm run db:studio      # open Prisma Studio
npm run db:seed        # seed initial admin user (admin@yourdomain.com / admin123)
```

## Environment Variables

Copy `.env.local.example` to `.env.local`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string — TCP for local, socket path on Hostinger (see Database section) |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Canonical URL (e.g. `http://localhost:3000`) |
| `ANTHROPIC_API_KEY` | Claude API key for content generation |
| `REPLICATE_API_TOKEN` | Replicate API token for image generation (Flux-1.1-pro) |
| `RUNWAYML_API_SECRET` | RunwayML API key for video generation (Gen-3 Turbo) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for media storage |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Nodemailer SMTP config |
| `NEXT_PUBLIC_APP_URL` | Public base URL for client-side links |
| `NEXT_PUBLIC_APP_NAME` | Display name shown in UI |

## Architecture

### Route Groups & Roles

Three route groups enforced by `middleware.ts` (wraps NextAuth `auth()`):

- `app/(admin)/` — ADMIN + TEAM: dashboard, clients, briefs, generate, approvals, calendar, export, team, settings
- `app/(auth)/` — unauthenticated: login page
- `app/(client)/portal/` — CLIENT role only (single portal page for client approvals)

Three roles: `ADMIN`, `TEAM`, `CLIENT`. Only ADMIN can access `/team`. Middleware matcher excludes `/api`, `_next/static`, `_next/image`, `favicon.ico`, `public`. All API routes call `auth()` directly to check session and role.

### Data Model & Content Flow

```
Client (brand profile)
  └── Brief (campaign + goal, scheduledMonth = first day of target month)
        └── BriefPlatform (one row per platform × contentType selected)
              └── Content (AI-generated, status: PENDING → APPROVED/REJECTED/REVISION_REQUESTED)
                    └── Revision (comment thread)

User → Notification (in-app: CONTENT_READY, APPROVED, REJECTED, REVISION_REQUESTED)
```

- Regenerating a `BriefPlatform` deletes its existing `Content` row first.
- `Content.mediaStatus` is a plain string enum: `NONE | GENERATING | READY | FAILED`.
- `Content.scheduledDate` (nullable DateTime) is the specific posting date. When null, the calendar falls back to day 1 of `Brief.scheduledMonth`. Set via `ScheduleDatePicker` on the approvals page.

### Content Generation — `POST /api/generate`

1. Calls Claude (`claude-sonnet-4-6`) with `tool_choice: { type: 'any' }` (forced tool use) using one of three platform-specific tool schemas: `generate_image_content`, `generate_video_content`, `generate_carousel_content`.
2. Saves text fields to `Content` immediately.
3. Triggers the media pipeline based on `contentType`:
   - **IMAGE**: Replicate `flux-1.1-pro` → Cloudinary → `Content.imageUrl`, `mediaStatus = READY`
   - **VIDEO**: Replicate thumbnail → Cloudinary → RunwayML `gen3a_turbo` (async) → `Content.mediaJobId`, `mediaStatus = GENERATING`. Frontend `VideoStatusPoller` polls `GET /api/media/status/[contentId]` every 6 seconds. When RunwayML SUCCEEDED: video uploaded to Cloudinary → `Content.videoUrl`, `mediaStatus = READY`.
   - **CAROUSEL**: Replicate generates one image per slide sequentially (to avoid rate limits) → slides JSON updated with `imageUrl` per slide.

Aspect ratios are platform-specific — see `lib/media-generation.ts` for Flux and RunwayML ratio mappings.

### Known SDK / API Quirks

- **Replicate SDK v1.x** returns a `FileOutput` object from `replicate.run()`, not a `string[]`. `lib/media-generation.ts` normalises this: checks `typeof output`, `Array.isArray`, then falls back to calling `.url().toString()` on the FileOutput object.
- **RunwayML `gen3a_turbo`** has a hard **1000-character limit** on `promptText`. `generateThumbnailAndStartVideo()` truncates to 997 chars + `'...'` before calling the API.
- **`BriefForm.tsx` month picker**: `type="month"` input stores `YYYY-MM` in state. The `-01` suffix (making it a full date) is appended only when building the API payload at submit time — never in the `onChange` handler.

### PDF Export

The export print page (`/export/print`) uses `jsPDF` text rendering only — `html2canvas` was removed because it cannot parse Tailwind v4's `oklch()` color syntax. The `sanitize()` function in `PrintReport.tsx` handles two concerns before passing text to jsPDF:
1. Maps ~60 common emoji to Latin-1 symbols (`»`, `·`, `°`, `+`, `×`, etc.) so meaning is preserved.
2. Replaces curly quotes, em dashes, ellipsis, and any remaining non-Latin-1 characters — Helvetica only covers 0x00–0xFF.

### Key Files

- `auth.ts` — NextAuth v5 config, Credentials provider + JWT strategy, `trustHost: true` (required for reverse-proxy).
- `middleware.ts` — Edge middleware for route protection.
- `lib/prisma.ts` — Singleton Prisma client (globalThis pattern for dev HMR safety).
- `lib/claude.ts` — Anthropic client singleton, **server-only**.
- `lib/replicate-client.ts` — Replicate client singleton, **server-only**.
- `lib/runway-client.ts` — RunwayML client singleton, reads `RUNWAYML_API_SECRET`, **server-only**.
- `lib/cloudinary-client.ts` — Cloudinary config + `uploadFromUrl()` helper, **server-only**.
- `lib/media-generation.ts` — Orchestrates full media pipeline: `generateImage()`, `generateThumbnailAndStartVideo()`, `generateCarouselImages()`. Contains Replicate FileOutput normalisation and RunwayML prompt truncation.
- `lib/utils.ts` — `PLATFORMS`, `CONTENT_GOALS`, `CAPTION_LIMITS`, `VIDEO_DURATIONS` constants + shared UI helpers (`cn`, `formatDate`, `getStatusColor`).
- `lib/email.ts` — Nodemailer setup for notifications.
- `types/next-auth.d.ts` — Extends Session type with `id`, `role`, `clientId`.
- `prisma/schema.prisma` — Source of truth. No migrations folder — schema changes are applied with `prisma db push`.

### API Routes

```
POST /api/generate                  # generate content for a single BriefPlatform
POST /api/generate/bulk             # generate content for all BriefPlatforms in a brief
GET  /api/media/status/[contentId]  # poll RunwayML job; uploads to Cloudinary on SUCCEEDED
POST /api/media/regenerate          # retry media pipeline only (no re-running Claude); uses saved prompts
GET/POST /api/briefs
GET/PUT/DELETE /api/briefs/[id]
GET/POST /api/clients
GET/PUT/DELETE /api/clients/[id]
PATCH /api/content/[id]             # two modes: (1) status action, (2) { scheduledDate } update
POST /api/portal/content/[id]       # client-side approval actions (CLIENT role only)
GET  /api/export                    # export content data as CSV
GET  /api/auth/[...nextauth]        # NextAuth v5 handler
GET/POST /api/team                  # user/team management (ADMIN only)
PATCH /api/settings/password        # change own password
```

`PATCH /api/content/[id]` detects mode by presence of `scheduledDate` key in the body — if present, updates the date and returns immediately without touching status.

### Hydration Warnings

Browser extensions routinely inject attributes into DOM elements and cause React hydration mismatches. The pattern is `suppressHydrationWarning` on the affected element:

- `<body>` in `app/layout.tsx` — Grammarly, ColorZilla etc.
- Email/password `<input>` in `app/(auth)/login/page.tsx` — password managers.
- `<div>` wrapper and `<video>` in `components/MediaDisplay.tsx` — video speed controller extensions.

### Media Downloads

`MediaDisplay.tsx` adds download links using Cloudinary's `fl_attachment` URL transformation — insert `/fl_attachment:filename/` after `/upload/` in the Cloudinary URL to force `Content-Disposition: attachment`.

### Database

**Local (XAMPP):** Standard TCP — `DATABASE_URL="mysql://root:@localhost:3306/social_media_tool"`

**Prisma CLI reads `.env`, not `.env.local`.** When running Prisma commands locally, either keep `.env` pointing at the local DB or pass `DATABASE_URL=...` as a prefix. Next.js at runtime reads `.env.local` which takes precedence.

**Production (Hostinger):** TCP port 3306 is blocked; must use Unix socket:
```
DATABASE_URL="mysql://USER:PASSWORD@localhost/DBNAME?socket=/tmp/mysql.sock"
```

The production admin user email is `admin@socialmediadost.com`.

### Deployment (Hostinger Shared Hosting)

- Server: `~/domains/socialmediadost.com/` running LiteSpeed + Phusion Passenger
- Node.js: `/opt/alt/alt-nodejs20/root/usr/bin/node` — always prepend to PATH in SSH
- Entry point: `server.js` (custom HTTP server wrapping Next.js, also prepends the Node PATH)
- Build **must** be done locally (`npx next build --webpack`) — Turbopack panics on shared hosting
- After `npm install` on server, delete `package-lock.json` first (Windows lock file omits Linux native binaries like `@tailwindcss/oxide-linux-x64-gnu`)
- Restart Passenger: `touch ~/domains/socialmediadost.com/tmp/restart.txt`

#### Deployment scripts (root of repo)

- `deploy-script.cjs` — uploads a pre-built `deploy.tar.gz` archive, extracts, runs `npm install --omit=dev`, `prisma generate`, touches `tmp/restart.txt`
- `build-on-server.cjs` — installs all deps + builds Next.js directly on the server (slow, avoid)

**Standard deploy workflow:**
1. `npx next build --webpack` locally
2. `tar -czf <output-path>/deploy.tar.gz --exclude=./node_modules --exclude=./.env.local .`
3. `node deploy-script.cjs`
4. If schema changed: run `prisma db push` on server (reuse the ssh2 pattern from the deploy scripts)
