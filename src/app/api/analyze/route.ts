import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { analyzeResume } from "@/lib/feedback";
import { renderPdfPageImages } from "@/lib/renderPdfPageImages";
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
import { validateResumePageCount } from "@/lib/validateResumePages";
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
    let fileFormat: ResumeFormat | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File is too large. Maximum size is 5 MB." },
          { status: 400 },
        );
      }

      fileFormat =
        getFormatFromMime(file.type) ?? getFormatFromName(file.name);

      if (!fileFormat) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF or DOCX." },
          { status: 400 },
        );
      }

      fileName = file.name;
      mimeType = file.type || "application/octet-stream";
      fileBuffer = Buffer.from(await file.arrayBuffer());

      const pageCheck = await validateResumePageCount(fileBuffer, fileFormat);
      if (!pageCheck.ok) {
        return NextResponse.json({ error: pageCheck.message }, { status: 400 });
      }

      resumeText = await extractTextFromFile(fileBuffer, fileFormat);
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
    let pageImages: Awaited<ReturnType<typeof renderPdfPageImages>> | undefined;
    if (fileBuffer && fileFormat === "pdf") {
      try {
        pageImages = await renderPdfPageImages(fileBuffer);
      } catch (renderErr) {
        console.error(
          "PDF page render for vision failed; analyzing with text only:",
          renderErr,
        );
      }
    }
    const feedback = await analyzeResume(resumeText, {
      jobContext,
      pageImages,
    });

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
