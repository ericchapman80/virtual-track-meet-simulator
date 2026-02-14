# Virtual Track Meet Simulator

A Next.js + TypeScript starter for running Monte Carlo simulations for track meets.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (recommended free tier: Neon)

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env
```

3. Configure `DEV_NEON_DB_DATABASE_URL` in `.env` (matching Vercel's Neon integration variable name).

4. Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

5. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How this supports your workflow

### 1) Pre-meet planning mode
- Use historical performances as `seedTime` with athlete-specific `stdDev`.
- Run thousands of simulations to estimate win %, podium %, and expected placement.

### 2) Live meet day mode
- As official marks/times come in, add `actualTime` to completed athletes in the JSON payload.
- Athletes with `actualTime` are treated as fixed/locked outcomes while remaining athletes continue to be simulated.
- Re-run simulations after each result upload to update projected outcomes as the meet progresses.

## Initial features

- Domain models for teams, athletes, events, performances, meets, entries, and simulation runs
- Monte Carlo simulation utility for sprint events (time-based)
- API endpoint for simulations: `POST /api/simulate`
- Basic UI to paste athlete entries and run simulations

## MileStat import notes

Before importing data from third-party providers, verify terms of service and robots policy. Prefer official data exports or API access when possible.


## Known project deployment values

- Vercel project name: `virtual-track-meet-simulator`
- Vercel production URL: `https://virtual-track-meet-simulator.vercel.app`
- Health check URL: `https://virtual-track-meet-simulator.vercel.app/api/health`

## Deploy readiness

- `postinstall` runs `prisma generate` automatically for local/CI/Vercel installs.
- Use `npm run db:migrate:deploy` in production.
- Health endpoint is available at `GET /api/health`.
- Follow full infra steps in `INFRA_SETUP.md`.

## CI and branch gating

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint + tests + coverage on PRs.
Set branch protection to require:
1. `CI` workflow success
2. Vercel Preview deployment success

This gives you a pre-merge quality gate before changes hit `main`.


## Troubleshooting Vercel build failures

If a Vercel deployment fails, check these first:

1. **Environment variables**: `DATABASE_URL` must be set in Vercel project settings.
2. **Node version**: the project expects Node 20+ (`package.json` `engines.node`).
3. **Prisma generation**: `postinstall` runs `prisma generate`; if this fails, verify install logs and lockfile state.
4. **Type checking scope**: test files are excluded from Next.js type checking to avoid build-time failures from test-only dependencies.

Recommended branch protection gates:
- GitHub Action `CI`
- Vercel Preview deployment
