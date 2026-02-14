# Infrastructure Setup (Free Tier)

This guide gets you from zero infra to a working Vercel + Neon Postgres deployment.

## 1) Create a free Neon database

1. Create/sign in at Neon.
2. Create a new project named `virtual-track-meet-simulator`.
3. Copy the connection string from Neon dashboard.
4. Ensure SSL is enabled (`?sslmode=require`).

Example:

```text
postgresql://USER:PASSWORD@HOST:5432/virtual_track_meet?sslmode=require
```

## 2) Configure local environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env`.

## 3) Initialize Prisma schema in DB

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 4) Connect project to Vercel

1. Import your GitHub repo in Vercel.
2. In Vercel Project Settings > Environment Variables, add:
   - `DATABASE_URL` (same Neon connection string)
3. Redeploy project after adding env vars.

## 5) Production-safe migration command

Use deploy migrations in production:

```bash
npm run db:migrate:deploy
```

## 6) Health check endpoint

After deploy:

```text
https://virtual-track-meet-simulator.vercel.app/api/health
```

Expected response:

```json
{"ok":true,"service":"virtual-track-meet-simulator"}
```

## 7) CI + Vercel preview gating recommendation

Use this merge policy:
- Require GitHub Action `CI` to pass (`lint`, `test:coverage`)
- Require Vercel Preview deployment check to pass
- Only then allow merge to `main`

### Info needed from your Vercel project to automate preview/deploy flows

- Vercel Project Name: `virtual-track-meet-simulator`
- Vercel Team/Org slug (or personal account slug)
- Production domain URL: `https://virtual-track-meet-simulator.vercel.app`
- (Optional for CLI-based deploys) `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

If GitHub is directly connected to Vercel, preview checks can be required in branch protection without extra deploy scripts.
