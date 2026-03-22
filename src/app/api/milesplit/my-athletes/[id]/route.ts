import { deleteManagedAthlete } from "@/lib/managed-athletes";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteManagedAthlete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete managed athlete";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
