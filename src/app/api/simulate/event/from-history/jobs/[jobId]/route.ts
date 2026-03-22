import { getHistorySimulationJob, rerunHistoryResolutionJob } from "@/lib/history-sim-jobs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    const job = await getHistorySimulationJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "History simulation job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history simulation job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    const body = (await req.json()) as {
      manualMatches?: Array<{
        requestedName: string;
        teamHint?: string;
        athleteUrl: string;
      }>;
    };

    const job = await rerunHistoryResolutionJob(jobId, {
      manualMatches: body.manualMatches ?? [],
    });

    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to re-run history simulation job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
