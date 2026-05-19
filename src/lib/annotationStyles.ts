import type { Annotation } from "@/types/feedback";

export const ANNOTATION_STYLES: Record<
  Annotation["type"],
  {
    label: string;
    fill: string;
    fillActive: string;
    /** Opaque swatch for legend UI (avoids corner bleed on gradients). */
    legendFill: string;
    ring: string;
    badge: string;
  }
> = {
  strength: {
    label: "Strength",
    fill: "rgba(52, 211, 153, 0.28)",
    fillActive: "rgba(52, 211, 153, 0.48)",
    legendFill: "rgb(32, 120, 90)",
    ring: "rgb(52, 211, 153)",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  weakness: {
    label: "Needs work",
    fill: "rgba(251, 113, 133, 0.28)",
    fillActive: "rgba(251, 113, 133, 0.48)",
    legendFill: "rgb(130, 50, 70)",
    ring: "rgb(251, 113, 133)",
    badge: "bg-rose-500/20 text-rose-300",
  },
  suggestion: {
    label: "Suggestion",
    fill: "rgba(251, 191, 36, 0.3)",
    fillActive: "rgba(251, 191, 36, 0.5)",
    legendFill: "rgb(140, 100, 30)",
    ring: "rgb(251, 191, 36)",
    badge: "bg-amber-500/20 text-amber-300",
  },
};
