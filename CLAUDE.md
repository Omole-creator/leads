# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

JobMingle Cohort Lead Tracking System. Course-enquiry leads are emailed to
`jobminglengr@gmail.com`; the system ingests them, auto-assigns each to a sales
rep by round-robin, tracks them through a pipeline, and shows a bar-chart
Overview dashboard. Built from a fixed Technical Spec v1.0; deviations from that
spec are recorded in `~/.claude/plans/here-s-the-spec-golden-octopus.md`.

## Commands

```bash
npm run dev              # Next dev server
npm run build            # production build (also regenerates .next/types)
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # next lint

npm run test:unit        # Vitest, pure logic — no DB, runs anywhere
npm run test:integration # Vitest, hits a real Postgres (see below)
npm run test:e2e         # Playwright, builds + serves the app, real browser

npm run db:seed          # tracks + April 30th cohort + admin + 3 reps (idempotent upserts)
npx tsx prisma/demo.ts   # wipe leads and create 24 demo leads for the dashboard
```

Run a single unit/integration test: `npx vitest run tests/unit/metrics.test.ts`
or filter by name: `npx vitest run -t "close rate"`.
Run a single e2e spec: `npx playwright test tests/e2e/login.spec.ts`.

Most DB/server commands need env vars; the local file is `.env.local` (gitignored).
Source it for one-off commands: `set -a && . ./.env.local && set +a && <cmd>`.

## Environment & database (Supabase)

Uses Supabase Postgres. Prisma needs **two** URLs (`prisma/schema.prisma`
datasource): `DATABASE_URL` (runtime) and `DIRECT_URL` (migrations).
Use the Supabase **session pooler** host (`...pooler.supabase.com:5432`) for
local dev/tests — it's IPv4 and supports interactive transactions, which
`ingestLead` relies on. The transaction pooler (`:6543`) is for serverless
production only and breaks interactive transactions. The direct `db.<ref>...`
host is often IPv6-only and unreachable from many networks.

Migrations are committed as SQL under `prisma/migrations/`; apply with
`npx prisma migrate deploy`. Do **not** run `prisma migrate reset` against the
shared Supabase project — it wipes data and is blocked by the sandbox.

## Architecture

Next.js 15 App Router, TS strict, Prisma 5, NextAuth v5 (Google), Tailwind +
shadcn-style UI, Recharts, Resend, Zod.

**Service layer is the source of truth, not the routes.** Business logic lives in
`src/lib/*` and is called by both API routes and Server Components:
- `src/lib/ingest.ts` — `ingestLead()`: the heart of the system. Parses track
  name out of "Interested Skill", find-or-creates the cohort from "Start
  Timeline", round-robin assigns, creates the lead + 7 follow-ups + activity log,
  notifies the rep. Runs in a transaction so concurrent ingests don't double-assign.
- `src/lib/round-robin.ts` — `pickNextRep()`: pure, least-recently-assigned over
  `User.lastAssignedAt`.
- `src/lib/leads.ts` — list/detail queries + mutations (stage, follow-ups, notes,
  reassign). `leadWhere()` scopes reps to their own leads; admins see all.
- `src/lib/metrics.ts` (pure calculators) + `src/lib/metrics-service.ts`
  (`computeDashboardMetrics()` aggregates leads into chart series).
- `src/lib/permissions.ts` — `canAccessLead` / `canManage` role checks.

**Auth** (`src/lib/auth.ts` + `auth.config.ts`, split for edge-safety): Google
OAuth restricted to active users that already exist in the DB. JWT sessions carry
`{id, role}` (see `src/types/next-auth.d.ts`). `middleware.ts` redirects
unauthenticated users to `/login`; **role checks happen in pages/routes, not
middleware**. API routes use `requireUser`/`requireAdmin` from `src/lib/api.ts`.

**Ingestion has two paths**, both hitting `POST /api/leads/ingest` with header
`x-ingest-secret`: direct API, and the Gmail bridge (`apps-script/gmail-bridge.gs`,
a Google Apps Script that parses the lead email and forwards it).

**Data model** (`prisma/schema.prisma`): Lead belongs to Track, Cohort, and an
optional assigned User (rep); has FollowUp[], Note[], ActivityLog[]. The track
list + prices are seeded from `prisma/tracks.data.ts` (imported by both seed and
tests — never import from `prisma/seed.ts`, which self-executes).

## Hard constraints (don't regress these)

- **No money in the UI.** Reps must not see payments/revenue. The dashboard,
  leads list, and lead detail show only counts and rates (Total/Open/Closed
  Won/Closed Lost/Close Rate; conversion %; leaderboards by deal count). Track
  cost stays only on the admin-only Tracks page. `Lead.amountPaid/balanceLeft`
  still exist in the DB/ingest result but must not be surfaced to users.
- **Track matched by name only.** Lead emails send `"Cybersecurity - ₦470,000"`;
  `parseTrackName()` strips the ` - ₦...` suffix and matches `Track.name`
  case-insensitively. The seeded price is authoritative; the email price is ignored.

## Recharts gotchas (cost real debugging time)

- Axes must be **direct children** of `BarChart`. Recharts v2 does not read axis
  props through a React Fragment, so a `horizontal ? <>…</> : <>…</>` ternary
  silently drops the category axis (bars collapse to one, no labels). Use a single
  `<XAxis>`/`<YAxis>` with conditional **props** instead — see
  `src/components/charts/BarChartCard.tsx`.
- Server Components cannot pass **functions** to Client Components. Pass a string
  `format="naira"|"percent"|"number"` to `BarChartCard`, not a formatter function.
- Wrap charts in a fixed-height div with `ResponsiveContainer width/height="100%"`
  and set `isAnimationActive={false}` (deterministic for screenshots/SSR).

## Testing notes

- Integration tests share one database and **truncate all tables** in `beforeEach`
  (`tests/integration/helpers.ts`) — running them wipes seeded/demo data. Re-seed
  afterward. They run sequentially (`fileParallelism: false`) with raised timeouts
  because queries round-trip to remote Supabase; they skip cleanly if no DB URL.
- E2E uses a **test-only credentials provider** enabled with `E2E_TEST_MODE=true`
  (registered in `auth.ts`, never in prod). `tests/e2e/global-setup.ts` logs in as
  admin + rep and saves storage states. The same flag reveals dev sign-in buttons
  on `/login`. When serving for e2e/preview, set `PORT`, matching `NEXTAUTH_URL`,
  and `AUTH_TRUST_HOST=true`.
