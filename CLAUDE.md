# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Next.js dev server with Turbopack on http://localhost:3000

# Production build — next build uses webpack by default (no --webpack flag needed)
npm run build

# Database
npm run db:generate    # regenerate Prisma client after schema changes
npm run db:push        # push schema to DB without migrations (no migrations folder exists)
npm run db:studio      # open Prisma Studio
npm run db:seed        # seed admin user: admin@yourdomain.com / admin123
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Canonical URL |
| `ANTHROPIC_API_KEY` | Claude API key for content generation |
| `REPLICATE_API_TOKEN` | Replicate token for image generation (Flux-1.1-pro) |
| `RUNWAYML_API_SECRET` | RunwayML key for video generation (Gen-3 Turbo) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Media storage |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Email via Nodemailer |
| `NEXT_PUBLIC_APP_URL` | Public base URL (baked into build) |
| `NEXT_PUBLIC_APP_NAME` | Display name shown in UI (baked into build) |

**Local dev:** Prisma CLI reads `.env`, Next.js reads `.env.local`. Keep `DATABASE_URL` in `.env` for Prisma commands.

**Local DB:** MySQL on localhost, DB name `social_media_tool`, no password for root (standard XAMPP/local setup).

## Architecture

### Route Groups & Roles

Three route groups enforced by `middleware.ts`:

- `app/(admin)/` — ADMIN + TEAM roles: full dashboard
- `app/(auth)/` — unauthenticated: login only
- `app/(client)/portal/` — CLIENT role only: approval portal

Three roles: `ADMIN`, `TEAM`, `CLIENT`. Only ADMIN can access `/team`. All API routes call `auth()` directly — middleware only protects pages.

### Data Model

```
Client → Brief (scheduledMonth = first day of month)
           └── BriefPlatform (platform × contentType)
                 └── Content (status: PENDING → APPROVED/REJECTED/REVISION_REQUESTED)
                       └── Revision (comment thread)
User → Notification
```

- `Content.mediaStatus`: plain string enum `NONE | GENERATING | READY | FAILED`
- `Content.scheduledDate`: nullable; calendar falls back to day 1 of `Brief.scheduledMonth` when null
- `Content.internalNote`: nullable Text; team-only note, never returned to CLIENT role or shown in portal
- Regenerating a BriefPlatform deletes its existing Content row first
- `Client` has 5 Brand Voice Profile fields (all nullable Text): `brandKeywords`, `contentDos`, `contentDonts`, `competitorsToAvoid`, `preferredHashtags` — injected into AI prompts at generation time via `buildBrandVoiceSection(client)` helper

### Content Generation — `POST /api/generate`

Accepts optional params beyond `briefPlatformId`:
- `direction` (string) — freeform instruction injected as top-priority note overriding the brief
- `contentIdToReplace` (string) — if set, deletes that specific Content row before inserting the new one (used by "Regenerate with Direction" in ContentViewDrawer); if not set and `addPost` is false, deletes all platform content
- `addPost` (bool) — when true, appends rather than replacing; combined with `contentIdToReplace` for single-post regeneration
- `skipMedia` (bool) — skip the media pipeline entirely (text only)

1. Calls `claude-sonnet-4-6` with `tool_choice: { type: 'any' }` using platform-specific tool schemas (`generate_image_content`, `generate_video_content`, `generate_carousel_content`)
2. Injects `buildBrandVoiceSection(client)` into the user prompt (returns empty string when client has no Brand Voice fields set — backward-compatible)
3. Saves text fields to `Content` immediately
4. Triggers media pipeline by `contentType` (unless `skipMedia`):
   - **IMAGE**: Replicate `flux-1.1-pro` → Cloudinary → `imageUrl`, `mediaStatus=READY`
   - **VIDEO**: Replicate thumbnail → Cloudinary → RunwayML `gen3a_turbo` (async, **10s clip**, silent) → `mediaJobId`, `mediaStatus=GENERATING`. `VideoStatusPoller` polls `GET /api/media/status/[contentId]` every 6s until RunwayML SUCCEEDED → uploads video to Cloudinary
   - **CAROUSEL**: Replicate generates one image per slide sequentially (rate limit avoidance)

