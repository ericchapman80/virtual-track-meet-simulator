# Ingest Scripts

## Hy-Tek style meet results (.txt)

This ingests text output like:

- `Girls 300 Meter Dash` header
- followed by result rows like: `1 Paku, Jamie 12 Garner 39.21 1`

### Dry run

```bash
npm run ingest:meet-txt -- --file path/to/results.txt --date 2026-01-17 --event-code 300M --event-name "Girls 300 Meter Dash" --dry-run
```

### Import

Requires `DEV_NEON_DB_DATABASE_URL` set.

```bash
npm run ingest:meet-txt -- --file path/to/results.txt --date 2026-01-17 --event-code 300M --event-name "Girls 300 Meter Dash" --source "hytek"
```

Notes:
- Marks are stored as seconds (float). Supports `SS.ss` and `M:SS.ss`.
- Athlete identity is currently `firstName + lastName + school`.
