import { simulateHistoryJob } from "@/lib/history-sim-jobs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    const job = await simulateHistoryJob(jobId);
    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run simulation from resolved athletes";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
