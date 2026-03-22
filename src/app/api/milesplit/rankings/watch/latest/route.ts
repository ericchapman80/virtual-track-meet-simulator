import { getLatestRankingsWatch } from "@/lib/rankings-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const athletes = (url.searchParams.get("athletes") ?? "")
      .split(",")
      .map((athlete) => athlete.trim())
      .filter(Boolean);

    if (athletes.length === 0) {
      throw new Error("Provide at least one athlete in the athletes query parameter.");
    }

    const data = await getLatestRankingsWatch({
      athletes,
      state: url.searchParams.get("state") ?? undefined,
      level: url.searchParams.get("level") ?? undefined,
      season: url.searchParams.get("season") ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch latest rankings watch";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
