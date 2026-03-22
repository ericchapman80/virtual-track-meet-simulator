import { DEFAULT_VIRGINIA_RANKINGS_QUERY, fetchMilesplitRankings } from "@/lib/milesplit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchMilesplitRankings(DEFAULT_VIRGINIA_RANKINGS_QUERY);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch MileSplit rankings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
