import { fetchMilesplitRankingsTop10 } from "@/lib/milesplit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  queryUrl?: string;
  filters?: {
    state: string;
    level: string;
    season: string;
    year?: string;
    accuracy?: string;
    grade?: string;
    league?: string;
  };
  trackedAthletes?: string[];
  limit?: number;
  eventLimit?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const data = await fetchMilesplitRankingsTop10(body);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch MileSplit top 10 rankings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