**Retry media (`POST /api/media/regenerate`)** — non-blocking: marks `GENERATING` and returns immediately; pipeline runs as a fire-and-forget async function in the Node.js process. `GeneratingPoller` component on the approvals page auto-refreshes every 5s while any IMAGE/CAROUSEL is `GENERATING`.

### Known SDK / API Quirks

- **Replicate SDK v1.x** — `replicate.run()` returns a `FileOutput` object, not `string[]`. `lib/media-generation.ts` normalises: checks `typeof`, `Array.isArray`, falls back to `.url().toString()`
- **Replicate 429 rate limit** — `runReplicate()` wrapper in `lib/media-generation.ts` retries up to 5 times, honouring `retry-after` header with a minimum growing backoff (3s, 6s, 9s…)
- **RunwayML `gen3a_turbo`** — hard 1000-char limit on `promptText`; `generateThumbnailAndStartVideo()` truncates to 997 + `'...'`. Max clip duration is **10 seconds** (hardcoded); generates silent video only — no audio
- **`BriefForm.tsx` month picker** — `type="month"` stores `YYYY-MM` in state; `-01` suffix appended only at submit, never in `onChange`
- **Runway/Replicate clients are lazy getters** — `lib/runway-client.ts` exports `getRunway()` (not a singleton instance) because Next.js evaluates module-level code at build time when collecting page data, which throws if env vars are absent

### PDF Export

`/export/print` uses `jsPDF` text rendering only — `html2canvas` was removed (can't parse Tailwind v4's `oklch()` colors). `sanitize()` in `PrintReport.tsx`:
1. Maps ~60 emoji to Latin-1 symbols (Helvetica only covers 0x00–0xFF)
2. Replaces curly quotes, em dashes, ellipsis, and remaining non-Latin-1 chars

### Key Files

- `auth.ts` — NextAuth v5, Credentials provider + JWT, `trustHost: true` (required behind reverse proxy)
- `middleware.ts` — Edge middleware, route protection
- `lib/prisma.ts` — Singleton Prisma client (globalThis pattern for HMR safety)
- `lib/claude.ts` — Anthropic client singleton, server-only
- `lib/runway-client.ts` — Lazy RunwayML getter `getRunway()`, server-only
- `lib/replicate-client.ts` — Replicate singleton, server-only
- `lib/cloudinary-client.ts` — Cloudinary config + `uploadFromUrl()`, server-only
- `lib/media-generation.ts` — Full media pipeline orchestration; `runReplicate()` wrapper handles 429 retries
- `components/GeneratingPoller.tsx` — Client component; polls `router.refresh()` every 5s when IMAGE/CAROUSEL is GENERATING
- `components/ContentViewDrawer.tsx` — Client component; slide-over drawer on the brief detail page. Opens on "View →" click, fetches full content via `GET /api/content/[id]` on open. Re-fetches automatically when `status`/`mediaStatus` props change after a `router.refresh()`. Includes all text fields, media preview, **Revision Thread** (role-coloured: client=orange, team=blue; team can reply via `POST /api/content/[id]/revisions`), ScheduleDatePicker, ApprovalActions, **Regenerate with Direction** footer, and **Internal Note** amber textarea (auto-saves on blur). Props include `briefPlatformId` and `totalPosts`.
- `components/CollapsiblePlatformCard.tsx` — Client component; wraps each platform section on the brief detail page with a chevron toggle. Completed platforms (`existingCount >= postsCount`) default to collapsed.
- `components/DeleteBriefButton.tsx` — Client component; inline confirm-then-delete for a brief. On success redirects to `/briefs`.
- `components/DuplicateBriefButton.tsx` — Client component; duplicates a brief to next calendar month (POST /api/briefs/[id]/duplicate), then navigates to the new brief.
- `components/NotificationBell.tsx` — Client component in Sidebar footer. Fetches `/api/notifications` on mount; shows unread badge; on click marks all read (PATCH) + opens fixed-position dropdown (left:272px, avoids sidebar overflow clipping). Notification type icons: ✅ APPROVED, ✏️ REVISION_REQUESTED. timeAgo helper for relative timestamps.
- `components/ApprovalsContent.tsx` — Client component wrapping the approvals card list. Manages checkbox `Set<string>` state for eligible items (PENDING + REVISION_REQUESTED). Shows a bulk-action bar with "Approve N" and "Reject N" buttons; calls `PATCH /api/content/bulk` then `router.refresh()` via `useTransition`.
- `components/PortalCommentBox.tsx` — Client component in portal; allows client to add a follow-up comment on REVISION_REQUESTED content without changing status (calls `PATCH /api/portal/content/[id]` with `{ action: 'COMMENT', comment }`).
- `components/PlatformMockup.tsx` — Server component; renders content inside a platform-styled mockup frame. Used in the client portal. Switch on `platform` prop: Instagram, Facebook, LinkedIn, Twitter, TikTok, Google Business, Default. Uses `extractMediaProps()` helper to pass only the 6 media-relevant fields to inner `MockupMedia` component (avoids TypeScript excess-property errors from spread). Caption and hashtags embedded in mockup; other fields shown below.
- `lib/utils.ts` — `PLATFORMS`, `CONTENT_GOALS`, `CAPTION_LIMITS`, `VIDEO_DURATIONS` + UI helpers
- `prisma/schema.prisma` — Source of truth; no migrations, use `db:push`
- `types/next-auth.d.ts` — Extends Session with `id`, `role`, `clientId`

