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
Set `DEV_NEON_DB_DATABASE_URL` in `.env`.

## 3) Initialize Prisma schema in DB

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 4) Connect project to Vercel

1. Import your GitHub repo in Vercel.
2. In Vercel Project Settings > Environment Variables, set `DEV_NEON_DB_DATABASE_URL` **per environment**.

Recommended assignments to avoid data clobbering:

- **Production**: `DEV_NEON_DB_DATABASE_URL` -> Neon **production branch/database** (real data).
- **Preview**: `DEV_NEON_DB_DATABASE_URL` -> separate Neon **preview branch/database** (safe throwaway/test data).
- **Development**: `DEV_NEON_DB_DATABASE_URL` -> local/dev Neon branch/database.

If Vercel asks whether to apply DB vars to Preview & Production during create/integration:

- **Do not point both to the same DB URL**.
- Check both only if each points to a different database/branch.
- If you currently have one DB URL only, assign it to **Development first**, then create separate Preview/Production DB targets.

3. Redeploy project after adding env vars.


## 4b) Prevent overwrites and data clobbering

Use these guardrails:

1. **Separate data planes by environment**
   - Never share one DB between Preview and Production.
   - Use Neon branching (or separate DBs/projects) so preview writes cannot touch prod.

2. **Run migrations safely**
   - In production, use `npm run db:migrate:deploy` only.
   - Do not run `prisma db push` against production.

3. **Seed only non-production environments**
   - Run `npm run db:seed` in development/preview only unless intentionally seeding prod baseline data.

4. **Protect production credentials**
   - Store prod `DEV_NEON_DB_DATABASE_URL` only in Vercel Production env vars.
   - Restrict who can edit Production env vars in Vercel project/team settings.

5. **Backups / restore**
   - Enable Neon backups/point-in-time restore for production before first live meet workflow.

## 4c) Exact Vercel Environment Variables values to paste (your current setup)

You said your Neon prefix is `DEV_NEON_DB` and you are wiring Development first.

In **Vercel -> Project -> Settings -> Environment Variables**, add this:

1. Click **Add New**.
2. **Name**: `DEV_NEON_DB_DATABASE_URL`
3. **Value**: paste the full value of your `DEV_NEON_DB_URL` connection string from Neon.
   - Example format:

```text
postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require
```

4. **Environment**: check **Development** only.
5. Save.

For now, leave Preview/Production unset until you create separate Neon branches/DB URLs.

When ready later, add these two more entries (same variable name, different env scopes):

- `DEV_NEON_DB_DATABASE_URL` (Preview) -> your preview Neon URL
- `DEV_NEON_DB_DATABASE_URL` (Production) -> your production Neon URL

Important: Vercel supports the same variable name with different environment scopes. Keep the name `DEV_NEON_DB_DATABASE_URL` for all three environments (or rename later with a planned migration).

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

## 8) Security guardrails for docs and commits

- Safe to document publicly: project name, production URL, health endpoint URL.
- Never commit secret values: `VERCEL_TOKEN`, database passwords, API keys, webhook secrets.
- Keep all secret values in Vercel Environment Variables and/or GitHub Actions Secrets.


## 9) Codex environment variable (for this workspace)

When running commands in this Codex environment, set:

```bash
export DEV_NEON_DB_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
```

Then Prisma commands (`db:generate`, `db:migrate`, `db:seed`) will use the same key as Vercel.
