import {
  createHistorySimulationJob,
  runHistoryResolutionJobInBackground,
} from "@/lib/history-sim-jobs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  event: string;
  participants?: string[];
  participantText?: string;
  searchState?: string;
  season?: string;
  iterations?: number;
  historyLimit?: number;
  seedStrategy?: "previous-season" | "current-season" | "all-time";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const job = await createHistorySimulationJob(body);
    runHistoryResolutionJobInBackground(job.id, body);

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue MileSplit event simulation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
