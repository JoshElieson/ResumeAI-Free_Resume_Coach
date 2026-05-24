import type { FeedbackResponse } from "@/types/feedback";

type Props = {
  feedback: FeedbackResponse;
  className?: string;
};

export function OverallFeedbackCard({ feedback, className = "" }: Props) {
  return (
    <div className={`app-card p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground">Overall feedback</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {feedback.overallFeedback}
      </p>
      {feedback.strengthsSummary && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Strengths
          </p>
          <p className="mt-1 text-sm text-emerald-900/90">
            {feedback.strengthsSummary}
          </p>
        </div>
      )}
      {feedback.improvementsSummary && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Priorities
          </p>
          <p className="mt-1 text-sm text-amber-900/90">
            {feedback.improvementsSummary}
          </p>
        </div>
      )}
    </div>
  );
}
