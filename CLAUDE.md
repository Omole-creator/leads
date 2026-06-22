# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

JobMingle Cohort Lead Tracking System. Course-enquiry leads submitted at
`jobmingle.co/apply` are emailed to `jobminglengr@gmail.com`; a Gmail Apps Script
forwards them to the app, which auto-assigns each to a **sales closer** by
round-robin, tracks it through a pipeline, records follow-ups, and shows a
dashboard. Built from Technical Spec v1.0; deviations are in
`~/.claude/plans/here-s-the-spec-golden-octopus.md`.

- **Live app:** https://jobmingleleads.vercel.app (Vercel, auto-deploys on push to `main`)
- **Repo:** https://github.com/Omole-creator/leads
- **DB:** Supabase Postgres (project `jobmingle-leads`, eu-west-1)
- **Admins (Google login):** `jobminglengr@gmail.com`, `admin@jobmingle.com`

## Commands

```bash
npm run dev / build / start / lint / typecheck
npm run test:unit         # Vitest pure logic — no DB
npm run test:integration  # Vitest against a real Postgres (truncates tables!)
npm run test:e2e          # Playwright (builds + serves; needs E2E_TEST_MODE)
npm run db:seed           # 10 tracks + cohort + admin + 3 demo closers (upserts)
npx tsx prisma/demo.ts    # wipe leads, create 24 demo leads
```

Single test: `npx vitest run tests/unit/metrics.test.ts` or `-t "close rate"`.
Single e2e: `npx playwright test tests/e2e/login.spec.ts`.

Secrets live in `.env.local` (gitignored). Source it for one-off DB/server
commands: `set -a && . ./.env.local && set +a && <cmd>`.

## Database & migrations (Supabase) — READ BEFORE TOUCHING

Prisma needs **two** URLs:
- **`DATABASE_URL` (runtime) = the TRANSACTION pooler** (`...pooler.supabase.com:6543`)
  `?pgbouncer=true&connection_limit=1`. Required for Vercel serverless — the
  *session* pooler (`:5432`) caps at **15 connections** and serverless exhausted
  it, breaking auth lookups and looping `/dashboard` → login (a real outage).
- **`DIRECT_URL` (migrations/db push) = the SESSION pooler** (`:5432`). The
  direct `db.<ref>...` host is often IPv6-only/unreachable.

Because the transaction pooler (pgbouncer transaction mode) does **not** support
interactive transactions, `ingestLead` is written as **sequential writes (no
`$transaction(async tx => …)`)**. Don't reintroduce an interactive transaction.

**Applying schema changes to the live DB: use `npx prisma db push`.** Safe and
additive. Migration SQL files under `prisma/migrations/` (0001–0006) exist for
CI/fresh deploys (`migrate deploy`); the live Supabase DB is kept in sync with
`db push`. Hand-write each new migration's SQL (don't use `migrate diff` with a
shadow DB — see the warning below).

⚠️ **NEVER** run `prisma migrate reset`, and **never** point `prisma migrate diff
--shadow-database-url` (or any shadow/replay command) at the live `DATABASE_URL`/
`DIRECT_URL` — doing so **resets/wipes the live database** (this happened once;
recovery was re-importing leads from Gmail). To author a migration, hand-write
the SQL in a new `prisma/migrations/NNNN_name/migration.sql` and `db push` the
schema. Free Supabase has no automatic backups — treat the DB as precious; the
**Gmail inbox is the source of truth** for leads and can repopulate them.

## Architecture

Next.js 15 App Router, TS strict, Prisma 5, NextAuth v5 (Google), Tailwind +
shadcn-style UI, Recharts, Resend, Zod. Deployed on Vercel serverless.

