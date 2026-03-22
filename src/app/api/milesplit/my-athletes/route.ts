import { createManagedAthlete, listManagedAthletes } from "@/lib/managed-athletes";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const athletes = await listManagedAthletes();
  return NextResponse.json({ athletes });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      teamHint?: string;
      state?: string;
      milesplitAthleteUrl?: string;
    };

    const athlete = await createManagedAthlete({
      name: body.name ?? "",
      teamHint: body.teamHint,
      state: body.state,
      milesplitAthleteUrl: body.milesplitAthleteUrl ?? "",
    });

    return NextResponse.json(athlete, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create managed athlete";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
