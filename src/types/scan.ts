import type { FeedbackResponse } from "@/types/feedback";

export type ScanSummary = {
  id: string;
  fileName: string;
  mimeType: string;
  score: number;
  createdAt: string;
};

export type ScanRecord = ScanSummary & {
  resumeText: string;
  feedback: FeedbackResponse;
};
