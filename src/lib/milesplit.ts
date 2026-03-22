import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { findManagedAthleteMatch } from "@/lib/managed-athletes";
import { runCompetitionMonteCarlo, runSprintMonteCarlo } from "@/lib/simulation";
import type { CompetitionEntry, CompetitionOutcome, SprintEntry } from "@/types/simulation";

const BASE_URL = "https://www.milesplit.com/";
const DEFAULT_BROWSER_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_DIR = path.join(process.cwd(), "tmp", "playwright");
const STORAGE_STATE_PATH = path.join(OUTPUT_DIR, "milesplit-storage-state.json");

export const DEFAULT_VIRGINIA_RANKINGS_QUERY: MilesplitRankingsQuery = {
  state: "VA",
  level: "high-school-girls",
  season: "outdoor-track-and-field",
  year: "2026",
  accuracy: "all",
  league: "3844",
};

export type MilesplitRankingsQuery = {
  state: string;
  level: string;
  season: string;
  year?: string;
  accuracy?: string;
  grade?: string;
  league?: string;
};

export type RankingsRow = {
  section: string;
  event: string;
  eventUrl: string;
  mark: string;
  wind: string;
  athlete: string;
  athleteUrl: string;
  team: string;
  teamUrl: string;
  grade: string;
  meet: string;
  meetUrl: string;
  place: string;
  date: string;
};

export type RankingsSection = {
  section: string;
  rows: RankingsRow[];
};

export type RankingsExport = {
  url: string;
  title: string;
  exportedAt: string;
  totalRows: number;
  sections: RankingsSection[];
  filters: MilesplitRankingsQuery;
};

export type RankingsTrackerRequest = {
  queryUrl?: string;
  filters?: MilesplitRankingsQuery;
  trackedAthletes?: string[];
  limit?: number;
  eventLimit?: number;
};

export type EventTopEntry = {
  rank: number;
  event: string;
  eventUrl: string;
  mark: string;
  wind: string;
  athlete: string;
  athleteUrl: string;
  team: string;
  teamUrl: string;
  grade: string;
  meet: string;
  meetUrl: string;
  place: string;
  date: string;
};

export type AthleteTrackerMatch = {
  athlete: string;
  matches: EventTopEntry[];
};

export type RankingsTrackerExport = {
  sourceUrl: string;
  exportedAt: string;
  totalEvents: number;
  trackedAthletes: string[];
  eventGroups: Array<{
    section: string;
    event: string;
    eventUrl: string;
    rows: EventTopEntry[];
  }>;
  athleteSummaries: AthleteTrackerMatch[];
};

export type MilesplitAthleteSearchMatch = {
  athlete: string;
  athleteUrl: string;
  team: string;
  previewMark: string;
  classOf?: number | null;
};

export type MilesplitAthleteHistoryEntry = {
  event: string;
  mark: string;
  numericMark: number | null;
  meet: string;
  date: string;
  place: string;
  round: string;
  location: string;
  season: string;
};

export type MilesplitSimulatedEntrant = {
  requestedName: string;
  resolvedName: string;
  athleteUrl: string;
  team: string;
  personalRecord: number;
  previousSeasonAverage: number | null;
  seasonAverage: number;
  allTimeAverage: number;
  seedPerformance: number;
  seedBasis: string;
  stdDev: number;
  confidence: "url" | "exact" | "team-hint" | "first-result";
  history: MilesplitAthleteHistoryEntry[];
  allEventHistory: MilesplitAthleteHistoryEntry[];
  notes: string[];
};

export type MilesplitSkippedParticipant = {
  requestedName: string;
  reason: string;
  searchMatches?: MilesplitAthleteSearchMatch[];
};

export type MilesplitEventSimulationRequest = {
  event: string;
  participants?: string[];
  participantText?: string;
  manualMatches?: Array<{
    requestedName: string;
    teamHint?: string;
    athleteUrl: string;
  }>;
  searchState?: string;
  season?: string;
  iterations?: number;
  historyLimit?: number;
  seedStrategy?: "previous-season" | "current-season" | "all-time";
};

export type MilesplitEventSimulationExport = {
  event: string;
  searchState: string;
  season: string;
  eventType: "time" | "field";
  performanceUnit: "seconds" | "inches";
  iterations: number;
  historyLimit: number;
  canSimulate: boolean;
  warningMessage: string | null;
  generatedAt: string;
  participantsRequested: string[];
  entrants: MilesplitSimulatedEntrant[];
  skippedParticipants: MilesplitSkippedParticipant[];
  results: CompetitionOutcome[];
};

export type MilesplitSimulationProgress = {
  message: string;
  current?: number;
  total?: number;
};

export type MilesplitAthleteProgressRow = {
  sortOrder: number;
  requestedName: string;
  teamHint?: string;
  status: "queued" | "searching" | "matched" | "history_loaded" | "seeded" | "skipped";
  resolvedName?: string;
  athleteUrl?: string;
  team?: string;
  confidence?: "url" | "exact" | "team-hint" | "first-result";
  personalRecord?: number;
  previousSeasonAverage?: number | null;
  seasonAverage?: number;
  allTimeAverage?: number;
  seedPerformance?: number;
  seedBasis?: string;
  stdDev?: number;
  notes?: string[];
  reason?: string;
  searchMatches?: MilesplitAthleteSearchMatch[];
};

export type ParsedParticipant = {
  raw: string;
  requestedName: string;
  teamHint?: string;
  athleteUrl?: string;
  gradeHint?: number;
};

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function getBrowserExecutablePath() {
  const configured = process.env.MILESPLIT_BROWSER_PATH ?? "";
  if (configured && existsSync(configured)) {
    return configured;
  }

  if (configured === "" && existsSync(DEFAULT_BROWSER_PATH)) {
    return undefined;
  }

  return existsSync(DEFAULT_BROWSER_PATH) ? undefined : configured || undefined;
}

async function dismissConsent(page: Page) {
  const labels = ["Accept", "Accept All", "I Agree", "AGREE", "Continue", "Close"];

  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      return;
    }
  }
}