**Service layer is the source of truth, not the routes.** Logic in `src/lib/*`,
called by both API routes and Server Components:
- `src/lib/ingest.ts` — `ingestLead()`: the heart. Parses track name + price out
  of "Interested Skill", **auto-creates unknown tracks** (form offers options we
  don't seed, e.g. "I'm not sure yet"), find-or-creates the cohort from "Start
  Timeline", round-robin assigns, creates the lead + 7 follow-up rows + activity
  log, notifies the closer. Blank optional fields (phone/source/timeline) default
  to N/A/Unknown/Unspecified so a lead is never rejected.
- `src/lib/leads.ts` — list/detail + mutations: stage, notes, reassign,
  `addFollowUpLog`/`removeLastFollowUpLog`, `distributeUnassignedLeads(filters)`
  (round-robin, filter-aware), `importLeadsFromCsv`. `leadWhere()` scopes closers
  to their own leads; admins see all. Bulk assign-to-one-closer via
  `/api/leads/assign-all`.
- `src/lib/email.ts` + `email-template.ts` — Resend wrapper. `sendBulkEmails`
  (batch/100, rate-limited); from = "JobMingle Academy <contact@jobmingle.co>"
  (`RESEND_FROM_NAME`/`_EMAIL`), reply-to = from.
- `src/lib/round-robin.ts` — `pickNextRep()` (least-recently-assigned).
- `src/lib/commission.ts` — closer commission per won deal: **₦20,000 if track
  cost ≥ ₦280,000, else ₦10,000**.
- `src/lib/metrics.ts` + `metrics-service.ts` — dashboard aggregations.
- `src/lib/csv.ts` — RFC4180-ish CSV parser for the import feature.
- `src/lib/permissions.ts` — `canAccessLead` / `canManage`.

**Auth** (`auth.ts` + `auth.config.ts`, split for edge-safety): Google OAuth
restricted to active DB users; JWT carries `{id, role}`. `middleware.ts` only
gates logged-in vs not; **role checks live in pages/routes**. API uses
`requireUser`/`requireAdmin` from `src/lib/api.ts`. Google provider reads
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` explicitly (Auth.js v5 otherwise
expects `AUTH_GOOGLE_ID`).

**Data model** (`prisma/schema.prisma`): `Lead` → Track, Cohort, optional
assigned User (closer); has `FollowUp[]` (legacy 7-step, unused in UI),
`FollowUpLog[]` (the live follow-up tracker), `Note[]` (author now optional),
`ActivityLog[]`. Key fields: `segment` (APPLICATION | SCHOLARSHIP | IMPORTED | …),
`amountPaid`/`balanceLeft` (kept but **never shown to users**), `lastAssignedAt`
on User. `EmailCampaign` records every bulk email (status DRAFT|SENT). Track list
seeded from `prisma/tracks.data.ts` (import from there, **not** `prisma/seed.ts`,
which self-executes).

**Follow-up cadence:** closers advance one lead through 5 touches due **Day
3/7/14/21/29** from `lead.createdAt`. A single button (`FollowUpLogPanel` on the
lead page, `FollowUpQuickButton` on the leads list) shows the next due date
(red=overdue, amber=due-soon), logs a `FollowUpLog`, and auto-advances. Count
0→5 is visible to admins on the list.

**Closer deletion is graceful:** deleting a closer un-assigns their leads (admin
pool) and nulls their authorship on notes/follow-ups/activity — **all lead
history is preserved**; admin reassigns to a new closer who continues. Stage is
set via the lead-page Stage dropdown (drives funnel/close-rate/commission).

**Admins are protected:** the Closers page lists only `SALES_REP`, and the reps
DELETE API refuses `ADMIN` targets. Sign-in requires an active DB user, so 0
admins = total lockout ("access denied"). If ever locked out, re-add an admin
directly: `prisma.user.upsert({ where:{email}, create/update:{role:"ADMIN",
active:true} })` (run via `tsx` with `.env.local` sourced).

**Mobile:** the leads list renders as a table on `sm+` and **stacked cards** on
mobile (`sm:hidden`/`hidden sm:block`); nav is a hamburger (`AppNav`).

**Tutors & attendance** (`src/lib/students.ts`): `Role.TUTOR`; a tutor owns
track(s) via `Track.tutorId`. Winning a deal (`updateStage` → CLOSED_WON) enrolls
the lead as a student (`studentTrackId` = its track, `studentStatus` ACTIVE) →
routed to that track's tutor. Tutors see **only attendance** (`/attendance`,
`/attendance/[trackId]`): pick a class date, mark Present/Absent per active
student (upsert, unique `[leadId,date]`). Admin `/admin/attendance` shows
completion rate (enrolled − dropped − deferred ÷ enrolled) + engagement rate
(present ÷ marks) per track, and manages student status + track reassignment
(`/api/students/[id]`). Frontend/Backend/Fullstack = separate tracks; admin moves
each student to the right one. Role-based nav in `AppNav`; tutors are redirected
from `/dashboard` to `/attendance`.

**Commission by date range:** `GET /api/commission?from=&to=` returns won-deal
commission for the range (closer → own `total`; admin → `total` + `perRep`).
Dashboard has a `CommissionRange` widget (date pickers → amount); the admin
Closers page has `CloserCommissionPanel` (date range → amount per closer, so the
admin knows what to pay). The `Total Commission` KPI is unchanged.

**Roles:** DB enum is `SALES_REP`; the UI calls them **"Sales Closers"** /
"Closers" everywhere. Admin routes live under `/admin/*` (reps=closers, cohorts,
tracks, import).

## Hard constraints (don't regress)

- **No money in the closer-facing UI** except each closer's own **commission**.
  No program revenue/`amountPaid`/`balanceLeft`/track price shown to closers;
  track cost only on the admin Tracks page.
- **Closers see only leads assigned to them.** Imported/scholarship leads are left
  **unassigned** → admin-only by default.
- **Track matched by name** (case-insensitive); unknown → auto-created with the
  ₦ price parsed from the email. Seeded price wins for known tracks.
- **Follow-up tracker** = `FollowUpLog` (closer taps "Reached"/"No answer",
  target 5). The old 7-step `FollowUp` checklist is no longer rendered.

## Gmail bridge (`apps-script/gmail-bridge.gs`)

Pure-ASCII (copy from the GitHub **raw** URL — pasting from chat introduces smart
quotes / non-breaking spaces that break Apps Script). Parses **asterisk-wrapped**
labels (`*Full Name:* Omole`) from Gmail's plain-text rendering; extracts a clean
email even when wrapped in markup. Search query matches the body phrase
"new lead just submitted". Labels processed emails `lead-processed` / failures
`lead-failed`; `clearFailedLabel()` retries failures; **`resetAllLabels()` is for
a full rebuild only — re-running it duplicates existing leads** (dedupe by email
if that happens). Config (`INGEST_URL`, `INGEST_SECRET`) is inlined at the top.

## Vercel / deploy notes

- Build runs `prisma generate && next build` (+ `postinstall: prisma generate`)
  so the client exists on fresh installs.
- `next.config.mjs` uses `outputFileTracingIncludes` + `serverExternalPackages`
  to bundle the Prisma **query engine** into serverless functions — without it,
  DB pages 500 at runtime while non-DB pages work.
- Env vars in Vercel: `DATABASE_URL` (**transaction** pooler `:6543`
  `?pgbouncer=true&connection_limit=1`), `DIRECT_URL` (**session** pooler `:5432`),
  `AUTH_SECRET` + `NEXTAUTH_SECRET`, `INGEST_SHARED_SECRET`, `AUTH_TRUST_HOST=true`,
  `NEXTAUTH_URL`/`APP_URL` = live URL, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL=contact@jobmingle.co`. **Do NOT set `E2E_TEST_MODE`** in prod.

## Email (Resend) — live

Domain `jobmingle.co` is verified in Resend; `RESEND_API_KEY`/`RESEND_FROM_EMAIL`
(`contact@jobmingle.co`) are set in Vercel. Two paths:
- **Assignment notification** (`sendLeadAssignedEmail`) → the **assigned closer**,
  fired **only on new ingest** (not on bulk reassign — avoids hundreds of sends).
- **Bulk personalized** (`/admin/email`): filter by segment/track/stage/cohort,
  templated `{{firstName}}/{{name}}/{{track}}`, **save draft / edit / send /
  delete**, full **sent history**. Dedupes by email. Free tier = 100/day, 3000/mo.

Verify deliveries in the **Resend dashboard → Logs**. `jobmingle.co` is also used
by Kit (email marketing) — they coexist (separate DKIM).

## Recharts gotchas (cost real debugging time)

- Axes must be **direct children** of `BarChart` — Recharts v2 ignores axis props
  inside a React Fragment, collapsing all bars to one with no labels. Use one
  `<XAxis>`/`<YAxis>` with conditional props (see `charts/BarChartCard.tsx`).
- Server→Client props can't be functions; pass `format="naira|percent|number"`.
- Pass `barColor` as a **literal hex string**, not `BRAND.x` — object-property
  values imported from a `"use client"` module don't resolve in a Server
  Component (they came through `undefined`). `STAGE_BAR_COLORS` (a top-level array
  export) does work.
- Wrap charts in a fixed-height div + `ResponsiveContainer width/height="100%"`,
  `isAnimationActive={false}`.

## Brand / design

Primary **black + yellow** (`#0A0A0A` / `#FFD400`), secondary **blue + red**
(`#1D4ED8` / `#E11D2A`) used semantically (New=blue, Sales Lost=red), white
background. Restrained — single-hue bars, no rainbow. Stages are "Sales Won/Lost"
(enum `CLOSED_WON`/`CLOSED_LOST`). KPI cards alternate black/yellow.

## Testing notes

- Integration tests **truncate all tables** in `beforeEach` (`tests/integration/
  helpers.ts`) — they wipe live data. **Do not run them against the production
  Supabase** while it holds real leads. They run sequentially, raised timeouts,
  skip cleanly without a DB URL.
- E2E uses a **test-only credentials provider** gated by `E2E_TEST_MODE=true`
  (also reveals dev sign-in buttons on `/login`). `global-setup.ts` logs in
  admin + closer and saves storage states. Serving for e2e/preview: set `PORT`,
  matching `NEXTAUTH_URL`, `AUTH_TRUST_HOST=true`.