### API Routes

```
POST   /api/generate                    # single BriefPlatform generation
POST   /api/generate/bulk               # all BriefPlatforms in a brief
GET    /api/media/status/[contentId]    # poll RunwayML; uploads to Cloudinary on SUCCEEDED
POST   /api/media/regenerate            # retry media pipeline only (non-blocking: returns GENERATING immediately, runs pipeline in background)
GET/POST        /api/briefs
GET/PUT/DELETE  /api/briefs/[id]        # DELETE cascades to all platforms, content, and revisions
GET/POST        /api/clients
GET/PUT/DELETE  /api/clients/[id]
GET    /api/content/[id]               # fetch single content item with revisions (incl. requestedBy.role for thread coloring)
PATCH  /api/content/[id]               # mode 1: status action; mode 2: { scheduledDate } update; mode 3: { internalNote } update (all detected by key presence)
DELETE /api/content/[id]               # delete a single content item
PATCH  /api/content/bulk               # bulk status update: { ids: string[], action: 'APPROVE'|'REJECT' }
POST   /api/content/[id]/revisions     # team adds a comment to revision thread without changing status
POST   /api/briefs/[id]/duplicate      # clone brief+platforms to next calendar month (no content cloned)
GET    /api/notifications              # get last 20 notifications + unread count (ADMIN/TEAM only)
PATCH  /api/notifications              # mark all notifications as read (ADMIN/TEAM only)
PATCH  /api/portal/content/[id]        # CLIENT role: APPROVE | REQUEST_REVISION | COMMENT (COMMENT adds revision without status change)
GET    /api/export                      # CSV export
GET/POST /api/team                      # ADMIN only
PATCH  /api/settings/password           # change own password
GET/PATCH /api/settings/profile         # get or update own name/email
```

### UI / Naming Notes