async function isAuthenticated(page: Page) {
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

async function saveStorageState(context: BrowserContext) {
  ensureOutputDir();
  await context.storageState({ path: STORAGE_STATE_PATH });
}

async function loginMilesplit(page: Page) {
  const username = process.env.MILESPLIT_USERNAME ?? "";
  const password = process.env.MILESPLIT_PASSWORD ?? "";

  if (!username || !password) {
    throw new Error("MILESPLIT_USERNAME and MILESPLIT_PASSWORD must be set.");
  }

  await page.goto("https://www.milesplit.com/login", { waitUntil: "domcontentloaded" });
  await dismissConsent(page);

  await page.locator("#email").fill(username);
  await page.locator("#password").fill(password);

  await page.evaluate(() => {
    (document.querySelector("#frmSubmit") as HTMLButtonElement | null)?.click();
  });

  await Promise.race([
    page.waitForURL((url) => !/login|signin|auth/i.test(url.toString()), { timeout: 25000 }),
    page.locator("#loader").waitFor({ state: "hidden", timeout: 25000 }),
  ]).catch(() => undefined);

  await page.waitForLoadState("networkidle").catch(() => undefined);
  await dismissConsent(page);

  if (!(await isAuthenticated(page))) {
    throw new Error(`MileSplit authentication failed; current URL: ${page.url()}`);
  }

  await saveStorageState(page.context());
}

async function ensureAuthenticated(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);

  if (await isAuthenticated(page)) {
    await saveStorageState(page.context());
    return;
  }

  await loginMilesplit(page);
}

function createContextOptions() {
  return {
    viewport: { width: 1440, height: 960 },
    ...(existsSync(STORAGE_STATE_PATH) ? { storageState: STORAGE_STATE_PATH } : {}),
  };
}

export function buildMilesplitRankingsUrl(query: MilesplitRankingsQuery): string {
  const state = query.state.trim().toLowerCase();
  const baseHost = state === "usa" ? "https://www.milesplit.com" : `https://${state}.milesplit.com`;
  const params = new URLSearchParams();

  if (query.year) {
    params.set("year", query.year);
  }
  if (query.accuracy) {
    params.set("accuracy", query.accuracy);
  }
  if (query.grade) {
    params.set("grade", query.grade);
  }
  if (query.league) {
    params.set("league", query.league);
  }

  const queryString = params.toString();
  const path = `/rankings/leaders/${query.level}/${query.season}`;

  return queryString ? `${baseHost}${path}?${queryString}` : `${baseHost}${path}`;
}

function normalizeAthleteName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function tokenizeAthleteName(value: string) {
  return normalizeAthleteName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeTextToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeEventName(value: string) {
  const base = normalizeTextToken(value);
  const aliases: Record<string, string> = {
    "100m": "100meterdash",
    "100meterdash": "100meterdash",
    "200m": "200meterdash",
    "200meterdash": "200meterdash",
    "400m": "400meterdash",
    "400meterdash": "400meterdash",
    "800m": "800meterrun",
    "800meterrun": "800meterrun",
    "1600m": "1600meterrun",
    "1600meterrun": "1600meterrun",
    "3200m": "3200meterrun",
    "3200meterrun": "3200meterrun",
    "100mh": "100meterhurdles",
    "100h": "100meterhurdles",
    "100meterhurdles": "100meterhurdles",
    "110mh": "110meterhurdles",
    "110h": "110meterhurdles",
    "110meterhurdles": "110meterhurdles",
    "300mh": "300meterhurdles",
    "300h": "300meterhurdles",
    "300meterhurdles": "300meterhurdles",
    "400mh": "400meterhurdles",
    "400h": "400meterhurdles",
    "400meterhurdles": "400meterhurdles",
    "4x100m": "4x100meterrelay",
    "4x100meterrelay": "4x100meterrelay",
    "4x200m": "4x200meterrelay",
    "4x200meterrelay": "4x200meterrelay",
    "4x400m": "4x400meterrelay",
    "4x400meterrelay": "4x400meterrelay",
    "4x800m": "4x800meterrelay",
    "4x800meterrelay": "4x800meterrelay",
  };

  return aliases[base] ?? base;
}

function isTimeBasedEvent(event: string) {
  const normalized = normalizeEventName(event);
  return [
    "100meterdash",
    "200meterdash",
    "400meterdash",
    "800meterrun",
    "1600meterrun",
    "3200meterrun",
    "100meterhurdles",
    "110meterhurdles",
    "300meterhurdles",
    "400meterhurdles",
    "4x100meterrelay",
    "4x200meterrelay",
    "4x400meterrelay",
    "4x800meterrelay",
  ].includes(normalized);
}

function isFieldEvent(event: string) {
  const normalized = normalizeEventName(event);
  return [
    "shotput",
    "discus",
    "javelin",
    "highjump",
    "polevault",
    "longjump",
    "triplejump",
  ].includes(normalized);
}

function parsePerformanceToSeconds(mark: string) {
  const clean = mark.replace(/[^\d:.\-]/g, "").trim();
  if (!clean) {
    return null;
  }

  const parts = clean.split(":");
  if (parts.length === 1) {
    const value = Number.parseFloat(parts[0]);
    return Number.isFinite(value) ? value : null;
  }

  let total = 0;
  for (const part of parts) {
    const value = Number.parseFloat(part);
    if (!Number.isFinite(value)) {
      return null;
    }
    total = total * 60 + value;
  }

  return total;
}

function parsePerformanceToInches(mark: string) {
  const clean = mark.replace(/[^\d.\-]/g, "").trim();
  if (!clean) {
    return null;
  }

  const parts = clean.split("-").filter(Boolean);
  if (parts.length === 1) {
    const value = Number.parseFloat(parts[0]);
    return Number.isFinite(value) ? value : null;
  }

  const feet = Number.parseFloat(parts[0]);
  const inches = Number.parseFloat(parts[1]);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) {
    return null;
  }

  return feet * 12 + inches;
}

