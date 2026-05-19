import { NextResponse } from "next/server";
import { listScans } from "@/lib/scans";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const scans = await listScans(userId);
  return NextResponse.json({ scans });
}
