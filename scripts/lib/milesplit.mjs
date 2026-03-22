import { chromium } from "@playwright/test";
import nextEnv from "@next/env";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

export const BASE_URL = "https://www.milesplit.com/";
export const OUTPUT_DIR = "tmp/playwright";
export const STORAGE_STATE_PATH = `${OUTPUT_DIR}/milesplit-storage-state.json`;

const configuredBrowserPath = process.env.MILESPLIT_BROWSER_PATH ?? "";
const fallbackBrowserPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function getMilesplitConfig(options = {}) {
  const useSystemBrowser = Boolean(options.useSystemBrowser);
  const browserPath = useSystemBrowser
    ? configuredBrowserPath || fallbackBrowserPath
    : configuredBrowserPath;

  return {
    headed: Boolean(options.headed),
    useSystemBrowser,
    browserPath,
    browserPathAvailable: Boolean(browserPath) && existsSync(browserPath),
    username: process.env.MILESPLIT_USERNAME ?? "",
    password: process.env.MILESPLIT_PASSWORD ?? "",
  };
}

export function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function launchMilesplitBrowser(options = {}) {
  const config = getMilesplitConfig(options);

  const browser = await chromium.launch({
    headless: !config.headed,
    executablePath: config.browserPathAvailable ? config.browserPath : undefined,
  });

  return { browser, config };
}

export async function newMilesplitContext(browser, options = {}) {
  const storageStatePath =
    options.storageStatePath === false ? undefined : options.storageStatePath || STORAGE_STATE_PATH;

  const contextOptions = {
    viewport: { width: 1440, height: 960 },
  };

  if (storageStatePath && existsSync(storageStatePath)) {
    contextOptions.storageState = storageStatePath;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  return { context, page };
}

export async function dismissConsent(page) {
  const labels = ["Accept", "Accept All", "I Agree", "AGREE", "Continue", "Close"];

  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      return;
    }
  }
}

export async function logStructure(page, label) {
  const snapshot = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 10);

    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((node) => ({
        text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
        href: node.href,
      }))
      .filter((link) => link.href && link.text)
      .slice(0, 25);

    const forms = Array.from(document.forms).map((form) => ({
      action: form.action || "",
      method: (form.method || "get").toLowerCase(),
      inputs: Array.from(form.elements)
        .map((element) => element.name || element.id || element.tagName.toLowerCase())
        .filter(Boolean)
        .slice(0, 20),
    }));

    return {
      url: window.location.href,
      title: document.title,
      headings,
      links,
      forms,
    };
  });

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(snapshot, null, 2));

  return snapshot;
}

export async function saveStorageState(context, storageStatePath = STORAGE_STATE_PATH) {
  ensureOutputDir();
  await context.storageState({ path: storageStatePath });
  return storageStatePath;
}

export async function isAuthenticated(page) {
  const indicators = [
    page.getByRole("link", { name: /logout|sign out|my account|account/i }).first(),
    page.getByRole("button", { name: /logout|sign out|my account|account/i }).first(),
    page.locator('a[href*="logout"], a[href*="account"], button[data-testid*="account"]').first(),
  ];

  for (const locator of indicators) {
    if (await locator.isVisible().catch(() => false)) {
      return true;
    }
  }

  if (!/login|signin|auth/i.test(page.url())) {
    const cookies = await page.context().cookies();
    if (cookies.some((cookie) => /session|auth|token|user/i.test(cookie.name))) {
      return true;
    }
  }

  return false;
}

