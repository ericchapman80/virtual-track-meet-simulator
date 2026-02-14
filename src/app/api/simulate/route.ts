import { runSprintMonteCarlo } from "@/lib/simulation";
import { SimulationRequest } from "@/types/simulation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SimulationRequest;
    const iterations = body.iterations ?? 1000;
    const results = runSprintMonteCarlo(body.entries, iterations);

    return NextResponse.json({ iterations, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
