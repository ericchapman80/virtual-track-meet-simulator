import {
  BASE_URL,
  collectAccountLinks,
  dismissConsent,
  ensureAuthenticated,
  launchMilesplitBrowser,
  logStructure,
  newMilesplitContext,
  saveStorageState,
} from "./lib/milesplit.mjs";

const headed = process.argv.includes("--headed");
const useSystemBrowser = process.argv.includes("--use-system-browser");

const preferredPaths = [
  "https://www.milesplit.com/profile",
  "https://www.milesplit.com/account",
  "https://www.milesplit.com/subscriptions",
];

async function main() {
  const { browser } = await launchMilesplitBrowser({ headed, useSystemBrowser });
  const { context, page } = await newMilesplitContext(browser);

  const session = await ensureAuthenticated(page, { headed, useSystemBrowser });
  console.log("\n=== Session ===");
  console.log(JSON.stringify(session, null, 2));

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  const homepage = await logStructure(page, "Authenticated Homepage");
  const accountLinks = await collectAccountLinks(page);

  let destination = accountLinks.find((link) => !/logout/i.test(link.href || link.text))?.href;
  if (!destination) {
    for (const path of preferredPaths) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" }).catch(() => null);
      if (response && response.status() < 400) {
        destination = path;
        break;
      }
    }
  }

  let accountSnapshot = null;
  if (destination) {
    await page.goto(destination, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    accountSnapshot = await logStructure(page, "Account Discovery Target");
  }

  await saveStorageState(context);
  await browser.close();

  console.log("\n=== Account Discovery ===");
  console.log(
    JSON.stringify(
      {
        accountLinks,
        destination,
        homepageUrl: homepage.url,
        accountSnapshotUrl: accountSnapshot?.url ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
