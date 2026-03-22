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
- API endpoint for parameterized MileSplit rankings export: `GET /api/milesplit/rankings`
- Convenience API endpoint for the Virginia Class 3 example: `GET /api/milesplit/rankings/va`
- API endpoint for top-10 event tables from a MileSplit leaders page: `POST /api/milesplit/rankings/top10`
- API endpoint to ingest stored rankings snapshots: `POST /api/milesplit/rankings/snapshots/ingest`
- API endpoint for daily batch ingestion jobs: `POST /api/milesplit/rankings/snapshots/daily`
- API endpoint to read the latest stored athlete watch matches: `GET /api/milesplit/rankings/watch/latest`
- API endpoint for seeding a time-based event from MileSplit athlete history: `POST /api/simulate/event/from-history`
- Basic UI to paste athlete entries and run simulations

## MileStat import notes

Before importing data from third-party providers, verify terms of service and robots policy. Prefer official data exports or API access when possible.

## MileSplit automation and export

This repo now includes a Playwright-based MileSplit workflow that:
- logs in with credentials from `.env`
- reuses saved session state between runs
- navigates to Virginia rankings filters
- exports the filtered rankings list as structured JSON or Markdown
- serves the Virginia rankings export through a local API route

### Required env vars

Add these to `.env`:

```bash
MILESPLIT_USERNAME="your-email@example.com"
MILESPLIT_PASSWORD="your-password"
MILESPLIT_BROWSER_PATH=""
```

Notes:
- Leave `MILESPLIT_BROWSER_PATH=""` to use Playwright-managed Chromium by default.
- Session state is saved locally at `tmp/playwright/milesplit-storage-state.json`.
- Use the in-app `My Athletes` section to store exact MileSplit profile URLs for Riley, Karter, and other team members. The history simulator checks that database-backed directory before doing a live MileSplit search.

### Install browser

```bash
npm run playwright:install
```

### Local helper scripts

```bash
npm run milesplit:login
npm run milesplit:rankings:va
npm run milesplit:export:va-rankings
```

What they do:
- `milesplit:login`: verifies MileSplit authentication and refreshes local session state
- `milesplit:rankings:va`: opens the confirmed Virginia rankings filter set
- `milesplit:export:va-rankings`: writes export files to `tmp/playwright/`

Generated export files:
- `tmp/playwright/va-rankings-hs-girls-outdoor-2026-vhsl-class-3.json`
- `tmp/playwright/va-rankings-hs-girls-outdoor-2026-vhsl-class-3.md`

### Local API

Run the dev server:

```bash
npm run dev
```

Then request the parameterized rankings export API:

```bash
curl "http://localhost:3000/api/milesplit/rankings?state=VA&level=high-school-girls&season=outdoor-track-and-field&year=2026&accuracy=all&league=3844"
```

Friendly aliases also work:

```bash
curl "http://localhost:3000/api/milesplit/rankings?state=Virginia&level=hs-girls&season=outdoor&year=2026&accuracy=all&league=VHSL%20Class%203"
```

Expected behavior:
- the route runs in the Node runtime
- it uses Playwright server-side
- it authenticates with MileSplit if needed
- it returns JSON for the filtered rankings page derived from your query params

Required query params:
- `state`
- `level`
- `season`

Optional query params:
- `year`
- `accuracy`
- `grade`
- `league`

Accepted friendly aliases:
- `state=Virginia` -> `VA`
- `level=hs-girls` -> `high-school-girls`
- `season=outdoor` -> `outdoor-track-and-field`
- `grade=all` -> empty grade filter
- `league=VHSL Class 3` -> `3844`

Example shortcut endpoint for the confirmed Virginia page:

```bash
curl http://localhost:3000/api/milesplit/rankings/va
```

Response shape:

```json
{
  "url": "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
  "title": "Virginia High School Girls Rankings | Outdoor Track And Field 2026 Leaders",
  "exportedAt": "2026-03-21T22:59:05.012Z",
  "totalRows": 13,
  "filters": {
    "state": "VA",
    "level": "high-school-girls",
    "season": "outdoor-track-and-field",
    "year": "2026",
    "accuracy": "all",
    "league": "3844"
  },
  "sections": [
    {
      "section": "Track",
      "rows": [
        {
          "event": "100m",
          "mark": "12.37",
          "athlete": "Kaelen Tucker",
          "team": "Brookville High School",
          "grade": "2026",
          "meet": "Campbell County Invitational",
          "date": "Mar 18, 2026",
          "place": "1st F"
        }
      ]
    }
  ]
}
```

### Top 10 by event

The leaders endpoint above returns the single leader row shown on the leaders page for each event. To walk each event page and return the top 10 performers, use:

```bash
curl -X POST "http://localhost:3000/api/milesplit/rankings/top10" \
  -H "Content-Type: application/json" \
  -d '{
    "queryUrl": "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
    "trackedAthletes": ["Riley Chapman", "Karter Chapman"],
    "limit": 10
  }'
```

This returns:
- one event group per event page
- up to 10 rows per event
- tracked athlete matches highlighted in the UI

For faster local testing, you can temporarily limit the number of events scanned:

```bash
curl -X POST "http://localhost:3000/api/milesplit/rankings/top10" \
  -H "Content-Type: application/json" \
  -d '{
    "queryUrl": "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
    "trackedAthletes": ["Riley Chapman", "Karter Chapman"],
    "limit": 10,
    "eventLimit": 3
  }'
```

