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
    fill: "rgba(47, 122, 74, 0.34)",
    fillActive: "rgba(47, 122, 74, 0.5)",
    legendFill: "rgb(47, 122, 74)",
    ring: "rgb(47, 122, 74)",
    badge: "bg-emerald-50 text-emerald-800",
  },
  weakness: {
    label: "Needs work",
    fill: "rgba(180, 35, 24, 0.32)",
    fillActive: "rgba(180, 35, 24, 0.48)",
    legendFill: "rgb(180, 35, 24)",
    ring: "rgb(180, 35, 24)",
    badge: "bg-rose-50 text-rose-800",
  },
  suggestion: {
    label: "Suggestion",
    fill: "rgba(180, 120, 20, 0.34)",
    fillActive: "rgba(180, 120, 20, 0.5)",
    legendFill: "rgb(160, 105, 24)",
    ring: "rgb(180, 120, 20)",
    badge: "bg-amber-50 text-amber-900",
  },
};
