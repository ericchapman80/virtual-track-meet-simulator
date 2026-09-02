# Generic Authorized Site Collector (Playwright)

This is a generic template for sites you are authorized to automate.

## Install runtime dependency

```bash
npm install -D playwright
npx playwright install chromium
```

## Required env vars

```bash
export AUTHORIZED_AUTOMATION_ACK=I_AM_AUTHORIZED
export SITE_LOGIN_URL='https://example.com/login'
export SITE_RANKINGS_URL='https://example.com/rankings'
export SITE_EMAIL='you@example.com'
export SITE_PASSWORD='your-password'
```

## Optional env vars

```bash
export TOP_N=30
export SEASON=2026
export EVENT_NAME='300m'
export MIN_DELAY_MS=900
export HEADLESS=0

# Override selectors if needed
export SITE_EMAIL_SELECTOR='input[type="email"]'
export SITE_PASSWORD_SELECTOR='input[type="password"]'
export SITE_SUBMIT_SELECTOR='button[type="submit"]'
export RANKINGS_ROW_SELECTOR='table tbody tr'
export PROFILE_RESULTS_ROW_SELECTOR='table tbody tr'
```

## Run

```bash
npm run collect:authorized-template
```

Output file:
- `output/playwright/authorized_site_results.json`
