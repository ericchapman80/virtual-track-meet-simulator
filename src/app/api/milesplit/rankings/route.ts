import { fetchMilesplitRankings, type MilesplitRankingsQuery } from "@/lib/milesplit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequired(searchParams: URLSearchParams, key: keyof MilesplitRankingsQuery) {
  const value = searchParams.get(key);
  if (!value) {
    throw new Error(`Missing required query param: ${key}`);
  }
  return value;
}

function normalizeState(value: string) {
  const normalized = value.trim().toUpperCase();
  const aliases: Record<string, string> = {
    VIRGINIA: "VA",
    USA: "usa",
    NATIONAL: "usa",
    UNITED_STATES: "usa",
    "UNITED STATES": "usa",
  };

  return aliases[normalized] ?? normalized;
}

function normalizeLevel(value: string) {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "hs-girls": "high-school-girls",
    "high-school-girls": "high-school-girls",
    "high school girls": "high-school-girls",
    "hs-boys": "high-school-boys",
    "high-school-boys": "high-school-boys",
    "high school boys": "high-school-boys",
    "ms-girls": "middle-school-girls",
    "middle-school-girls": "middle-school-girls",
    "middle school girls": "middle-school-girls",
    "ms-boys": "middle-school-boys",
    "middle-school-boys": "middle-school-boys",
    "middle school boys": "middle-school-boys",
  };

  return aliases[normalized] ?? normalized;
}

function normalizeSeason(value: string) {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    outdoor: "outdoor-track-and-field",
    "outdoor-track-and-field": "outdoor-track-and-field",
    "outdoor track and field": "outdoor-track-and-field",
    indoor: "indoor-track-and-field",
    "indoor-track-and-field": "indoor-track-and-field",
    "indoor track and field": "indoor-track-and-field",
    xc: "cross-country",
    "cross-country": "cross-country",
    "cross country": "cross-country",
  };

  return aliases[normalized] ?? normalized;
}

function normalizeAccuracy(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    all: "all",
    fat: "fat",
  };

  return aliases[normalized] ?? normalized;
}

function normalizeGrade(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    all: "",
    sr: "senior",
    senior: "senior",
    jr: "junior",
    junior: "junior",
    so: "sophomore",
    sophomore: "sophomore",
    fr: "freshman",
    freshman: "freshman",
  };

  return aliases[normalized] ?? normalized;
}

function normalizeLeague(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "vhsl class 3": "3844",
  };

  return aliases[normalized] ?? value.trim();
}

function parseQuery(url: string): MilesplitRankingsQuery {
  const { searchParams } = new URL(url);

  return {
    state: normalizeState(getRequired(searchParams, "state")),
    level: normalizeLevel(getRequired(searchParams, "level")),
    season: normalizeSeason(getRequired(searchParams, "season")),
    year: searchParams.get("year") ?? undefined,
    accuracy: normalizeAccuracy(searchParams.get("accuracy")),
    grade: normalizeGrade(searchParams.get("grade")),
    league: normalizeLeague(searchParams.get("league")),
  };
}

export async function GET(req: Request) {
  try {
    const query = parseQuery(req.url);
    const data = await fetchMilesplitRankings(query);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch MileSplit rankings";
    const status = message.startsWith("Missing required query param:") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
