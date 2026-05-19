import { formatJobContextForPrompt, hasJobSearchContext } from "@/lib/jobContext";
import type { PageImageForVision } from "@/lib/renderPdfPageImages";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { parseFeedbackResponse } from "@/lib/parseFeedback";
import type { Annotation, FeedbackResponse } from "@/types/feedback";
import type { JobSearchContext } from "@/types/jobContext";

const BASE_SYSTEM_PROMPT = `You are an expert resume coach and hiring manager. Analyze the resume and return structured JSON feedback.

Rules:
- resumeLikelihood: number from 0 to 1 — how confident you are the document is a resume or CV (not a cover letter alone, job posting, article, invoice, form, transcript, etc.). Use 1.0 only when clearly a resume; 0 when clearly not a resume.
- score: number from 0 to 10 (one decimal allowed, e.g. 7.5). If resumeLikelihood is below 0.5, keep score low and say in overallFeedback that the file may not be a resume.
- overallFeedback: exactly 1-2 short sentences (under 45 words total). Brief holistic take — no lists, no paragraph-length prose.
- strengthsSummary: exactly 1-2 short sentences (under 40 words total) on what's working. Omit filler and repetition.
- improvementsSummary: exactly 1-2 short sentences (under 40 words total) on the top priorities to fix. Be direct.
- annotations: 8-15 items. Each must quote EXACT text copied verbatim from the resume (a phrase, bullet fragment, or section header — at least 3 characters). Do not paraphrase or invent text that is not in the resume.
- Do not flag spacing or formatting issues when the quoted text already has normal spaces between words (e.g. "University Aug 2026" is fine). Only flag spacing when words are genuinely run together in the quoted text.
- annotation.type: "strength" for strong content, "weakness" for clear problems, "suggestion" for improvements
- annotation.feedback: one concise sentence explaining why you flagged it

Writing style: scannable and tight. Every summary field must read like a quick note, not an essay. Put detailed critique in annotations, not in overallFeedback or the summaries.

Focus on: impact/metrics, clarity, formatting signals, keywords, weak verbs, gaps, length, and relevance. Be constructive and specific.

When job search context is provided, tailor the score, summaries, and annotations to that target role, companies, and industry.`;

const VISION_SYSTEM_ADDENDUM = `

You also receive JPEG images of each resume page (labeled by page number). Use them for layout, margins, columns, whitespace, visual hierarchy, and design — not only the extracted text.

When page images are provided, each annotation should include pageNumber (1-based) and regions when possible. regions must be an array of objects with numeric keys x, y, width, height (all 0–1, top-left origin). If unsure about boxes, omit regions and pageNumber but still include text, type, and feedback.

Return a single JSON object only (no markdown). Required keys: resumeLikelihood, score, overallFeedback, strengthsSummary, improvementsSummary, annotations.`;

export type AnalyzeResumeOptions = {
  jobContext?: JobSearchContext | null;
  pageImages?: PageImageForVision[];
};

function buildUserText(
  resumeText: string,
  jobContext: JobSearchContext | null | undefined,
  pageImages: PageImageForVision[] | undefined,
): string {
  const contextBlock =
    jobContext && hasJobSearchContext(jobContext)
      ? formatJobContextForPrompt(jobContext)
      : null;

  const visionNote = pageImages?.length
    ? `\n\nPage images follow (${pageImages.length} page(s)). Use them for layout feedback and for annotation pageNumber/regions.`
    : "";

  const keys = pageImages?.length
    ? "resumeLikelihood, score, overallFeedback, strengthsSummary, improvementsSummary, annotations (array of {text, type, feedback, pageNumber, regions})"
    : "resumeLikelihood, score, overallFeedback, strengthsSummary, improvementsSummary, annotations (array of {text, type, feedback})";

  if (contextBlock) {
    return `Analyze this resume and return JSON with keys: ${keys}. Keep overallFeedback, strengthsSummary, and improvementsSummary to 1-2 sentences each.${visionNote}

Job search context (tailor feedback to this):
${contextBlock}

--- RESUME TEXT (extracted) ---
${resumeText}
--- END ---`;
  }

  return `Analyze this resume and return JSON with keys: ${keys}. Keep overallFeedback, strengthsSummary, and improvementsSummary to 1-2 sentences each.${visionNote}

--- RESUME TEXT (extracted) ---
${resumeText}
--- END ---`;
}

