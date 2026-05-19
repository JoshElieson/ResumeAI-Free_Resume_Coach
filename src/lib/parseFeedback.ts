import {
  feedbackResponseSchema,
  type Annotation,
  type FeedbackResponse,
} from "@/types/feedback";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1 && value <= 100) return value / 100;
  return Math.min(1, Math.max(0, value));
}

function normalizeAnnotationType(value: unknown): Annotation["type"] {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "strength" || raw === "weakness") return raw;
  if (raw === "suggestion" || raw === "improvement" || raw === "improve") {
    return "suggestion";
  }
  return "suggestion";
}

function normalizeRegions(value: unknown): Annotation["regions"] {
  if (!Array.isArray(value)) return undefined;

  const regions = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const x = clamp01(Number(r.x ?? r.left ?? 0));
      const y = clamp01(Number(r.y ?? r.top ?? 0));
      const width = clamp01(Number(r.width ?? r.w ?? 0));
      const height = clamp01(Number(r.height ?? r.h ?? 0));
      if (width < 0.01 || height < 0.01) return null;
      return { x, y, width, height };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return regions.length > 0 ? regions : undefined;
}

function normalizeAnnotation(value: unknown): Annotation | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  const text = String(a.text ?? a.quote ?? "").trim();
  const feedback = String(a.feedback ?? a.comment ?? a.note ?? "").trim();
  if (!text || !feedback) return null;

  const pageRaw = a.pageNumber ?? a.page;
  const pageNumber =
    pageRaw === undefined || pageRaw === null
      ? undefined
      : Math.max(1, Math.round(Number(pageRaw)));

  return {
    text,
    type: normalizeAnnotationType(a.type),
    feedback,
    pageNumber: Number.isFinite(pageNumber) ? pageNumber : undefined,
    regions: normalizeRegions(a.regions ?? a.bbox ?? a.boxes),
  };
}

/** Coerce common model JSON shapes into our feedback schema input. */
export function normalizeFeedbackPayload(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;

  let root = parsed as Record<string, unknown>;
  if (root.feedback && typeof root.feedback === "object") {
    root = root.feedback as Record<string, unknown>;
  }
  if (root.data && typeof root.data === "object") {
    root = root.data as Record<string, unknown>;
  }

  const annotationsRaw = root.annotations ?? root.notes ?? root.highlights;
  const annotations = Array.isArray(annotationsRaw)
    ? annotationsRaw
        .map(normalizeAnnotation)
        .filter((a): a is Annotation => a !== null)
    : [];

  const scoreRaw = root.score ?? root.resumeScore ?? root.rating;
  const likelihoodRaw =
    root.resumeLikelihood ?? root.resume_likelihood ?? root.isResume;

  return {
    score: scoreRaw,
    resumeLikelihood:
      typeof likelihoodRaw === "boolean"
        ? likelihoodRaw
          ? 1
          : 0
        : likelihoodRaw,
    overallFeedback:
      root.overallFeedback ?? root.overall_feedback ?? root.summary ?? "",
    strengthsSummary:
      root.strengthsSummary ?? root.strengths_summary ?? root.strengths,
    improvementsSummary:
      root.improvementsSummary ??
      root.improvements_summary ??
      root.improvements,
    annotations,
  };
}

export function parseFeedbackResponse(parsed: unknown): FeedbackResponse {
  const normalized = normalizeFeedbackPayload(parsed);
  const result = feedbackResponseSchema.safeParse(normalized);
  if (!result.success) {
    console.error("Feedback schema validation failed:", result.error.flatten());
    throw new Error(
      "AI response did not match the expected format. Please try again.",
    );
  }
  return result.data;
}
