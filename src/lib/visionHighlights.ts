import type { NormalizedHighlight } from "@/lib/pdfHighlights";
import type { Annotation } from "@/types/feedback";

export type PageViewportSize = {
  width: number;
  height: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function appendVisionHighlights(
  annotations: Annotation[],
  pageViewports: Map<number, PageViewportSize>,
  out: NormalizedHighlight[],
  covered: Set<number>,
): void {
  annotations.forEach((annotation, annotationIndex) => {
    const pageNumber = annotation.pageNumber;
    const regions = annotation.regions;
    if (!pageNumber || !regions?.length) return;

    const viewport = pageViewports.get(pageNumber);
    if (!viewport) return;

    let added = false;
    regions.forEach((region, regionIndex) => {
      const x = clamp01(region.x);
      const y = clamp01(region.y);
      const width = clamp01(region.width);
      const height = clamp01(region.height);
      if (width < 0.005 || height < 0.005) return;

      const left = x * viewport.width;
      const top = y * viewport.height;
      const boxWidth = Math.max(width * viewport.width, 4);
      const boxHeight = Math.max(height * viewport.height, 4);

      out.push({
        pageNumber,
        annotationIndex,
        segmentKey: `vision-${annotationIndex}-${regionIndex}`,
        left,
        top,
        width: boxWidth,
        height: boxHeight,
      });
      added = true;
    });

    if (added) {
      covered.add(annotationIndex);
    }
  });
}
