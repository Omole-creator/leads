# JobMingle Cohort Lead Tracking System

Ingests course-enquiry leads emailed to `jobminglengr@gmail.com`, auto-assigns
each to a sales rep by round-robin, tracks them through a pipeline, and surfaces
a bar-chart **Overview** dashboard for the sales team.

Built per Technical Spec v1.0. Stack: **Next.js 15** (App Router, TS strict),
**Prisma 5 + Neon PostgreSQL**, **NextAuth v5** (Google), **Tailwind + shadcn-style
UI**, **Recharts**, **Resend**, **Vitest** + **Playwright**.

## Lead fields captured

Only six fields are taken from the form email: **Full Name, Email,
Phone/WhatsApp, Interested Skill (track), Start Timeline (cohort), How Did You
Hear**. The form has no payment field, so every lead starts at
`amountPaid = 0`, `balanceLeft = track cost`; reps record payments later on the
lead page. The track is matched by name (the `- ₦price` suffix in the email is
ignored — the seeded price is authoritative).

## Tracks (seeded)

| Track | Cost (₦) | | Track | Cost (₦) |
|---|---|---|---|---|
| AI Engineering | 350,000 | | Content Creation | 150,000 |
| Cybersecurity | 350,000 | | Product Design | 150,000 |
| Data Analysis | 150,000 | | Product Management | 150,000 |
| AI and Automation | 150,000 | | Frontend/Backend/Fullstack | 150,000 |
| Data Science | 150,000 | | Cloud/DevOps Engineering | 150,000 |

## Local setup

```bash
npm install
cp .env.example .env.local      # fill DATABASE_URL, AUTH_SECRET, Google creds, etc.
npx prisma migrate deploy       # or: npm run db:migrate
npm run db:seed                 # tracks + sample cohort + admin/reps
npm run dev
```

Sign-in is Google OAuth restricted to **active users that already exist in the
DB** (seed or add via the admin UI). Seeded admin: `admin@jobmingle.com`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (next) |
| `npm run test:unit` | Vitest pure-logic unit tests |
| `npm run test:integration` | Vitest DB-backed tests (needs `DATABASE_URL_TEST`) |
| `npm run test:e2e` | Playwright (see below) |
| `npm run db:seed` / `db:migrate` / `db:reset` | Prisma helpers |

## Testing

- **Unit** (`tests/unit`): round-robin, metrics, schemas — run anywhere, no DB.
- **Integration** (`tests/integration`): exercise `ingestLead`, stage
  transitions, permissions against a real Postgres. Set `DATABASE_URL_TEST`
  (Neon test branch) — they **skip cleanly** when no DB URL is present.
- **E2E** (`tests/e2e`): Playwright builds and serves the app, then logs in via a
  **test-only credentials provider** enabled with `E2E_TEST_MODE=true` (never in
  production). `global-setup.ts` saves admin/rep sessions; specs cover login
  redirect, ingest→assign, dashboard visual smoke (logo top-left, charts, 375px
  mobile), admin rep creation, and rep permission boundaries.

## Email ingestion (two paths)

1. **Direct API** — `POST /api/leads/ingest` with header
   `x-ingest-secret: <INGEST_SHARED_SECRET>` and the 6-field JSON body.
2. **Gmail bridge** — `apps-script/gmail-bridge.gs`. In script.google.com set
   Script Properties `INGEST_URL` + `INGEST_SECRET`, confirm the subject in
   `LEAD_QUERY`, and add a 5-minute time trigger for `processLeadEmails`.

## Deploy (zero-cost target)

- **Database (Supabase or Neon)**: set `DATABASE_URL` (pooled, port 6543),
  `DIRECT_URL` (direct, port 5432, used by migrations), and `DATABASE_URL_TEST`.
  To reuse an existing Supabase project, append `&schema=jobmingle` to isolate
  these tables from other apps.
- **Vercel**: import the repo, set all env vars from `.env.example`, build runs
  `next build`. Run `npx prisma migrate deploy` against Neon main on release.
- **Google OAuth**: add the Vercel domain to authorized redirect URIs
  (`/api/auth/callback/google`).
- **Resend**: verify the sending domain, set `RESEND_API_KEY` +
  `RESEND_FROM_EMAIL`.
- **CI**: `.github/workflows/ci.yml` runs lint, typecheck, unit, integration and
  e2e against a Postgres service on every push/PR.
