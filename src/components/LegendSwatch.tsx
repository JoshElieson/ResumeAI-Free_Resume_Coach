import { ANNOTATION_STYLES } from "@/lib/annotationStyles";
import type { Annotation } from "@/types/feedback";

type Props = {
  type: Annotation["type"];
};

export function LegendSwatch({ type }: Props) {
  return (
    <span
      className="block h-3 w-6 shrink-0 overflow-hidden rounded-sm"
      style={{ backgroundColor: ANNOTATION_STYLES[type].legendFill }}
      aria-hidden
    />
  );
}
