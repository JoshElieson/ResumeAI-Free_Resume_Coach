import { NextRequest, NextResponse } from "next/server";
import { deleteScan, getScan } from "@/lib/scans";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const scan = await getScan(userId, id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }

  return NextResponse.json({ scan });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteScan(userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