export function parseParticipants(request: MilesplitEventSimulationRequest) {
  const extractGradeHint = (value: string) => {
    const match = value.match(/\[(\d{1,2})\]/);
    if (!match) {
      return undefined;
    }

    const grade = Number.parseInt(match[1], 10);
    return Number.isFinite(grade) ? grade : undefined;
  };
  const manualMatchMap = new Map(
    (request.manualMatches ?? []).map((entry) => [
      `${normalizeAthleteName(entry.requestedName)}|${normalizeAthleteName(entry.teamHint ?? "")}`,
      entry.athleteUrl,
    ]),
  );
  const applyManualMatch = (participant: ParsedParticipant): ParsedParticipant => ({
    ...participant,
    athleteUrl:
      participant.athleteUrl ??
      manualMatchMap.get(
        `${normalizeAthleteName(participant.requestedName)}|${normalizeAthleteName(participant.teamHint ?? "")}`,
      ),
  });

  const suppliedParticipants = (request.participants ?? [])
    .map((line) => line.trim())
    .filter(Boolean);

  if (suppliedParticipants.length > 0) {
    return suppliedParticipants.map<ParsedParticipant>((line) => {
      const urlMatch = line.match(/https?:\/\/[^\s|]+milesplit\.com\/athletes\/[^\s|]+/i);
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      const requestedName = parts[0] && !/^https?:\/\//i.test(parts[0]) ? parts[0] : line.replace(urlMatch?.[0] ?? "", "").trim() || line;
      const teamHint = parts.length > 1 ? parts[1] : undefined;

      return applyManualMatch({
        raw: line,
        requestedName,
        teamHint,
        athleteUrl: urlMatch?.[0] || (/^https?:\/\/.+milesplit\.com\/athletes\//i.test(parts[0] ?? "") ? parts[0] : undefined),
        gradeHint: extractGradeHint(line),
      });
    });
  }

  const rawLines = (request.participantText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedParticipant[] = [];
  let pendingName: string | null = null;

  for (const line of rawLines) {
    if (
      /^ln\/pos$/i.test(line) ||
      /^athlete$/i.test(line) ||
      /^ln\/pos\s+athlete$/i.test(line) ||
      /^flight\s+\d+/i.test(line) ||
      /^national elite/i.test(line)
    ) {
      continue;
    }

    if (line.includes("|") || /^https?:\/\//i.test(line)) {
      const urlMatch = line.match(/https?:\/\/[^\s|]+milesplit\.com\/athletes\/[^\s|]+/i);
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      const requestedName = parts[0] && !/^https?:\/\//i.test(parts[0]) ? parts[0] : line.replace(urlMatch?.[0] ?? "", "").trim() || line;
      const teamHint = parts.length > 1 ? parts[1] : undefined;

      parsed.push(applyManualMatch({
        raw: line,
        requestedName,
        teamHint,
        athleteUrl: urlMatch?.[0] || (/^https?:\/\/.+milesplit\.com\/athletes\//i.test(parts[0] ?? "") ? parts[0] : undefined),
        gradeHint: extractGradeHint(line),
      }));
      pendingName = null;
      continue;
    }

    const numberedAthlete = line.match(/^\d+\s+(.+)$/);
    if (numberedAthlete) {
      pendingName = numberedAthlete[1].trim();
      continue;
    }

    const tabbedAthlete = line.match(/^\d+\t+(.+)$/);
    if (tabbedAthlete) {
      pendingName = tabbedAthlete[1].trim();
      continue;
    }

    if (pendingName) {
      parsed.push(applyManualMatch({
        raw: `${pendingName} | ${line}`,
        requestedName: pendingName,
        teamHint: line.replace(/\s*\[[^\]]+\]\s*$/, "").trim(),
        gradeHint: extractGradeHint(line),
      }));
      pendingName = null;
      continue;
    }

    parsed.push(applyManualMatch({
      raw: line,
      requestedName: line.replace(/\s*\[[^\]]+\]\s*$/, "").trim(),
      gradeHint: extractGradeHint(line),
    }));
  }

  return parsed;
}

function inferGraduationYear(gradeHint: number | undefined) {
  if (!gradeHint || gradeHint < 1 || gradeHint > 12) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  return currentYear + (12 - gradeHint);
}

function deriveSearchState(value?: string) {
  const clean = (value ?? "").trim();
  return clean ? clean.toLowerCase() : "usa";
}

function deriveSeasonKey(value?: string) {
  const normalized = normalizeTextToken(value ?? "");
  if (normalized.includes("indoor")) return "indoor";
  if (normalized.includes("crosscountry") || normalized === "xc") return "xc";
  return "outdoor";
}

function calculateMean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateStdDev(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = calculateMean(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function parseEntryYear(date: string) {
  const match = date.match(/\b(20\d{2})\b/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function buildTimeSeedFromHistory(athleteName: string, teamName: string, history: MilesplitAthleteHistoryEntry[]) {
  const numericHistory = history
    .map((entry) => entry.numericMark)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numericHistory.length === 0) {
    throw new Error(`No time-based history available for ${athleteName}`);
  }

  const best = Math.min(...numericHistory);
  const weightedAverage =
    numericHistory.reduce((sum, value, index) => sum + value * (numericHistory.length - index), 0) /
    numericHistory.reduce((sum, _, index) => sum + (numericHistory.length - index), 0);
  const seedTime = best * 0.65 + weightedAverage * 0.35;
  const spread = calculateStdDev(numericHistory);

  const entry: SprintEntry = {
    athleteName,
    teamName,
    seedTime,
    stdDev: Math.max(0.05, Math.min(spread || 0.12, 1.25)),
  };

  return entry;
}

function summarizeEventHistory(
  history: MilesplitAthleteHistoryEntry[],
  higherIsBetter: boolean,
) {
  const numericHistory = history
    .map((entry) => entry.numericMark)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numericHistory.length === 0) {
    throw new Error("No numeric event history available.");
  }

  return {
    personalRecord: higherIsBetter ? Math.max(...numericHistory) : Math.min(...numericHistory),
    average: calculateMean(numericHistory),
    stdDev: Math.max(higherIsBetter ? 0.5 : 0.05, calculateStdDev(numericHistory) || (higherIsBetter ? 1.5 : 0.12)),
  };
}

function chooseSeedHistory(
  history: MilesplitAthleteHistoryEntry[],
  selectedSeason: string,
  higherIsBetter: boolean,
  seedStrategy: "previous-season" | "current-season" | "all-time",
  historyDepth: number,
) {
  const numericHistory = history.filter((entry) => typeof entry.numericMark === "number");
  const selectedSeasonHistory = numericHistory.filter((entry) => entry.season === selectedSeason);
  const selectedYears = selectedSeasonHistory
    .map((entry) => parseEntryYear(entry.date))
    .filter((value): value is number => typeof value === "number");
  const currentSeasonYear = selectedYears.length > 0 ? Math.max(...selectedYears) : null;
  const previousSeasonHistory =
    currentSeasonYear === null
      ? []
      : selectedSeasonHistory.filter((entry) => parseEntryYear(entry.date) === currentSeasonYear - 1);
  const limitedPreviousSeasonHistory = previousSeasonHistory.slice(0, historyDepth);
  const limitedSelectedSeasonHistory = selectedSeasonHistory.slice(0, historyDepth);
  const limitedAllTimeHistory = numericHistory.slice(0, historyDepth);

  if (seedStrategy === "all-time") {
    return {
      history: limitedAllTimeHistory,
      previousSeasonAverage: limitedPreviousSeasonHistory.length >= 2
        ? summarizeEventHistory(limitedPreviousSeasonHistory, higherIsBetter).average
        : null,
      seedBasis: "all-time average",
    };
  }

  if (seedStrategy === "current-season") {
    if (limitedSelectedSeasonHistory.length >= 2) {
      return {
        history: limitedSelectedSeasonHistory,
        previousSeasonAverage: limitedPreviousSeasonHistory.length >= 2
          ? summarizeEventHistory(limitedPreviousSeasonHistory, higherIsBetter).average
          : null,
        seedBasis: "current season average",
      };
    }

    return {
      history: limitedAllTimeHistory,
      previousSeasonAverage: limitedPreviousSeasonHistory.length >= 2
        ? summarizeEventHistory(limitedPreviousSeasonHistory, higherIsBetter).average
        : null,
      seedBasis: "all-time average fallback",
    };
  }

  if (limitedPreviousSeasonHistory.length >= 2) {
    return {
      history: limitedPreviousSeasonHistory,
      previousSeasonAverage: summarizeEventHistory(limitedPreviousSeasonHistory, higherIsBetter).average,
      seedBasis: "previous season average",
    };
  }

  if (limitedSelectedSeasonHistory.length >= 2) {
    return {
      history: limitedSelectedSeasonHistory,
      previousSeasonAverage: null,
      seedBasis: "current season average",
    };
  }

  return {
    history: limitedAllTimeHistory,
    previousSeasonAverage: null,
    seedBasis: "all-time average fallback",
  };
}

function buildFieldSeedFromHistory(athleteName: string, teamName: string, history: MilesplitAthleteHistoryEntry[]) {
  const numericHistory = history
    .map((entry) => entry.numericMark)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (numericHistory.length === 0) {
    throw new Error(`No field-event history available for ${athleteName}`);
  }

  const best = Math.max(...numericHistory);
  const weightedAverage =
    numericHistory.reduce((sum, value, index) => sum + value * (numericHistory.length - index), 0) /
    numericHistory.reduce((sum, _, index) => sum + (numericHistory.length - index), 0);

  return {
    athleteName,
    teamName,
    seedPerformance: best * 0.65 + weightedAverage * 0.35,
    stdDev: Math.max(0.5, Math.min(calculateStdDev(numericHistory) || 1.5, 12)),
    higherIsBetter: true,
  } satisfies CompetitionEntry;
}

function resolveRankingsSource(request: RankingsTrackerRequest) {
  if (request.queryUrl) {
    const url = new URL(request.queryUrl);
    if (!url.hostname.endsWith("milesplit.com")) {
      throw new Error("queryUrl must point to a milesplit.com rankings page");
    }
    return url.toString();
  }

  if (request.filters) {
    return buildMilesplitRankingsUrl(request.filters);
  }

  throw new Error("Either queryUrl or filters must be provided");
}

async function extractLeaderEvents(page: Page) {
  return page.evaluate(() => {
    const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
    const sections: Array<{ section: string; event: string; eventUrl: string }> = [];
    let currentSection = "Uncategorized";

    for (const row of Array.from(document.querySelectorAll("#rankingsTable tbody tr"))) {
      if (row.classList.contains("thead")) {
        currentSection = clean(row.querySelector("th.event")?.textContent) || "Uncategorized";
        continue;
      }

      const eventLink = row.querySelector<HTMLAnchorElement>("td.event a");
      if (!eventLink) {
        continue;
      }

      sections.push({
        section: currentSection,
        event: clean(eventLink.textContent),
        eventUrl: eventLink.href,
      });
    }

    return sections;
  });
}

async function extractEventTopEntries(
  page: Page,
  sourceUrl: string,
  eventLabel: string,
  eventUrl: string,
  limit: number,
): Promise<EventTopEntry[]> {
  const eventPageUrl = new URL(eventUrl, sourceUrl);
  const sourceSearch = new URL(sourceUrl).searchParams;

  for (const key of ["year", "accuracy", "grade", "league"]) {
    const value = sourceSearch.get(key);
    if (value) {
      eventPageUrl.searchParams.set(key, value);
    }
  }

  await page.goto(eventPageUrl.toString(), { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);

  return page.evaluate(
    ({ eventLabel: pageEventLabel, eventPageUrl: currentEventUrl, limit: rowLimit }) => {
      const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

      return Array.from(document.querySelectorAll<HTMLTableRowElement>("#rankingsTable tbody tr"))
        .slice(0, rowLimit)
        .map((row) => {
          const athleteLink = row.querySelector<HTMLAnchorElement>("td.name .athlete a");
          const teamLink = row.querySelector<HTMLAnchorElement>("td.name .team a");
          const meetLink = row.querySelector<HTMLAnchorElement>("td.meet .meet a");
          const placeNode = row.querySelector("td.meet .meet em");
          const dateNode = row.querySelector("td.meet .date time");

          return {
            rank: Number.parseInt(clean(row.querySelector("td.rank")?.textContent), 10) || 0,
            event: pageEventLabel,
            eventUrl: currentEventUrl,
            mark: clean(row.querySelector("td.time")?.childNodes?.[0]?.textContent || row.querySelector("td.time")?.textContent),
            wind: clean(row.querySelector("td.wind")?.textContent),
            athlete: clean(athleteLink?.textContent || row.querySelector("td.name .athlete")?.textContent),
            athleteUrl: athleteLink?.href || "",
            team: clean(teamLink?.textContent || row.querySelector("td.name .team")?.textContent),
            teamUrl: teamLink?.href || "",
            grade: clean(row.querySelector("td.year")?.textContent),
            meet: clean(meetLink?.textContent),
            meetUrl: meetLink?.href || "",
            place: clean(placeNode?.textContent),
            date: clean(dateNode?.textContent),
          };
        })
        .filter((row) => row.rank > 0);
    },
    {
      eventLabel,
      eventPageUrl: eventPageUrl.toString(),
      limit,
    },
  );
}

async function searchMilesplitAthletes(
  page: Page,
  state: string,
  athleteName: string,
): Promise<MilesplitAthleteSearchMatch[]> {
  const searchUrl =
    state === "usa"
      ? `https://www.milesplit.com/search?ns=1&nq=${encodeURIComponent(athleteName)}&sc=athlete`
      : `https://${state}.milesplit.com/athletes?search=${encodeURIComponent(athleteName)}`;

  await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);

  return page.evaluate(() => {
    const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
    const normalize = (value: string | null | undefined) => clean(value).toLowerCase();
    const candidates = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/athletes/"]'));
    const seen = new Set<string>();

    return candidates
      .map((link) => {
        const container =
          link.closest("article, li, .card, .search-item, .media, .result, .content, .athlete, .ranking-profile") ??
          link.parentElement ??
          link;
        const textLines = clean(container.textContent)
          .split(/\s{2,}|\n/)
          .map((line) => clean(line))
          .filter(Boolean);
        const athlete = clean(
          link.textContent ||
            container.querySelector(".athlete-name, .name, h2, h3, strong")?.textContent,
        );
        const teamLine = textLines.find((line) => line !== athlete && /\/|,|USA|TC|High School|HS|Unattached/i.test(line)) ?? "";
        const previewMark =
          clean(container.querySelector(".performance, .top-performance, .mark, .result")?.textContent) ||
          "";

        return {
          athlete,
          athleteUrl: link.href,
          team: teamLine,
          previewMark,
          classOf: (() => {
            const classMatch = teamLine.match(/\b(20\d{2})\b/);
            return classMatch ? Number.parseInt(classMatch[1], 10) : null;
          })(),
        };
      })
      .filter((entry) => {
        const normalizedAthlete = normalize(entry.athlete);
        const normalizedTeam = normalize(entry.team);
        if (
          !entry.athlete ||
          !entry.athleteUrl ||
          seen.has(entry.athleteUrl) ||
          normalizedAthlete === "compare athletes" ||
          normalizedAthlete.includes("compare athletes") ||
          normalizedTeam.includes("compare athletes")
        ) {
          return false;
        }
        seen.add(entry.athleteUrl);
        return true;
      });
  });
}

function chooseBestAthleteMatch(
  requestedName: string,
  teamHint: string | undefined,
  gradeHint: number | undefined,
  matches: MilesplitAthleteSearchMatch[],
): {
  match: MilesplitAthleteSearchMatch | null;
  confidence: MilesplitSimulatedEntrant["confidence"] | null;
  reason?: string;
  reviewMatches?: MilesplitAthleteSearchMatch[];
} {
  if (matches.length === 0) {
    return { match: null, confidence: null };
  }

  const normalizedName = normalizeAthleteName(requestedName);
  const normalizedTeamHint = normalizeAthleteName(teamHint ?? "");
  const requestedTokens = tokenizeAthleteName(requestedName);
  const requestedFirst = requestedTokens[0] ?? "";
  const requestedLast = requestedTokens[requestedTokens.length - 1] ?? "";
  const exactMatches = matches.filter((match) => normalizeAthleteName(match.athlete) === normalizedName);
  const expectedGraduationYear = inferGraduationYear(gradeHint);
  const classMatchedExact = expectedGraduationYear
    ? exactMatches.filter((match) => match.classOf === expectedGraduationYear)
    : [];

  if (normalizedTeamHint) {
    const teamMatched = (classMatchedExact.length > 0 ? classMatchedExact : exactMatches).find((match) =>
      normalizeAthleteName(match.team).includes(normalizedTeamHint),
    );
    if (teamMatched) {
      return { match: teamMatched, confidence: "team-hint" };
    }
  }

  if (classMatchedExact.length === 1) {
    return { match: classMatchedExact[0], confidence: "exact" };
  }

  if (classMatchedExact.length > 1) {
    return {
      match: null,
      confidence: null,
      reason: `Multiple exact-name candidates found for class of ${expectedGraduationYear}; manual review required`,
      reviewMatches: classMatchedExact.slice(0, 5),
    };
  }

  if (exactMatches.length === 1) {
    return { match: exactMatches[0], confidence: "exact" };
  }

  if (exactMatches.length > 1) {
    return {
      match: null,
      confidence: null,
      reason: "Multiple exact-name candidates found; manual review required",
      reviewMatches: exactMatches.slice(0, 5),
    };
  }

  const tokenMatches = matches.filter((match) => {
    const tokens = tokenizeAthleteName(match.athlete);
    const first = tokens[0] ?? "";
    const last = tokens[tokens.length - 1] ?? "";
    return first === requestedFirst && last === requestedLast;
  });
  const classMatchedToken = expectedGraduationYear
    ? tokenMatches.filter((match) => match.classOf === expectedGraduationYear)
    : [];

  if (normalizedTeamHint) {
    const teamMatchedToken = (classMatchedToken.length > 0 ? classMatchedToken : tokenMatches).find((match) =>
      normalizeAthleteName(match.team).includes(normalizedTeamHint),
    );
    if (teamMatchedToken) {
      return { match: teamMatchedToken, confidence: "team-hint" };
    }
  }

  if (classMatchedToken.length === 1) {
    return { match: classMatchedToken[0], confidence: "first-result" };
  }

  if (tokenMatches.length === 1) {
    return { match: tokenMatches[0], confidence: "first-result" };
  }

  const reviewMatches =
    classMatchedToken.length > 1
      ? classMatchedToken
      : tokenMatches.length > 1
        ? tokenMatches
        : matches.slice(0, 5);
  const reason =
    reviewMatches.length > 1
      ? "Multiple exact-name candidates found; manual review required"
      : "No confident MileSplit athlete match found";

  return { match: null, confidence: null, reason, reviewMatches };
}

async function extractAthleteEventHistory(
  page: Page,
  athleteUrl: string,
  event: string,
  historyLimit: number,
): Promise<Array<Omit<MilesplitAthleteHistoryEntry, "numericMark">>> {
  await page.goto(athleteUrl, { waitUntil: "domcontentloaded" });
  await dismissConsent(page);
  await page.waitForLoadState("networkidle").catch(() => undefined);

  return page.evaluate(
    ({ requestedEvent, limit }) => {
      const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
      const normalize = (value: string) => {
        const token = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const aliases: Record<string, string> = {
          "100m": "100meterdash",
          "100meterdash": "100meterdash",
          "200m": "200meterdash",
          "200meterdash": "200meterdash",
          "400m": "400meterdash",
          "400meterdash": "400meterdash",
          "800m": "800meterrun",
          "800meterrun": "800meterrun",
          "1600m": "1600meterrun",
          "1600meterrun": "1600meterrun",
          "3200m": "3200meterrun",
          "3200meterrun": "3200meterrun",
          "100mh": "100meterhurdles",
          "100h": "100meterhurdles",
          "100meterhurdles": "100meterhurdles",
          "110mh": "110meterhurdles",
          "110h": "110meterhurdles",
          "110meterhurdles": "110meterhurdles",
          "300mh": "300meterhurdles",
          "300h": "300meterhurdles",
          "300meterhurdles": "300meterhurdles",
          "400mh": "400meterhurdles",
          "400h": "400meterhurdles",
          "400meterhurdles": "400meterhurdles",
          "4x100m": "4x100meterrelay",
          "4x100meterrelay": "4x100meterrelay",
          "4x200m": "4x200meterrelay",
          "4x200meterrelay": "4x200meterrelay",
          "4x400m": "4x400meterrelay",
          "4x400meterrelay": "4x400meterrelay",
          "4x800m": "4x800meterrelay",
          "4x800meterrelay": "4x800meterrelay",
        };

        return aliases[token] ?? token;
      };
      const targetEvent = normalize(requestedEvent);
      const matchingEntries = Array.from(document.querySelectorAll<HTMLElement>(".season")).flatMap((seasonNode) => {
        const seasonKey = seasonNode.dataset.season ?? "";
        return Array.from(seasonNode.querySelectorAll(".event"))
          .filter((eventNode) => {
            const heading = clean(eventNode.querySelector(".event-heading")?.textContent);
            return normalize(heading) === targetEvent;
          })
          .flatMap((matchingEvent) =>
            Array.from(matchingEvent.querySelectorAll(".record.row")).map((row) => ({
              event: clean(matchingEvent.querySelector(".event-heading")?.textContent),
              mark: clean(
                row.querySelector(".seed span")?.textContent ||
                  row.querySelector(".seed")?.textContent ||
                  row.querySelector(".performance")?.textContent,
              ),
              meet: clean(row.querySelector(".location")?.textContent),
              date: clean(row.querySelector(".date")?.textContent),
              place: clean(row.querySelector(".position")?.textContent),
              round: clean(row.querySelector(".round")?.textContent),
              location: clean(row.querySelector(".location")?.textContent),
              season: seasonKey,
            })),
          );
      });

      return matchingEntries.filter((entry) => entry.mark).slice(0, limit);
    },
    {
      requestedEvent: event,
      limit: historyLimit,
    },
  );
}

export async function fetchMilesplitRankings(query: MilesplitRankingsQuery): Promise<RankingsExport> {
  ensureOutputDir();
  const rankingsUrl = buildMilesplitRankingsUrl(query);

  const browser = await chromium.launch({
    headless: true,
    executablePath: getBrowserExecutablePath(),
  });

  try {
    const context = await browser.newContext(createContextOptions());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    await ensureAuthenticated(page);
    await page.goto(rankingsUrl, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const data = await page.evaluate<Omit<RankingsExport, "filters">>(() => {
      const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
      const rows = Array.from(document.querySelectorAll("#rankingsTable tbody tr"));
      const sections: RankingsSection[] = [];
      let currentSection = "Uncategorized";
      let currentRows: RankingsRow[] = [];

      const flush = () => {
        if (currentRows.length > 0) {
          sections.push({
            section: currentSection,
            rows: currentRows,
          });
          currentRows = [];
        }
      };

      for (const row of rows) {
        if (row.classList.contains("thead")) {
          flush();
          currentSection = clean(row.querySelector("th.event")?.textContent) || "Uncategorized";
          continue;
        }

        const eventLink = row.querySelector<HTMLAnchorElement>("td.event a");
        const markCell = row.querySelector("td.time");
        const athleteLink = row.querySelector<HTMLAnchorElement>("td.name .athlete a");
        const teamLink = row.querySelector<HTMLAnchorElement>("td.name .team a");
        const meetLink = row.querySelector<HTMLAnchorElement>("td.meet .meet a");
        const placeNode = row.querySelector("td.meet .meet em");
        const dateNode = row.querySelector("td.meet .date time");
        const windNode = row.querySelector("td.time .wind");

        currentRows.push({
          section: currentSection,
          event: clean(eventLink?.textContent),
          eventUrl: eventLink?.href || "",
          mark: clean(markCell?.childNodes?.[0]?.textContent || markCell?.textContent),
          wind: clean(windNode?.textContent),
          athlete: clean(athleteLink?.textContent),
          athleteUrl: athleteLink?.href || "",
          team: clean(teamLink?.textContent),
          teamUrl: teamLink?.href || "",
          grade: clean(row.querySelector("td.year")?.textContent),
          meet: clean(meetLink?.textContent),
          meetUrl: meetLink?.href || "",
          place: clean(placeNode?.textContent),
          date: clean(dateNode?.textContent),
        });
      }

      flush();

      return {
        url: window.location.href,
        title: document.title,
        exportedAt: new Date().toISOString(),
        totalRows: sections.reduce((sum, section) => sum + section.rows.length, 0),
        sections,
      };
    });

    await saveStorageState(context);
    await context.close();

    return {
      ...data,
      filters: query,
    };
  } finally {
    await browser.close();
  }
}

export async function fetchMilesplitVirginiaRankings(): Promise<RankingsExport> {
  return fetchMilesplitRankings(DEFAULT_VIRGINIA_RANKINGS_QUERY);
}

export async function fetchMilesplitRankingsTop10(
  request: RankingsTrackerRequest,
): Promise<RankingsTrackerExport> {
  ensureOutputDir();
  const sourceUrl = resolveRankingsSource(request);
  const limit = Math.max(1, Math.min(request.limit ?? 10, 25));
  const eventLimit = Math.max(1, Math.min(request.eventLimit ?? 100, 100));
  const trackedAthletes = (request.trackedAthletes ?? [])
    .map((name) => name.trim())
    .filter(Boolean);

  const browser = await chromium.launch({
    headless: true,
    executablePath: getBrowserExecutablePath(),
  });

  try {
    const context = await browser.newContext(createContextOptions());
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    await ensureAuthenticated(page);
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const leaderEvents = await extractLeaderEvents(page);
    const eventGroups: RankingsTrackerExport["eventGroups"] = [];

    for (const leaderEvent of leaderEvents.slice(0, eventLimit)) {
      const rows = await extractEventTopEntries(
        page,
        sourceUrl,
        leaderEvent.event,
        leaderEvent.eventUrl,
        limit,
      );

      eventGroups.push({
        section: leaderEvent.section,
        event: leaderEvent.event,
        eventUrl: leaderEvent.eventUrl,
        rows,
      });
    }

    const athleteSummaries = trackedAthletes.map((athlete) => {
      const normalized = normalizeAthleteName(athlete);
      const matches = eventGroups.flatMap((group) =>
        group.rows.filter((row) => normalizeAthleteName(row.athlete) === normalized),
      );

      return {
        athlete,
        matches,
      };
    });

    await saveStorageState(context);
    await context.close();

    return {
      sourceUrl,
      exportedAt: new Date().toISOString(),
      totalEvents: eventGroups.length,
      trackedAthletes,
      eventGroups,
      athleteSummaries,
    };
  } finally {
    await browser.close();
  }
}

export function computeCompetitionResults(
  entrants: MilesplitSimulatedEntrant[],
  eventType: "time" | "field",
  iterations: number,
) {
  if (entrants.length < 2) {
    return [] as CompetitionOutcome[];
  }

  return eventType === "time"
    ? runSprintMonteCarlo(
        entrants.map((entrant) => ({
          athleteName: entrant.resolvedName,
          teamName: entrant.team,
          seedTime: entrant.seedPerformance,
          stdDev: entrant.stdDev,
        })) satisfies SprintEntry[],
        iterations,
      ).map((result) => ({
        athleteName: result.athleteName,
        teamName: result.teamName,
        winProbability: result.winProbability,
        podiumProbability: result.podiumProbability,
        expectedPlace: result.expectedPlace,
        mostLikelyPlace: result.mostLikelyPlace,
        averagePerformance: result.averageTime,
        performanceIntervalLow: result.timeIntervalLow,
        performanceIntervalHigh: result.timeIntervalHigh,
      }))
    : runCompetitionMonteCarlo(
        entrants.map((entrant) => ({
          athleteName: entrant.resolvedName,
          teamName: entrant.team,
          seedPerformance: entrant.seedPerformance,
          stdDev: entrant.stdDev,
          higherIsBetter: true,
        })) satisfies CompetitionEntry[],
        iterations,
      );
}

export async function resolveMilesplitEventSeeds(
  request: MilesplitEventSimulationRequest,
  options?: {
    onProgress?: (progress: MilesplitSimulationProgress) => Promise<void> | void;
    onAthleteProgress?: (row: MilesplitAthleteProgressRow) => Promise<void> | void;
    concurrency?: number;
  },
): Promise<MilesplitEventSimulationExport> {
  const timeBased = isTimeBasedEvent(request.event);
  const fieldBased = isFieldEvent(request.event);
  if (!timeBased && !fieldBased) {
    throw new Error("This event is not supported yet. Use a running event or a common field event like shot put.");
  }

  const parsedParticipants = parseParticipants(request);
  if (parsedParticipants.length < 2) {
    throw new Error("Provide at least two participants.");
  }

  const searchState = deriveSearchState(request.searchState);
  const season = deriveSeasonKey(request.season);
  const historyLimit = Math.max(2, Math.min(request.historyLimit ?? 5, 10));
  const iterations = Math.max(100, Math.min(request.iterations ?? 5000, 20000));
  const performanceUnit = timeBased ? "seconds" : "inches";
  const seedStrategy = request.seedStrategy ?? "previous-season";
  const totalParticipants = parsedParticipants.length;
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 2, 3));
  const reportProgress = async (message: string, current?: number, total?: number) => {
    await options?.onProgress?.({ message, current, total });
  };
  const reportAthlete = async (row: MilesplitAthleteProgressRow) => {
    await options?.onAthleteProgress?.(row);
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: getBrowserExecutablePath(),
  });

  try {
    const context = await browser.newContext(createContextOptions());
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    await reportProgress("Authenticating with MileSplit");
    await ensureAuthenticated(page);

    const entrants: MilesplitSimulatedEntrant[] = [];
    const skippedParticipants: MilesplitSkippedParticipant[] = [];
    const searchCache = new Map<string, MilesplitAthleteSearchMatch[]>();
    const historyCache = new Map<string, Array<Omit<MilesplitAthleteHistoryEntry, "numericMark">>>();
    const pages = [page];

    for (let i = 1; i < concurrency; i += 1) {
      const workerPage = await context.newPage();
      workerPage.setDefaultTimeout(20000);
      pages.push(workerPage);
    }

    let nextIndex = 0;
    let completed = 0;

    const processParticipant = async (workerPage: Page) => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= parsedParticipants.length) {
          return;
        }

        const participant = parsedParticipants[index];
        const participantNumber = index + 1;
        const notes: string[] = [];
        let athleteMatch: MilesplitAthleteSearchMatch | null = null;
        let confidence: MilesplitSimulatedEntrant["confidence"] = "first-result";
        let searchMatches: MilesplitAthleteSearchMatch[] = [];

        await reportProgress(`Resolving athlete ${participantNumber} of ${totalParticipants}: ${participant.requestedName}`, completed, totalParticipants);
        await reportAthlete({
          sortOrder: index,
          requestedName: participant.requestedName,
          teamHint: participant.teamHint,
          status: "searching",
        });

        if (participant.athleteUrl) {
          athleteMatch = {
            athlete: participant.requestedName,
            athleteUrl: participant.athleteUrl,
            team: participant.teamHint ?? "",
            previewMark: "",
          };
          confidence = "url";
        } else {
        const managedAthleteMatch = await findManagedAthleteMatch(participant.requestedName, participant.teamHint);
        if (managedAthleteMatch) {
          athleteMatch = managedAthleteMatch;
          confidence = "url";
          notes.push("Resolved from the My Athletes directory.");
        } else {
        await reportProgress(
          searchState === "usa"
            ? `Searching MileSplit nationally for ${participant.requestedName}`
            : `Searching MileSplit in ${searchState.toUpperCase()} for ${participant.requestedName}`,
          participantNumber,
          totalParticipants,
        );
          const cacheKey = `${searchState}:${normalizeAthleteName(participant.requestedName)}`;
        if (searchCache.has(cacheKey)) {
          searchMatches = searchCache.get(cacheKey) ?? [];
        } else {
          searchMatches = await searchMilesplitAthletes(workerPage, searchState, participant.requestedName);
          searchCache.set(cacheKey, searchMatches);
        }
          const selected = chooseBestAthleteMatch(
            participant.requestedName,
            participant.teamHint,
            participant.gradeHint,
            searchMatches,
          );
          athleteMatch = selected.match;
          confidence = selected.confidence ?? "first-result";
          if (!athleteMatch && selected.reason) {
            skippedParticipants.push({
              requestedName: participant.requestedName,
              reason: selected.reason,
              searchMatches: (selected.reviewMatches ?? searchMatches).slice(0, 5),
            });
            completed += 1;
            await reportAthlete({
              sortOrder: index,
              requestedName: participant.requestedName,
              teamHint: participant.teamHint,
              status: "skipped",
              reason: selected.reason,
              searchMatches: (selected.reviewMatches ?? searchMatches).slice(0, 5),
            });
            continue;
          }
        }
        }

        if (!athleteMatch) {
          skippedParticipants.push({
            requestedName: participant.requestedName,
            reason: "No MileSplit athlete match found",
            searchMatches,
          });
          completed += 1;
          await reportAthlete({
            sortOrder: index,
            requestedName: participant.requestedName,
            teamHint: participant.teamHint,
            status: "skipped",
            reason: "No MileSplit athlete match found",
            searchMatches: searchMatches.slice(0, 5),
          });
          continue;
        }

        await reportAthlete({
          sortOrder: index,
          requestedName: participant.requestedName,
          teamHint: participant.teamHint,
          status: "matched",
          resolvedName: athleteMatch.athlete,
          athleteUrl: athleteMatch.athleteUrl,
          team: athleteMatch.team,
          confidence,
        });

        await reportProgress(`Loading history for ${participant.requestedName}`, participantNumber, totalParticipants);
        const historyCacheKey = athleteMatch.athleteUrl;
        const rawHistory = historyCache.has(historyCacheKey)
          ? historyCache.get(historyCacheKey) ?? []
          : await extractAthleteEventHistory(
              workerPage,
              athleteMatch.athleteUrl,
              request.event,
              Math.max(historyLimit * 4, 12),
            );
        historyCache.set(historyCacheKey, rawHistory);

        const allEventHistory = rawHistory.map((entry) => ({
          ...entry,
          numericMark: timeBased ? parsePerformanceToSeconds(entry.mark) : parsePerformanceToInches(entry.mark),
        }));
        const seedHistory = chooseSeedHistory(allEventHistory, season, fieldBased, seedStrategy, historyLimit);
        const validHistory = seedHistory.history;

        await reportAthlete({
          sortOrder: index,
          requestedName: participant.requestedName,
          teamHint: participant.teamHint,
          status: "history_loaded",
          resolvedName: athleteMatch.athlete,
          athleteUrl: athleteMatch.athleteUrl,
          team: athleteMatch.team,
          confidence,
        });

        if (validHistory.length < 2) {
          const reason = `Not enough ${request.event} history found to seed the simulation`;
          skippedParticipants.push({
            requestedName: participant.requestedName,
            reason,
            searchMatches: searchMatches.slice(0, 5),
          });
          completed += 1;
          await reportAthlete({
            sortOrder: index,
            requestedName: participant.requestedName,
            teamHint: participant.teamHint,
            status: "skipped",
            resolvedName: athleteMatch.athlete,
            athleteUrl: athleteMatch.athleteUrl,
            team: athleteMatch.team,
            confidence,
            reason,
            searchMatches: searchMatches.slice(0, 5),
          });
          continue;
        }

        if (participant.teamHint && athleteMatch.team && !normalizeAthleteName(athleteMatch.team).includes(normalizeAthleteName(participant.teamHint))) {
          notes.push(`Resolved team "${athleteMatch.team}" did not exactly match team hint "${participant.teamHint}".`);
        }

        const timeSeed = timeBased ? buildTimeSeedFromHistory(athleteMatch.athlete, athleteMatch.team, validHistory) : null;
        const competitionEntry = timeSeed
          ? {
              athleteName: timeSeed.athleteName,
              teamName: timeSeed.teamName,
              seedPerformance: timeSeed.seedTime,
              stdDev: timeSeed.stdDev,
              higherIsBetter: false,
            }
          : buildFieldSeedFromHistory(athleteMatch.athlete, athleteMatch.team, validHistory);

        const eventSummary = summarizeEventHistory(allEventHistory, fieldBased);
        const seasonSummary = summarizeEventHistory(validHistory, fieldBased);

        const entrant: MilesplitSimulatedEntrant = {
          requestedName: participant.requestedName,
          resolvedName: athleteMatch.athlete || participant.requestedName,
          athleteUrl: athleteMatch.athleteUrl,
          team: athleteMatch.team,
          personalRecord: eventSummary.personalRecord,
          previousSeasonAverage: seedHistory.previousSeasonAverage,
          seasonAverage: seasonSummary.average,
          allTimeAverage: eventSummary.average,
          seedPerformance: competitionEntry.seedPerformance,
          seedBasis: seedHistory.seedBasis,
          stdDev: competitionEntry.stdDev ?? (timeBased ? 0.12 : 2),
          confidence,
          history: validHistory,
          allEventHistory,
          notes,
        };
        entrants.push(entrant);
        completed += 1;
        await reportAthlete({
          sortOrder: index,
          requestedName: participant.requestedName,
          teamHint: participant.teamHint,
          status: "seeded",
          resolvedName: entrant.resolvedName,
          athleteUrl: entrant.athleteUrl,
          team: entrant.team,
          confidence: entrant.confidence,
          personalRecord: entrant.personalRecord,
          previousSeasonAverage: entrant.previousSeasonAverage,
          seasonAverage: entrant.seasonAverage,
          allTimeAverage: entrant.allTimeAverage,
          seedPerformance: entrant.seedPerformance,
          seedBasis: entrant.seedBasis,
          stdDev: entrant.stdDev,
          notes: entrant.notes,
        });
      }
    };

    await Promise.all(pages.map((workerPage) => processParticipant(workerPage)));

    const canSimulate = entrants.length >= 2;

    await reportProgress(
      "Seed worksheet complete",
      entrants.length,
      totalParticipants,
    );

    await saveStorageState(context);
    await context.close();

    return {
      event: request.event,
      searchState: searchState.toUpperCase(),
      season,
      eventType: timeBased ? "time" : "field",
      performanceUnit,
      iterations,
      historyLimit,
      canSimulate,
      warningMessage: canSimulate ? null : "Not enough athletes with usable MileSplit history were found to run the simulation. Seed worksheet returned for review.",
      generatedAt: new Date().toISOString(),
      participantsRequested: parsedParticipants.map((participant) => participant.raw),
      entrants,
      skippedParticipants,
      results: [],
    };
  } finally {
    await browser.close();
  }
}

export async function simulateMilesplitEventFromHistory(
  request: MilesplitEventSimulationRequest,
  options?: {
    onProgress?: (progress: MilesplitSimulationProgress) => Promise<void> | void;
    onAthleteProgress?: (row: MilesplitAthleteProgressRow) => Promise<void> | void;
    concurrency?: number;
  },
): Promise<MilesplitEventSimulationExport> {
  const worksheet = await resolveMilesplitEventSeeds(request, options);
  const eventType = worksheet.eventType;
  const results = worksheet.canSimulate
    ? computeCompetitionResults(worksheet.entrants, eventType, worksheet.iterations)
    : [];

  await options?.onProgress?.({
    message: worksheet.canSimulate
      ? "Simulation complete"
      : "Seed worksheet complete; not enough athletes with usable history to run simulation",
    current: worksheet.entrants.length,
    total: worksheet.participantsRequested.length,
  });

  return {
    ...worksheet,
    results,
  };
}
