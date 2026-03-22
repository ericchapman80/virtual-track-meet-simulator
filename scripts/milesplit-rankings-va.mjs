import {
  dismissConsent,
  ensureAuthenticated,
  launchMilesplitBrowser,
  newMilesplitContext,
  saveStorageState,
} from "./lib/milesplit.mjs";

const headed = process.argv.includes("--headed");
const useSystemBrowser = process.argv.includes("--use-system-browser");

async function selectByLabel(page, labels, value, waitFor = null) {
  for (const label of labels) {
    const select = page.getByLabel(label, { exact: false }).first();
    if (await select.isVisible().catch(() => false)) {
      await Promise.all([
        waitFor ? waitFor() : Promise.resolve(),
        select.selectOption(value),
      ]);
      return label;
    }
  }

  return null;
}

async function selectByLocator(page, selectors, value, waitFor = null) {
  for (const selector of selectors) {
    const select = page.locator(selector).first();
    if (await select.isVisible().catch(() => false)) {
      await Promise.all([
        waitFor ? waitFor() : Promise.resolve(),
        select.selectOption(value),
      ]);
      return selector;
    }
  }

  return null;
}

async function main() {
  const { browser } = await launchMilesplitBrowser({ headed, useSystemBrowser });
  const { context, page } = await newMilesplitContext(browser);

  const session = await ensureAuthenticated(page, { headed, useSystemBrowser });
  console.log("\n=== Session ===");
  console.log(JSON.stringify(session, null, 2));

  await page.goto("https://www.milesplit.com/rankings/leaders", { waitUntil: "domcontentloaded" });
  await dismissConsent(page);

  const stateChangedByLabel = await selectByLabel(
    page,
    ["States", "State", "Select State"],
    { value: "VA" },
    () => page.waitForURL(/va\.milesplit\.com/, { timeout: 20000 }),
  );

  if (!stateChangedByLabel) {
    const stateChangedByLocator = await selectByLocator(
      page,
      ['select[name="state"]', 'select[id*="state"]', "select"],
      { value: "VA" },
      () => page.waitForURL(/va\.milesplit\.com/, { timeout: 20000 }),
    );

    if (!stateChangedByLocator) {
      throw new Error("Could not find the rankings state selector.");
    }
  }

  await page.waitForLoadState("domcontentloaded");
  await dismissConsent(page);

  const waitForReload = () =>
    Promise.allSettled([
      page.waitForLoadState("domcontentloaded", { timeout: 10000 }),
      page.waitForLoadState("networkidle", { timeout: 10000 }),
    ]);

  await selectByLabel(page, ["Level"], { value: "high-school-girls" }, waitForReload);
  await selectByLabel(page, ["Season"], { value: "outdoor-track-and-field" }, waitForReload);
  await selectByLabel(page, ["Year"], { value: "2026" }, waitForReload);
  await selectByLabel(page, ["FAT"], { value: "all" }, waitForReload);
  await selectByLabel(page, ["League"], { value: "3844" }, waitForReload);

  await page.waitForLoadState("networkidle").catch(() => undefined);
  await dismissConsent(page);

  const summary = await page.evaluate(() => {
    const getSelectValue = (fragments) => {
      for (const fragment of fragments) {
        const byName = document.querySelector(`select[name*="${fragment}" i]`);
        const byId = document.querySelector(`select[id*="${fragment}" i]`);
        const select = byName || byId;
        if (select) {
          const selectedOption = select.selectedOptions?.[0];
          return {
            name: select.getAttribute("name") || select.getAttribute("id") || fragment,
            value: select.value,
            label: selectedOption?.textContent?.replace(/\s+/g, " ").trim() || "",
          };
        }
      }
      return null;
    };

    return {
      url: window.location.href,
      title: document.title,
      state: getSelectValue(["state"]),
      level: getSelectValue(["level"]),
      season: getSelectValue(["season"]),
      year: getSelectValue(["year"]),
      grade: getSelectValue(["grade"]),
      fat: getSelectValue(["fat"]),
      league: getSelectValue(["league"]),
    };
  });

  console.log("\n=== Rankings Summary ===");
  console.log(JSON.stringify(summary, null, 2));

  await saveStorageState(context);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
