import { z } from "zod";

const normalizedRegionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

const annotationTypeSchema = z
  .string()
  .transform((value) => {
    const raw = value.trim().toLowerCase();
    if (raw === "strength" || raw === "weakness") return raw;
    if (
      raw === "suggestion" ||
      raw === "improvement" ||
      raw === "improve"
    ) {
      return "suggestion";
    }
    return "suggestion";
  })
  .pipe(z.enum(["strength", "weakness", "suggestion"]));

export const annotationSchema = z.object({
  text: z.string().min(1),
  type: annotationTypeSchema,
  feedback: z.string().min(1),
  pageNumber: z.coerce.number().int().min(1).optional(),
  regions: z.array(normalizedRegionSchema).min(1).optional(),
});

export const feedbackResponseSchema = z.object({
  score: z.coerce.number().min(0).max(10),
  resumeLikelihood: z.coerce.number().min(0).max(1).optional(),
  overallFeedback: z.string().min(1),
  strengthsSummary: z.union([z.string(), z.null()]).optional().transform((v) => v ?? undefined),
  improvementsSummary: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => v ?? undefined),
  annotations: z.array(annotationSchema).min(1).max(25),
});

export type Annotation = z.infer<typeof annotationSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;

export type HighlightSegment = {
  text: string;
  annotation?: Annotation;
};
