export type ScoreTier = {
  label: string;
  color: string;
};

/** Index 0–10 maps to score floor (0 = Terrible … 10 = Exceptional). */
export const SCORE_SCALE: readonly ScoreTier[] = [
  { label: "Terrible", color: "#B42318" },
  { label: "Very Poor", color: "#C4320A" },
  { label: "Poor", color: "#CA6A04" },
  { label: "Weak", color: "#B45309" },
  { label: "Below Average", color: "#92710C" },
  { label: "Fair", color: "#6B7C1E" },
  { label: "Good", color: "#3F7A4A" },
  { label: "Strong", color: "#2F6B4F" },
  { label: "Excellent", color: "#2F5D50" },
  { label: "Outstanding", color: "#285247" },
  { label: "Exceptional", color: "#1F4A3F" },
] as const;

export function getScoreTier(score: number): ScoreTier {
  const index = Math.min(10, Math.max(0, Math.floor(score)));
  return SCORE_SCALE[index];
}

export function scoreBarGlow(color: string): string {
  return `0 1px 3px ${color}33`;
}