### Stored rankings snapshots

The app can now persist rankings snapshots into Prisma so a daily job can ingest full outdoor or indoor rankings once and the UI can read Riley/Karter matches from the database.

Single-query ingest:

```bash
curl -X POST "http://localhost:3000/api/milesplit/rankings/snapshots/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Riley HS Girls Outdoor State",
    "queryUrl": "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
    "trackedAthletes": ["Riley Chapman"],
    "limit": 10,
    "eventLimit": 3
  }'
```

Cron-friendly daily batch ingest:

```bash
curl -X POST "http://localhost:3000/api/milesplit/rankings/snapshots/daily" \
  -H "Content-Type: application/json" \
  -d '{
    "jobs": [
      {
        "label": "Riley HS Girls Outdoor State",
        "queryUrl": "https://va.milesplit.com/rankings/leaders/high-school-girls/outdoor-track-and-field?year=2026&accuracy=all&league=3844",
        "trackedAthletes": ["Riley Chapman"],
        "limit": 10,
        "eventLimit": 3
      },
      {
        "label": "Riley HS Girls Indoor Region",
        "queryUrl": "https://va.milesplit.com/rankings/leaders/high-school-girls/indoor-track-and-field?year=2026&league=6461",
        "trackedAthletes": ["Riley Chapman"],
        "limit": 10,
        "eventLimit": 3
      },
      {
        "label": "Karter MS Boys Outdoor State",
        "queryUrl": "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026&accuracy=fat&league=3844",
        "trackedAthletes": ["Karter Chapman"],
        "limit": 10,
        "eventLimit": 3
      },
      {
        "label": "Karter MS Boys Outdoor Region",
        "queryUrl": "https://va.milesplit.com/rankings/leaders/middle-school-boys/outdoor-track-and-field?year=2026&accuracy=fat&league=6461",
        "trackedAthletes": ["Karter Chapman"],
        "limit": 10,
        "eventLimit": 3
      }
    ]
  }'
```

Read the latest stored watch view:

```bash
curl "http://localhost:3000/api/milesplit/rankings/watch/latest?athletes=Riley%20Chapman&state=VA&level=high-school-girls&season=outdoor-track-and-field"
```

### Event simulator from pasted athletes

For time-based events, you can paste athlete names, resolve their MileSplit profiles, pull recent history, derive seeds, and run Monte Carlo in one request:

```bash
curl -X POST "http://localhost:3000/api/simulate/event/from-history" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "100m",
    "searchState": "VA",
    "season": "outdoor",
    "iterations": 5000,
    "historyLimit": 5,
    "participantText": "Riley Chapman\nKarter Chapman"
  }'
```

Current constraints:
- time-based events only
- at least two athletes are required
- each athlete needs enough recent event history to derive a seed
- line format supports either `Athlete Name` or `Athlete Name | Team Hint`

### How to test locally

1. Install dependencies:
   `npm install`
2. Install Chromium for Playwright:
   `npm run playwright:install`
3. Add MileSplit credentials to `.env`
4. Start Next:
   `npm run dev`
5. In another terminal, hit the parameterized API:
   `curl "http://localhost:3000/api/milesplit/rankings?state=VA&level=high-school-girls&season=outdoor-track-and-field&year=2026&accuracy=all&league=3844"`
6. Optionally verify the shortcut route:
   `curl http://localhost:3000/api/milesplit/rankings/va`
7. Optionally verify the direct exporter:
   `npm run milesplit:export:va-rankings`
8. Run Prisma migration after updating the schema:
   `npm run db:migrate`
9. Run unit tests for the route layer:
   `npm test`

### Built-in API tester

This app now includes a browser-based API tester at:

```bash
http://localhost:3000/api-tools
```

Use it when you want a lightweight Postman-style local tool without installing anything else. It supports:
- `GET` and `POST`
- relative local paths like `/api/health`
- JSON request bodies
- quick presets for MileSplit top 10, MileSplit leaders, health, direct simulation, and history-based event simulation

Recommended local test flow:
1. Start Next with `npm run dev`
2. Open `http://localhost:3000/api-tools`
3. Click `Load rankings top 10 example`
4. Click `Send request`
5. Confirm the response contains `eventGroups` with up to 10 rows per event
6. Click `Load daily ingest example`
7. Click `Send request`
8. Confirm the response contains snapshot ids and job counts
9. Click `Load latest watch example`
10. Click `Send request`
11. Confirm the response contains stored `snapshot` metadata and athlete `matches`
12. Click `Load history simulate example`
13. Click `Send request`
14. Confirm the response contains `entrants`, `skippedParticipants`, and `results`

### Correct curl usage in zsh

Your shell error happened because `curl` and the URL were entered on separate lines. Use one command on one line:

```bash
curl "http://localhost:3000/api/milesplit/rankings?state=Virginia&level=hs-girls&season=outdoor&year=2026&accuracy=all&league=VHSL%20Class%203"
```

Or with line continuations:

```bash
curl \
  "http://localhost:3000/api/milesplit/rankings?state=Virginia&level=hs-girls&season=outdoor&year=2026&accuracy=all&league=VHSL%20Class%203"
```


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
