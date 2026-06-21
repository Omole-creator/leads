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

Prisma needs **two** URLs: `DATABASE_URL` (runtime) + `DIRECT_URL` (migrations).
Use the **session pooler** host (`...pooler.supabase.com:5432`) for *both* in
this app — IPv4 and supports the interactive transaction `ingestLead` uses. The
transaction pooler (`:6543`) breaks interactive transactions; the direct
`db.<ref>...` host is often IPv6-only/unreachable.

**Applying schema changes to the live DB: use `npx prisma db push`.** It is safe
and additive. Migration SQL files under `prisma/migrations/` (0001–0003) exist
for CI/fresh deploys (`migrate deploy`), but the live Supabase DB is kept in sync
with `db push`.

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
  `addFollowUpLog`/`removeLastFollowUpLog`, `distributeUnassignedLeads`
  (round-robin all unassigned), `importLeadsFromCsv`. `leadWhere()` scopes
  closers to their own leads; admins see all.
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
assigned User (closer); has `FollowUp[]` (legacy 7-step, created but not shown),
`FollowUpLog[]` (the live follow-up tracker), `Note[]`, `ActivityLog[]`. Key
fields: `segment` (APPLICATION | SCHOLARSHIP | IMPORTED | …), `amountPaid`/
`balanceLeft` (kept but **never shown to users**), `lastAssignedAt` on User.
Track list seeded from `prisma/tracks.data.ts` (import from there, **not**
`prisma/seed.ts`, which self-executes).

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
- Env vars in Vercel: `DATABASE_URL`, `DIRECT_URL` (session pooler), `AUTH_SECRET`
  + `NEXTAUTH_SECRET`, `INGEST_SHARED_SECRET`, `AUTH_TRUST_HOST=true`,
  `NEXTAUTH_URL`/`APP_URL` = the live URL, `GOOGLE_CLIENT_ID/SECRET`. **Do NOT set
  `E2E_TEST_MODE`** in prod.

## Email (Resend) — currently dormant

`src/lib/email.ts` sends the "lead assigned" notification via Resend, but only if
`RESEND_API_KEY` is set (it isn't yet → silently skipped). Sending requires a
**verified domain** (planned: subdomain `mail.jobmingle.co`; can't use gmail.com
or vercel.app). The root domain is also used by Kit — a Resend subdomain won't
conflict. Bulk/personalized email-by-segment is **not built yet**.

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