function buildUserContent(
  resumeText: string,
  jobContext: JobSearchContext | null | undefined,
  pageImages?: PageImageForVision[],
): string | ChatCompletionContentPart[] {
  const text = buildUserText(resumeText, jobContext, pageImages);
  if (!pageImages?.length) {
    return text;
  }

  const parts: ChatCompletionContentPart[] = [{ type: "text", text }];

  for (const image of pageImages) {
    parts.push({
      type: "text",
      text: `[Resume page ${image.pageNumber} — ${image.width}×${image.height}px]`,
    });
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        // "auto" avoids flaky 401 model.request on some restricted keys with detail: "high"
        detail: "auto",
      },
    });
  }

  return parts;
}

function sanitizeAnnotations(
  annotations: Annotation[],
  pageCount: number,
): Annotation[] {
  return annotations.map((ann) => {
    if (!ann.pageNumber || !ann.regions?.length || pageCount < 1) {
      return { text: ann.text, type: ann.type, feedback: ann.feedback };
    }

    const pageNumber = Math.min(
      Math.max(1, Math.round(ann.pageNumber)),
      pageCount,
    );

    const regions = ann.regions
      .map((r) => ({
        x: Math.min(1, Math.max(0, r.x)),
        y: Math.min(1, Math.max(0, r.y)),
        width: Math.min(1, Math.max(0, r.width)),
        height: Math.min(1, Math.max(0, r.height)),
      }))
      .filter((r) => r.width >= 0.01 && r.height >= 0.01);

    if (regions.length === 0) {
      return { text: ann.text, type: ann.type, feedback: ann.feedback };
    }

    return { ...ann, pageNumber, regions };
  });
}

function isOpenAiPermissionError(error: unknown): boolean {
  const status =
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
      ? (error as { status: number }).status
      : null;
  if (status === 401 || status === 403) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("model.request") ||
    message.includes("insufficient permissions")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeResume(
  resumeText: string,
  options?: AnalyzeResumeOptions,
): Promise<FeedbackResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to a .env.local file in the project root.",
    );
  }

  const client = new OpenAI({ apiKey });
  const pageImages = options?.pageImages;

  async function requestFeedback(
    images: PageImageForVision[] | undefined,
  ): Promise<FeedbackResponse> {
    const systemPrompt =
      BASE_SYSTEM_PROMPT + (images?.length ? VISION_SYSTEM_ADDENDUM : "");

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: buildUserContent(resumeText, options?.jobContext, images),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("No response from the AI model.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("AI returned invalid JSON. Please try again.");
    }

    return parseFeedbackResponse(parsed);
  }

  async function requestWithRetries(
    images: PageImageForVision[] | undefined,
    maxAttempts: number,
  ): Promise<FeedbackResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await requestFeedback(images);
      } catch (error) {
        lastError = error;
        const message =
          error instanceof Error ? error.message : String(error);
        if (message.includes("expected format") && attempt + 1 < maxAttempts) {
          continue;
        }
        if (
          images?.length &&
          isOpenAiPermissionError(error) &&
          attempt + 1 < maxAttempts
        ) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  let feedback: FeedbackResponse;
  let usedVision = Boolean(pageImages?.length);

  try {
    feedback = await requestWithRetries(pageImages, 3);
  } catch (visionErr) {
    if (!pageImages?.length || !isOpenAiPermissionError(visionErr)) {
      throw visionErr;
    }
    console.warn(
      "Vision analyze failed (API permissions); falling back to text-only:",
      visionErr,
    );
    usedVision = false;
    feedback = await requestWithRetries(undefined, 2);
  }

  const pageCount = usedVision ? (pageImages?.length ?? 0) : 0;
  if (pageCount > 0) {
    return {
      ...feedback,
      annotations: sanitizeAnnotations(feedback.annotations, pageCount),
    };
  }

  return feedback;
}
