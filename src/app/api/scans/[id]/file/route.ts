import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getScanFileInfo } from "@/lib/scans";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const fileInfo = await getScanFileInfo(userId, id);
  if (!fileInfo) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const fileStat = await stat(fileInfo.filePath);
  const stream = createReadStream(fileInfo.filePath);
  const body = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(body, {
    headers: {
      "Content-Type": fileInfo.mimeType,
      "Content-Length": String(fileStat.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
