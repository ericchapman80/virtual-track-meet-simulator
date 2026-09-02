import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

type Row = {
  rank?: number;
  athleteName?: string;
  athleteUrl?: string;
  school?: string;
  grade?: string;
  event?: string;
  mark?: string;
  meet?: string;
  resultDate?: string;
  season?: string;
  sourceUrl: string;
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(page: Page): Promise<void> {
  const loginUrl = required("SITE_LOGIN_URL");
  const email = required("SITE_EMAIL");
  const password = required("SITE_PASSWORD");

  // Replace selectors for your target site.
  const emailSelector = process.env.SITE_EMAIL_SELECTOR ?? 'input[type="email"]';
  const passwordSelector = process.env.SITE_PASSWORD_SELECTOR ?? 'input[type="password"]';
  const submitSelector = process.env.SITE_SUBMIT_SELECTOR ?? 'button[type="submit"]';

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.fill(emailSelector, email);
  await page.fill(passwordSelector, password);
  await page.click(submitSelector);
  await page.waitForLoadState("networkidle");
}

async function extractRankingsRows(page: Page): Promise<Row[]> {
  const rowSelector = process.env.RANKINGS_ROW_SELECTOR ?? "table tbody tr";
  const rows = await page.locator(rowSelector).all();
  const output: Row[] = [];

  for (const row of rows) {
    const rankText = (await row.locator("td:nth-child(1)").textContent())?.trim();
    const mark = (await row.locator("td:nth-child(2)").textContent())?.trim() ?? "";

    const athleteAnchor = row.locator("td:nth-child(3) a").first();
    const athleteName = ((await athleteAnchor.textContent()) ?? "").trim();
    const athleteUrl = (await athleteAnchor.getAttribute("href")) ?? undefined;
    const school = (await row.locator("td:nth-child(3)").textContent())?.trim();
    const grade = (await row.locator("td:nth-child(4)").textContent())?.trim();
    const meet = (await row.locator("td:nth-child(5)").textContent())?.trim();

    output.push({
      rank: rankText ? Number(rankText) : undefined,
      athleteName,
      athleteUrl,
      school,
      grade,
      event: process.env.EVENT_NAME,
      mark,
      meet,
      season: process.env.SEASON,
      sourceUrl: page.url()
    });
  }

  return output;
}

async function extractProfileSeasonResults(page: Page, athleteUrl: string): Promise<Row[]> {
  const selector = process.env.PROFILE_RESULTS_ROW_SELECTOR ?? "table tbody tr";
  await page.goto(athleteUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  const rows = await page.locator(selector).all();
  const out: Row[] = [];

  for (const row of rows) {
    const event = (await row.locator("td:nth-child(1)").textContent())?.trim() ?? "";
    const mark = (await row.locator("td:nth-child(2)").textContent())?.trim() ?? "";
    const resultDate = (await row.locator("td:nth-child(3)").textContent())?.trim() ?? "";
    const meet = (await row.locator("td:nth-child(4)").textContent())?.trim() ?? "";

    if (!event || !mark) continue;

    out.push({
      event,
      mark,
      meet,
      resultDate,
      season: process.env.SEASON,
      sourceUrl: page.url()
    });
  }

  return out;
}

async function crawlRankingsAndProfiles(context: BrowserContext): Promise<Row[]> {
  const page = await context.newPage();
  const startUrl = required("SITE_RANKINGS_URL");
  const maxAthletes = Number(process.env.TOP_N ?? "30");
  const minDelayMs = Number(process.env.MIN_DELAY_MS ?? "900");

  await login(page);
  await page.goto(startUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  const rankings = await extractRankingsRows(page);
  const top = rankings.slice(0, maxAthletes);

  const withProfile: Row[] = [...top];
  for (const athlete of top) {
    if (!athlete.athleteUrl) continue;

    const absoluteUrl = new URL(athlete.athleteUrl, page.url()).toString();
    await delay(minDelayMs);
    const results = await extractProfileSeasonResults(page, absoluteUrl);
    for (const r of results) {
      withProfile.push({ ...r, athleteName: athlete.athleteName, athleteUrl: absoluteUrl });
    }
  }

  return withProfile;
}

function writeOutput(rows: Row[]): void {
  const outDir = path.resolve(process.cwd(), "output/playwright");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, "authorized_site_results.json");
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  console.log(`Wrote ${rows.length} rows -> ${file}`);
}

async function main(): Promise<void> {
  const ack = process.env.AUTHORIZED_AUTOMATION_ACK;
  if (ack !== "I_AM_AUTHORIZED") {
    throw new Error("Set AUTHORIZED_AUTOMATION_ACK=I_AM_AUTHORIZED before running.");
  }

  const browser = await chromium.launch({ headless: process.env.HEADLESS === "1" });
  const context = await browser.newContext();

  try {
    const rows = await crawlRankingsAndProfiles(context);
    writeOutput(rows);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
