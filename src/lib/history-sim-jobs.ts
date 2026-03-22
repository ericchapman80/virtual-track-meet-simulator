import { prisma } from "@/lib/prisma";
import {
  computeCompetitionResults,
  parseParticipants,
  resolveMilesplitEventSeeds,
  type MilesplitAthleteProgressRow,
  type MilesplitEventSimulationExport,
  type MilesplitEventSimulationRequest,
  type MilesplitSimulationProgress,
} from "@/lib/milesplit";
import { Prisma } from "@prisma/client";

function toJsonInput(value: Prisma.InputJsonValue | null) {
  return value === null ? Prisma.JsonNull : value;
}

export type HistorySimulationJobResponse = {
  id: string;
  status: string;
  progressMessage: string | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  requestPayload: MilesplitEventSimulationRequest;
  resultPayload: MilesplitEventSimulationExport | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  athletes: Array<{
    id: string;
    sortOrder: number;
    requestedName: string;
    teamHint: string | null;
    status: string;
    resolvedName: string | null;
    athleteUrl: string | null;
    team: string | null;
    confidence: string | null;
    personalRecord: number | null;
    previousSeasonAverage: number | null;
    seasonAverage: number | null;
    allTimeAverage: number | null;
    seedPerformance: number | null;
    seedBasis: string | null;
    stdDev: number | null;
    notes: string[];
    reason: string | null;
    searchMatches: Prisma.JsonValue | null;
  }>;
};