function attachAuthLogging(page) {
  const events = [];
  const matchesAuthUrl = (url) => /login|signin|auth|session|token|account/i.test(url);

  page.on("request", (request) => {
    if (request.method() === "POST" || matchesAuthUrl(request.url())) {
      events.push({
        type: "request",
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    }
  });

  page.on("requestfailed", (request) => {
    if (request.method() === "POST" || matchesAuthUrl(request.url())) {
      events.push({
        type: "requestfailed",
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText ?? "unknown",
      });
    }
  });

  page.on("response", (response) => {
    if (response.request().method() === "POST" || matchesAuthUrl(response.url())) {
      events.push({
        type: "response",
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    }
  });

  page.on("console", (message) => {
    if (message.type() === "error" || /captcha|login|token|auth/i.test(message.text())) {
      events.push({
        type: "console",
        level: message.type(),
        text: message.text(),
      });
    }
  });

  return events;
}

async function clickFirstVisible(page, specs) {
  for (const spec of specs) {
    const locator = spec.selector
      ? page.locator(spec.selector).first()
      : spec.kind === "button"
        ? page.getByRole("button", { name: spec.pattern }).first()
        : page.getByRole("link", { name: spec.pattern }).first();

    if (await locator.isVisible().catch(() => false)) {
      await Promise.allSettled([page.waitForLoadState("domcontentloaded"), locator.click()]);
      return true;
    }
  }

  return false;
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(value);
      return selector;
    }
  }

  return null;
}

export async function loginMilesplit(page, options = {}) {
  const config = getMilesplitConfig(options);

  if (!config.username || !config.password) {
    throw new Error("MILESPLIT_USERNAME and MILESPLIT_PASSWORD must be set in .env");
  }

  const authEvents = attachAuthLogging(page);

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);

  const openedLogin = await clickFirstVisible(page, [
    { kind: "link", pattern: /login|sign in/i },
    { kind: "button", pattern: /login|sign in/i },
  ]);

  if (!openedLogin) {
    await page.goto("https://www.milesplit.com/login", { waitUntil: "domcontentloaded" });
  }

  await dismissConsent(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const userSelector = await fillFirstVisible(
    page,
    [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[name="login"]',
      'input[id*="email"]',
      'input[id*="user"]',
      'input[autocomplete="username"]',
      'input[type="text"]',
    ],
    config.username,
  );

  const passwordSelector = await fillFirstVisible(
    page,
    [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password"]',
      'input[autocomplete="current-password"]',
    ],
    config.password,
  );

  if (!userSelector || !passwordSelector) {
    ensureOutputDir();
    await page.screenshot({ path: `${OUTPUT_DIR}/login-form-not-found.png`, fullPage: true });
    throw new Error(
      `Could not find login fields. userSelector=${userSelector} passwordSelector=${passwordSelector} currentUrl=${page.url()}`,
    );
  }

  const submitButton = page.locator("#frmSubmit").first();
  if (await submitButton.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      document.querySelector("#frmSubmit")?.click();
    });
  } else {
    const fallbackClicked = await clickFirstVisible(page, [
      { kind: "button", pattern: /sign in|log ?in|login|continue/i },
      { kind: "link", pattern: /sign in|log ?in|login|continue/i },
    ]);

    if (!fallbackClicked) {
      await page.locator('input[type="password"]').first().press("Enter");
    }
  }

  await Promise.race([
    page.waitForURL((url) => !/login|signin|auth/i.test(url.toString()), { timeout: 25000 }),
    page.locator("#loader").waitFor({ state: "hidden", timeout: 25000 }),
  ]).catch(() => undefined);

  await page.waitForLoadState("networkidle").catch(() => undefined);
  await dismissConsent(page);

  const authed = await isAuthenticated(page);
  await saveStorageState(page.context(), options.storageStatePath || STORAGE_STATE_PATH);

  if (!authed) {
    ensureOutputDir();
    await page.screenshot({ path: `${OUTPUT_DIR}/login-failed.png`, fullPage: true });
    await writeFile(`${OUTPUT_DIR}/login-failed.html`, await page.content(), "utf8");
  }

  return {
    authed,
    url: page.url(),
    title: await page.title(),
    authEvents,
  };
}

export async function ensureAuthenticated(page, options = {}) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);

  if (await isAuthenticated(page)) {
    await saveStorageState(page.context(), options.storageStatePath || STORAGE_STATE_PATH);
    return {
      authed: true,
      url: page.url(),
      title: await page.title(),
      reusedSession: true,
    };
  }

  const loginResult = await loginMilesplit(page, options);
  return {
    ...loginResult,
    reusedSession: false,
  };
}

export async function collectAccountLinks(page) {
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((node) => ({
        text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
        href: node.href,
      }))
      .filter((link) => link.href && /account|profile|logout|subscription|my/i.test(`${link.text} ${link.href}`))
      .slice(0, 20),
  );

  return links;
}
