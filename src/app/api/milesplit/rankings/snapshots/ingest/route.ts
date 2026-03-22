import { fetchMilesplitRankingsTop10, type RankingsTrackerRequest } from "@/lib/milesplit";
import { saveRankingsSnapshot } from "@/lib/rankings-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = RankingsTrackerRequest & {
  label?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const exportData = await fetchMilesplitRankingsTop10(body);
    const snapshot = await saveRankingsSnapshot(exportData, { label: body.label ?? null });

    return NextResponse.json({
      snapshotId: snapshot.id,
      sourceUrl: snapshot.sourceUrl,
      label: snapshot.label,
      capturedAt: snapshot.capturedAt.toISOString(),
      totalEvents: snapshot.totalEvents,
      trackedAthletes: snapshot.trackedAthletes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest rankings snapshot";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
