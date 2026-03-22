import {
  BASE_URL,
  dismissConsent,
  ensureAuthenticated,
  launchMilesplitBrowser,
  logStructure,
  newMilesplitContext,
} from "./lib/milesplit.mjs";

const headed = process.argv.includes("--headed");
const loginOnly = process.argv.includes("--login");
const useSystemBrowser = process.argv.includes("--use-system-browser");

async function main() {
  const { browser, config } = await launchMilesplitBrowser({ headed, useSystemBrowser });
  const { page } = await newMilesplitContext(browser);

  console.log(
    `Starting MileSplit run. Username configured: ${Boolean(config.username)}. Password configured: ${Boolean(config.password)}. Using system browser: ${config.useSystemBrowser}. Browser path configured: ${config.browserPathAvailable}.`,
  );

  if (loginOnly) {
    const result = await ensureAuthenticated(page, { headed, useSystemBrowser });
    console.log("\n=== Login Result ===");
    console.log(JSON.stringify(result, null, 2));
    await browser.close();
    process.exitCode = result.authed ? 0 : 1;
    return;
  }

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  const homepageSnapshot = await logStructure(page, "Homepage");
  const homepageLinks = new Map(
    homepageSnapshot.links.map((link) => [link.text.toLowerCase(), link.href]),
  );

  for (const label of ["Results", "Calendar", "Athletes"]) {
    const href = homepageLinks.get(label.toLowerCase());
    if (!href) {
      continue;
    }
    await page.goto(href, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    await logStructure(page, `After navigating to ${label}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
