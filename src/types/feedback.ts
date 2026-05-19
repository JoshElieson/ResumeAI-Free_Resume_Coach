import { z } from "zod";

export const annotationSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["strength", "weakness", "suggestion"]),
  feedback: z.string().min(1),
});

export const feedbackResponseSchema = z.object({
  score: z.number().min(0).max(10),
  overallFeedback: z.string().min(1),
  strengthsSummary: z.string().optional(),
  improvementsSummary: z.string().optional(),
  annotations: z.array(annotationSchema).min(1).max(25),
});

export type Annotation = z.infer<typeof annotationSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;

export type HighlightSegment = {
  text: string;
  annotation?: Annotation;
};
