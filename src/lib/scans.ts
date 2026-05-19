import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { FeedbackResponse } from "@/types/feedback";
import type { ScanRecord, ScanSummary } from "@/types/scan";

const SCANS_ROOT = path.join(process.cwd(), ".data", "scans");

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function userRoot(userId: string): string {
  return path.join(SCANS_ROOT, safeUserId(userId));
}

function scanRoot(userId: string, scanId: string): string {
  const safeId = scanId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(userRoot(userId), safeId);
}

function metaPath(userId: string, scanId: string): string {
  return path.join(scanRoot(userId, scanId), "meta.json");
}

function resumePath(userId: string, scanId: string, fileName: string): string {
  const ext = path.extname(fileName) || ".bin";
  return path.join(scanRoot(userId, scanId), `resume${ext}`);
}

export async function saveScan(
  userId: string,
  input: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    resumeText: string;
    feedback: FeedbackResponse;
  },
): Promise<ScanSummary> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const dir = scanRoot(userId, id);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    resumePath(userId, id, input.fileName),
    input.fileBuffer,
  );

  const record: ScanRecord = {
    id,
    fileName: input.fileName,
    mimeType: input.mimeType || "application/octet-stream",
    score: input.feedback.score,
    createdAt,
    resumeText: input.resumeText,
    feedback: input.feedback,
  };

  await fs.writeFile(metaPath(userId, id), JSON.stringify(record), "utf-8");

  return {
    id: record.id,
    fileName: record.fileName,
    mimeType: record.mimeType,
    score: record.score,
    createdAt: record.createdAt,
  };
}

export async function listScans(userId: string): Promise<ScanSummary[]> {
  const root = userRoot(userId);
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return [];
  }

  const scans: ScanSummary[] = [];
  for (const entry of entries) {
    try {
      const raw = await fs.readFile(
        path.join(root, entry, "meta.json"),
        "utf-8",
      );
      const record = JSON.parse(raw) as ScanRecord;
      scans.push({
        id: record.id,
        fileName: record.fileName,
        mimeType: record.mimeType,
        score: record.score,
        createdAt: record.createdAt,
      });
    } catch {
      // skip invalid entries
    }
  }

  return scans.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getScan(
  userId: string,
  scanId: string,
): Promise<ScanRecord | null> {
  try {
    const raw = await fs.readFile(metaPath(userId, scanId), "utf-8");
    return JSON.parse(raw) as ScanRecord;
  } catch {
    return null;
  }
}

export async function deleteScan(
  userId: string,
  scanId: string,
): Promise<boolean> {
  const record = await getScan(userId, scanId);
  if (!record) return false;

  try {
    await fs.rm(scanRoot(userId, scanId), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function getScanFileInfo(
  userId: string,
  scanId: string,
): Promise<{ filePath: string; fileName: string; mimeType: string } | null> {
  const record = await getScan(userId, scanId);
  if (!record) return null;

  const filePath = resumePath(userId, scanId, record.fileName);
  try {
    await fs.access(filePath);
    return {
      filePath,
      fileName: record.fileName,
      mimeType: record.mimeType,
    };
  } catch {
    return null;
  }
}
