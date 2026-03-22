import { prisma } from "@/lib/prisma";

export type ManagedAthleteInput = {
  name: string;
  teamHint?: string;
  state?: string;
  milesplitAthleteUrl: string;
};

export type ManagedAthleteRecord = {
  id: string;
  name: string;
  teamHint: string | null;
  state: string | null;
  milesplitAthleteUrl: string;
  createdAt: string;
  updatedAt: string;
};

function clean(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value: string | null | undefined) {
  return clean(value).toLowerCase();
}

function toRecord(entry: {
  id: string;
  name: string;
  teamHint: string | null;
  state: string | null;
  milesplitAthleteUrl: string;
  createdAt: Date;
  updatedAt: Date;
}): ManagedAthleteRecord {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function listManagedAthletes() {
  const entries = await prisma.managedAthlete.findMany({
    orderBy: [{ name: "asc" }, { teamHint: "asc" }],
  });

  return entries.map(toRecord);
}

export async function createManagedAthlete(input: ManagedAthleteInput) {
  const name = clean(input.name);
  const milesplitAthleteUrl = clean(input.milesplitAthleteUrl);
  const teamHint = clean(input.teamHint);
  const state = clean(input.state).toUpperCase();

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!milesplitAthleteUrl || !/^https:\/\/([a-z]{2}\.)?milesplit\.com\/athletes\//i.test(milesplitAthleteUrl)) {
    throw new Error("Provide a valid MileSplit athlete profile URL.");
  }

  const created = await prisma.managedAthlete.create({
    data: {
      name,
      teamHint: teamHint || null,
      state: state || null,
      milesplitAthleteUrl,
    },
  });

  return toRecord(created);
}

export async function deleteManagedAthlete(id: string) {
  await prisma.managedAthlete.delete({
    where: { id },
  });
}

export async function findManagedAthleteMatch(name: string, teamHint?: string) {
  const normalizedName = normalize(name);
  if (!normalizedName) {
    return null;
  }

  const candidates = await prisma.managedAthlete.findMany({
    where: {
      name: {
        equals: clean(name),
        mode: "insensitive",
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  if (candidates.length === 0) {
    return null;
  }

  const normalizedTeamHint = normalize(teamHint);
  if (normalizedTeamHint) {
    const teamMatch = candidates.find((candidate) => normalize(candidate.teamHint).includes(normalizedTeamHint));
    if (teamMatch) {
      return {
        athlete: teamMatch.name,
        athleteUrl: teamMatch.milesplitAthleteUrl,
        team: teamMatch.teamHint ?? "",
        previewMark: teamMatch.state ?? "",
      };
    }
  }

  if (candidates.length === 1) {
    const candidate = candidates[0];
    return {
      athlete: candidate.name,
      athleteUrl: candidate.milesplitAthleteUrl,
      team: candidate.teamHint ?? "",
      previewMark: candidate.state ?? "",
    };
  }

  return null;
}
