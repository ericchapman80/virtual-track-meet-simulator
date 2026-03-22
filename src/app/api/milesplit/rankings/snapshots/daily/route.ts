import { fetchMilesplitRankingsTop10, type RankingsTrackerRequest } from "@/lib/milesplit";
import { saveRankingsSnapshot } from "@/lib/rankings-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DailyJob = RankingsTrackerRequest & {
  label?: string;
};

type RequestBody = {
  jobs: DailyJob[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const jobs = body.jobs ?? [];

    if (jobs.length === 0) {
      throw new Error("Provide at least one daily ingestion job.");
    }

    const results = [];

    for (const job of jobs) {
      const exportData = await fetchMilesplitRankingsTop10(job);
      const snapshot = await saveRankingsSnapshot(exportData, { label: job.label ?? null });

      results.push({
        snapshotId: snapshot.id,
        label: snapshot.label,
        sourceUrl: snapshot.sourceUrl,
        capturedAt: snapshot.capturedAt.toISOString(),
        totalEvents: snapshot.totalEvents,
      });
    }

    return NextResponse.json({
      ranAt: new Date().toISOString(),
      jobsProcessed: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run daily rankings ingestion";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