async function loadJob(jobId: string) {
  return prisma.historySimulationJob.findUnique({
    where: { id: jobId },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

function toJobResponse(job: NonNullable<Awaited<ReturnType<typeof loadJob>>>): HistorySimulationJobResponse {
  return {
    id: job.id,
    status: job.status,
    progressMessage: job.progressMessage,
    progressCurrent: job.progressCurrent,
    progressTotal: job.progressTotal,
    requestPayload: job.requestPayload as MilesplitEventSimulationRequest,
    resultPayload: job.resultPayload as MilesplitEventSimulationExport | null,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    athletes: job.athletes.map((athlete) => ({
      id: athlete.id,
      sortOrder: athlete.sortOrder,
      requestedName: athlete.requestedName,
      teamHint: athlete.teamHint,
      status: athlete.status,
      resolvedName: athlete.resolvedName,
      athleteUrl: athlete.athleteUrl,
      team: athlete.team,
      confidence: athlete.confidence,
      personalRecord: athlete.personalRecord,
      previousSeasonAverage: athlete.previousSeasonAverage,
      seasonAverage: athlete.seasonAverage,
      allTimeAverage: athlete.allTimeAverage,
      seedPerformance: athlete.seedPerformance,
      seedBasis: athlete.seedBasis,
      stdDev: athlete.stdDev,
      notes: athlete.notes,
      reason: athlete.reason,
      searchMatches: athlete.searchMatches,
    })),
  };
}

export async function createHistorySimulationJob(request: MilesplitEventSimulationRequest) {
  const participants = parseParticipants(request);

  const job = await prisma.historySimulationJob.create({
    data: {
      status: "queued",
      progressMessage: "Queued",
      requestPayload: request as Prisma.InputJsonValue,
      athletes: {
        create: participants.map((participant, index) => ({
          sortOrder: index,
          requestedName: participant.requestedName,
          teamHint: participant.teamHint ?? null,
          status: "queued",
          notes: [],
        })),
      },
    },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toJobResponse(job);
}

export async function getHistorySimulationJob(jobId: string) {
  const job = await loadJob(jobId);
  return job ? toJobResponse(job) : null;
}

function mergeManualMatches(
  existing: MilesplitEventSimulationRequest["manualMatches"],
  incoming: MilesplitEventSimulationRequest["manualMatches"],
) {
  const merged = new Map<string, NonNullable<MilesplitEventSimulationRequest["manualMatches"]>[number]>();

  for (const match of existing ?? []) {
    merged.set(`${match.requestedName.toLowerCase()}|${(match.teamHint ?? "").toLowerCase()}`, match);
  }

  for (const match of incoming ?? []) {
    merged.set(`${match.requestedName.toLowerCase()}|${(match.teamHint ?? "").toLowerCase()}`, match);
  }

  return Array.from(merged.values());
}

export async function updateHistorySimulationJobProgress(jobId: string, progress: MilesplitSimulationProgress, status = "resolving") {
  const job = await prisma.historySimulationJob.update({
    where: { id: jobId },
    data: {
      status,
      progressMessage: progress.message,
      progressCurrent: progress.current ?? null,
      progressTotal: progress.total ?? null,
    },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toJobResponse(job);
}

export async function upsertHistorySimulationJobAthlete(jobId: string, row: MilesplitAthleteProgressRow) {
  await prisma.historySimulationJobAthlete.upsert({
    where: {
      jobId_sortOrder: {
        jobId,
        sortOrder: row.sortOrder,
      },
    },
    update: {
      requestedName: row.requestedName,
      teamHint: row.teamHint ?? null,
      status: row.status,
      resolvedName: row.resolvedName ?? null,
      athleteUrl: row.athleteUrl ?? null,
      team: row.team ?? null,
      confidence: row.confidence ?? null,
      personalRecord: row.personalRecord ?? null,
      previousSeasonAverage: row.previousSeasonAverage ?? null,
      seasonAverage: row.seasonAverage ?? null,
      allTimeAverage: row.allTimeAverage ?? null,
      seedPerformance: row.seedPerformance ?? null,
      seedBasis: row.seedBasis ?? null,
      stdDev: row.stdDev ?? null,
      notes: row.notes ?? [],
      reason: row.reason ?? null,
      searchMatches: toJsonInput((row.searchMatches ?? null) as Prisma.InputJsonValue | null),
    },
    create: {
      jobId,
      sortOrder: row.sortOrder,
      requestedName: row.requestedName,
      teamHint: row.teamHint ?? null,
      status: row.status,
      resolvedName: row.resolvedName ?? null,
      athleteUrl: row.athleteUrl ?? null,
      team: row.team ?? null,
      confidence: row.confidence ?? null,
      personalRecord: row.personalRecord ?? null,
      previousSeasonAverage: row.previousSeasonAverage ?? null,
      seasonAverage: row.seasonAverage ?? null,
      allTimeAverage: row.allTimeAverage ?? null,
      seedPerformance: row.seedPerformance ?? null,
      seedBasis: row.seedBasis ?? null,
      stdDev: row.stdDev ?? null,
      notes: row.notes ?? [],
      reason: row.reason ?? null,
      searchMatches: toJsonInput((row.searchMatches ?? null) as Prisma.InputJsonValue | null),
    },
  });
}

export async function markHistorySimulationJobResolved(jobId: string, result: MilesplitEventSimulationExport) {
  const job = await prisma.historySimulationJob.update({
    where: { id: jobId },
    data: {
      status: "resolved",
      progressMessage: result.canSimulate ? "Resolution complete; ready to simulate" : "Resolution complete",
      progressCurrent: result.entrants.length,
      progressTotal: result.participantsRequested.length,
      resultPayload: result as Prisma.InputJsonValue,
      errorMessage: null,
    },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toJobResponse(job);
}

export async function markHistorySimulationJobComplete(jobId: string, result: MilesplitEventSimulationExport) {
  const job = await prisma.historySimulationJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      progressMessage: "Simulation complete",
      progressCurrent: result.entrants.length,
      progressTotal: result.participantsRequested.length,
      resultPayload: result as Prisma.InputJsonValue,
      completedAt: new Date(),
      errorMessage: null,
    },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toJobResponse(job);
}

export async function markHistorySimulationJobFailed(jobId: string, errorMessage: string) {
  const job = await prisma.historySimulationJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      errorMessage,
      progressMessage: errorMessage,
      completedAt: new Date(),
    },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toJobResponse(job);
}

export function runHistoryResolutionJobInBackground(jobId: string, request: MilesplitEventSimulationRequest) {
  void (async () => {
    try {
      await updateHistorySimulationJobProgress(jobId, { message: "Starting resolution" }, "resolving");
      const result = await resolveMilesplitEventSeeds(request, {
        concurrency: 2,
        onProgress: async (progress) => {
          await updateHistorySimulationJobProgress(jobId, progress, "resolving");
        },
        onAthleteProgress: async (row) => {
          await upsertHistorySimulationJobAthlete(jobId, row);
        },
      });
      await markHistorySimulationJobResolved(jobId, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "History simulation failed";
      await markHistorySimulationJobFailed(jobId, message);
    }
  })();
}

export async function rerunHistoryResolutionJob(
  jobId: string,
  patch: Pick<MilesplitEventSimulationRequest, "manualMatches">,
) {
  const existingJob = await loadJob(jobId);
  if (!existingJob) {
    throw new Error("History simulation job not found");
  }

  const existingRequest = existingJob.requestPayload as MilesplitEventSimulationRequest;
  const nextRequest: MilesplitEventSimulationRequest = {
    ...existingRequest,
    manualMatches: mergeManualMatches(existingRequest.manualMatches, patch.manualMatches),
  };

  const job = await prisma.historySimulationJob.update({
    where: { id: jobId },
    data: {
      status: "resolving",
      progressMessage: "Re-running resolution with selected athlete override",
      progressCurrent: 0,
      progressTotal: existingJob.athletes.length,
      requestPayload: nextRequest as Prisma.InputJsonValue,
      errorMessage: null,
      completedAt: null,
    },
    include: {
      athletes: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  runHistoryResolutionJobInBackground(jobId, nextRequest);
  return toJobResponse(job);
}

export async function simulateHistoryJob(jobId: string) {
  const job = await loadJob(jobId);
  if (!job) {
    throw new Error("History simulation job not found");
  }

  const worksheet = job.resultPayload as MilesplitEventSimulationExport | null;
  if (!worksheet) {
    throw new Error("Resolve athletes first before running the simulation.");
  }

  if (!worksheet.canSimulate) {
    throw new Error("Not enough resolved athletes with usable history to run the simulation.");
  }

  await updateHistorySimulationJobProgress(jobId, { message: "Running simulation" }, "simulating");
  const results = computeCompetitionResults(worksheet.entrants, worksheet.eventType, worksheet.iterations);
  return markHistorySimulationJobComplete(jobId, {
    ...worksheet,
    results,
    warningMessage: null,
  });
}