- **Brief form** — the `campaignDescription` DB field is labelled **"Content Brief"** in the UI (renamed from "Campaign Description" to avoid confusion). Section heading is "Brief Details" (was "Campaign Details").
- **Help & Guide page** — `app/(admin)/help/page.tsx`, accessible to all ADMIN + TEAM roles at `/help`. Covers full workflow including Brand Voice Profile, Regenerate with Direction, Internal Notes, Platform Mockups, and the Reports page.
- **Brief detail page** — platform sections are collapsible (chevron toggle). Completed platforms default to collapsed. "View →" on each post opens a slide-over drawer. Header has: "Duplicate to next month" button (→ `/briefs/[newId]`), "Delete Brief" button (inline confirm), Bulk Generate button.
- **Approvals page** — paginated at 20 items per page. Content list is rendered by `ApprovalsContent` client component which adds bulk-selection (checkboxes) with "Approve N / Reject N" bulk action bar. Only PENDING and REVISION_REQUESTED items are selectable. Server component keeps filter tabs and pagination.
- **Reports page** — `app/(admin)/reports/page.tsx`. Single Prisma `findMany` across all content, aggregated in JS. Shows: 4 stat cards (total, approval rate %, awaiting, avg days to approval), proportional status bar, per-client table, per-platform stacked bars, oldest-awaiting list.
- **Client portal** — content grouped by brief; each brief shows a progress card (% approved, progress bar, status breakdown). Posts use `PlatformMockup` frame. Revision thread is role-coloured: client comments orange, team replies blue. Client can add follow-up comments on REVISION_REQUESTED content via `PortalCommentBox`. Approved content with media shows download links (Cloudinary `fl_attachment`). Internal notes never exposed to CLIENT role.
- **Notifications** — `NotificationBell` in Sidebar footer; triggered when client approves/requests revision via portal. Routes to assigned team member or falls back to all ADMIN users. Fixed-position dropdown (left:272px) avoids sidebar `overflow-y-auto` clipping.
- **Brand Voice Profile** — `Client` form (`components/ClientForm.tsx`) has a "Brand Voice Profile" section at the bottom with tone keyword chips (15 presets + free text), Always Do / Never Do textareas, competitors field, and hashtags field. Toggle logic uses `Set` with `if/else` (not ternary expression — ESLint `no-unused-expressions` blocks that pattern).

### Hydration Warnings

Browser extensions cause React hydration mismatches. Pattern: `suppressHydrationWarning` on:
- `<body>` in `app/layout.tsx` — Grammarly etc.
- Login `<input>` fields — password managers
- `<div>` + `<video>` in `MediaDisplay.tsx` — video speed controllers

### Media Downloads

`MediaDisplay.tsx` uses Cloudinary's `fl_attachment` transform: insert `/fl_attachment:filename/` after `/upload/` in the URL to force `Content-Disposition: attachment`.

## Deployment (VPS — Production)

**Live at:** `https://socialmediadost.com`  
**Server:** Hostinger VPS, Ubuntu 24.04, IP `72.60.98.246`  
**App dir:** `/opt/app/social-media-tool/`  
**Git remote:** `https://github.com/niteshmorepune/social-media-tool`

### Stack
- **Traefik** reverse proxy with HTTP-01 ACME (`myhttpchallenge` resolver, certs in `traefik_data` Docker volume)
- **App** container built from `Dockerfile` — runs `rm -f package-lock.json && npm install` to avoid Windows lock file missing Linux musl binaries
- **MySQL 8.0** in separate container, `social-media-tool_mysql_data` volume
- Both join `root_default` external network (shared with n8n/Traefik at `/root/docker-compose.yml`)

### Deploy workflow

```bash
# Local: commit and push changes
git add -A && git commit -m "..." && git push

# SSH into VPS
ssh root@72.60.98.246
cd /opt/app/social-media-tool
git pull origin master
docker compose up --build -d

# If schema changed:
docker compose exec app npx prisma db push
```

### Docker build notes
- `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_APP_NAME` are hardcoded in `Dockerfile` as `ENV` (baked at build time)
- `package-lock.json` is deleted before `npm install` in Docker — Windows lock file omits `linux-x64-musl` optional binaries (lightningcss, etc.)
- Container start command is `npx next start` (not `node server.js` — standalone output is not enabled)
- If VPS branch diverges from GitHub: `git fetch origin && git reset --hard origin/master` then rebuild
- If Traefik fails ACME with 500 and a stale IP: clear the `socialmediadost.com` entry from `acme.json` in `traefik_data` volume and restart Traefik
