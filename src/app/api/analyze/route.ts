import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { analyzeResume } from "@/lib/feedback";
import { parseJobContextFromFormData } from "@/lib/jobContext";
import {
  extractTextFromFile,
  getFormatFromMime,
  getFormatFromName,
  type ResumeFormat,
} from "@/lib/parseResume";
import {
  consumeRateLimit,
  formatResetTime,
  getClientIp,
  rateLimitHeaders,
} from "@/lib/rateLimit";
import { saveScan } from "@/lib/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 30_000;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const rateLimit = await consumeRateLimit({
      ip: getClientIp(request),
      userId: session?.user?.id ?? null,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${rateLimit.limit} analyses per day). Try again after ${formatResetTime(rateLimit.resetAt)}.`,
          requiresAuth: false,
          resetAt: rateLimit.resetAt,
          limit: rateLimit.limit,
          remaining: 0,
        },
        { status: 429, headers: rateLimitHeaders(rateLimit) },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    let resumeText = "";
    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "";

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File is too large. Maximum size is 5 MB." },
          { status: 400 },
        );
      }

      const format: ResumeFormat | null =
        getFormatFromMime(file.type) ?? getFormatFromName(file.name);

      if (!format) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF or DOCX." },
          { status: 400 },
        );
      }

      fileName = file.name;
      mimeType = file.type || "application/octet-stream";
      fileBuffer = Buffer.from(await file.arrayBuffer());
      resumeText = await extractTextFromFile(fileBuffer, format);
    } else {
      return NextResponse.json(
        { error: "Upload a resume file." },
        { status: 400 },
      );
    }

    if (resumeText.length < 50) {
      return NextResponse.json(
        { error: "Resume text is too short to analyze meaningfully." },
        { status: 400 },
      );
    }

    if (resumeText.length > MAX_TEXT_CHARS) {
      resumeText = resumeText.slice(0, MAX_TEXT_CHARS);
    }

    const jobContext = parseJobContextFromFormData(formData);
    const feedback = await analyzeResume(resumeText, jobContext);

    let scanId: string | undefined;
    if (session?.user?.id && fileBuffer) {
      const saved = await saveScan(session.user.id, {
        fileName,
        mimeType,
        fileBuffer,
        resumeText,
        feedback,
      });
      scanId = saved.id;
    }

    return NextResponse.json(
      {
        resumeText,
        feedback,
        scanId,
        rateLimit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
          promptSignIn: rateLimit.promptSignIn,
        },
      },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    console.error("Analyze error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
