export type ScoreTier = {
  label: string;
  color: string;
};

/** Index 0–10 maps to score floor (0 = Terrible … 10 = Exceptional). */
export const SCORE_SCALE: readonly ScoreTier[] = [
  { label: "Terrible", color: "#DC2626" },
  { label: "Very Poor", color: "#EA580C" },
  { label: "Poor", color: "#F97316" },
  { label: "Weak", color: "#F59E0B" },
  { label: "Below Average", color: "#EAB308" },
  { label: "Fair", color: "#84CC16" },
  { label: "Good", color: "#22C55E" },
  { label: "Strong", color: "#10B981" },
  { label: "Excellent", color: "#06B6D4" },
  { label: "Outstanding", color: "#3B82F6" },
  { label: "Exceptional", color: "#8B5CF6" },
] as const;

export function getScoreTier(score: number): ScoreTier {
  const index = Math.min(10, Math.max(0, Math.floor(score)));
  return SCORE_SCALE[index];
}

export function scoreBarGlow(color: string): string {
  return `0 0 12px -2px ${color}99`;
}
