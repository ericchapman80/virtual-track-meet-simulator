import { prisma } from "@/lib/prisma";
import type { RankingsTrackerExport } from "@/lib/milesplit";

export type StoredSnapshotSummary = {
  id: string;
  label: string | null;
  sourceUrl: string;
  state: string;
  level: string;
  season: string;
  year: string | null;
  accuracy: string | null;
  grade: string | null;
  league: string | null;
  capturedAt: string;
  totalEvents: number;
  trackedAthletes: string[];
};

export type LatestRankingsWatchResponse = {
  snapshot: StoredSnapshotSummary | null;
  athletes: Array<{
    athlete: string;
    matches: Array<{
      section: string;
      event: string;
      rank: number;
      mark: string;
      team: string | null;
      grade: string | null;
      meet: string | null;
      date: string | null;
      eventUrl: string;
      athleteUrl: string | null;
    }>;
  }>;
};

type SnapshotQuery = {
  state: string;
  level: string;
  season: string;
  year: string | null;
  accuracy: string | null;
  grade: string | null;
  league: string | null;
};

function cleanString(value: string | null) {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSourceUrl(sourceUrl: string): SnapshotQuery {
  const url = new URL(sourceUrl);
  const state = url.hostname.split(".")[0].toUpperCase() === "WWW" ? "USA" : url.hostname.split(".")[0].toUpperCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  const level = pathParts[2] ?? "";
  const season = pathParts[3] ?? "";

  return {
    state,
    level,
    season,
    year: cleanString(url.searchParams.get("year")),
    accuracy: cleanString(url.searchParams.get("accuracy")),
    grade: cleanString(url.searchParams.get("grade")),
    league: cleanString(url.searchParams.get("league")),
  };
}

export async function saveRankingsSnapshot(
  exportData: RankingsTrackerExport,
  options?: { label?: string | null },
) {
  const parsed = parseSourceUrl(exportData.sourceUrl);

  return prisma.rankingsSnapshot.upsert({
    where: { sourceUrl: exportData.sourceUrl },
    update: {
      label: options?.label ?? null,
      state: parsed.state,
      level: parsed.level,
      season: parsed.season,
      year: parsed.year,
      accuracy: parsed.accuracy,
      grade: parsed.grade,
      league: parsed.league,
      capturedAt: new Date(exportData.exportedAt),
      totalEvents: exportData.totalEvents,
      trackedAthletes: exportData.trackedAthletes,
      eventGroups: {
        deleteMany: {},
        create: exportData.eventGroups.map((group, index) => ({
          section: group.section,
          event: group.event,
          eventUrl: group.eventUrl,
          sortOrder: index,
          entries: {
            create: group.rows.map((row) => ({
              rank: row.rank,
              mark: row.mark,
              wind: cleanString(row.wind),
              athlete: row.athlete,
              athleteUrl: cleanString(row.athleteUrl),
              team: cleanString(row.team),
              teamUrl: cleanString(row.teamUrl),
              grade: cleanString(row.grade),
              meet: cleanString(row.meet),
              meetUrl: cleanString(row.meetUrl),
              place: cleanString(row.place),
              date: cleanString(row.date),
            })),
          },
        })),
      },
    },
    create: {
      label: options?.label ?? null,
      sourceUrl: exportData.sourceUrl,
      state: parsed.state,
      level: parsed.level,
      season: parsed.season,
      year: parsed.year,
      accuracy: parsed.accuracy,
      grade: parsed.grade,
      league: parsed.league,
      capturedAt: new Date(exportData.exportedAt),
      totalEvents: exportData.totalEvents,
      trackedAthletes: exportData.trackedAthletes,
      eventGroups: {
        create: exportData.eventGroups.map((group, index) => ({
          section: group.section,
          event: group.event,
          eventUrl: group.eventUrl,
          sortOrder: index,
          entries: {
            create: group.rows.map((row) => ({
              rank: row.rank,
              mark: row.mark,
              wind: cleanString(row.wind),
              athlete: row.athlete,
              athleteUrl: cleanString(row.athleteUrl),
              team: cleanString(row.team),
              teamUrl: cleanString(row.teamUrl),
              grade: cleanString(row.grade),
              meet: cleanString(row.meet),
              meetUrl: cleanString(row.meetUrl),
              place: cleanString(row.place),
              date: cleanString(row.date),
            })),
          },
        })),
      },
    },
    include: {
      eventGroups: {
        include: {
          entries: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getLatestRankingsWatch(params: {
  athletes: string[];
  state?: string;
  level?: string;
  season?: string;
}) {
  const snapshot = await prisma.rankingsSnapshot.findFirst({
    where: {
      ...(params.state ? { state: params.state.toUpperCase() } : {}),
      ...(params.level ? { level: params.level } : {}),
      ...(params.season ? { season: params.season } : {}),
    },
    include: {
      eventGroups: {
        include: {
          entries: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { capturedAt: "desc" },
  });

  if (!snapshot) {
    return {
      snapshot: null,
      athletes: params.athletes.map((athlete) => ({ athlete, matches: [] })),
    } satisfies LatestRankingsWatchResponse;
  }

  const athleteMatches = params.athletes.map((athlete) => {
    const normalized = athlete.trim().toLowerCase();
    const matches = snapshot.eventGroups.flatMap((group) =>
      group.entries
        .filter((entry) => entry.athlete.trim().toLowerCase() === normalized)
        .map((entry) => ({
          section: group.section,
          event: group.event,
          rank: entry.rank,
          mark: entry.mark,
          team: entry.team,
          grade: entry.grade,
          meet: entry.meet,
          date: entry.date,
          eventUrl: group.eventUrl,
          athleteUrl: entry.athleteUrl,
        })),
    );

    return {
      athlete,
      matches,
    };
  });

  return {
    snapshot: {
      id: snapshot.id,
      label: snapshot.label,
      sourceUrl: snapshot.sourceUrl,
      state: snapshot.state,
      level: snapshot.level,
      season: snapshot.season,
      year: snapshot.year,
      accuracy: snapshot.accuracy,
      grade: snapshot.grade,
      league: snapshot.league,
      capturedAt: snapshot.capturedAt.toISOString(),
      totalEvents: snapshot.totalEvents,
      trackedAthletes: snapshot.trackedAthletes,
    },
    athletes: athleteMatches,
  } satisfies LatestRankingsWatchResponse;
}
