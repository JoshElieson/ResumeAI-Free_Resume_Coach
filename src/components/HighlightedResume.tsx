"use client";

import { useMemo, useState } from "react";
import { LegendSwatch } from "@/components/LegendSwatch";
import { buildHighlightSegments } from "@/lib/highlights";
import { ANNOTATION_STYLES } from "@/lib/annotationStyles";
import { AnnotationTooltip } from "@/components/AnnotationTooltip";
import { ResumeViewerActions } from "@/components/ResumeViewerActions";
import type { Annotation } from "@/types/feedback";

const TYPE_STYLES: Record<
  Annotation["type"],
  { bg: string; ring: string; label: string }
> = {
  strength: {
    bg: "bg-emerald-600/35 hover:bg-emerald-600/45",
    ring: "ring-emerald-600",
    label: "Strength",
  },
  weakness: {
    bg: "bg-rose-600/32 hover:bg-rose-600/42",
    ring: "ring-rose-600",
    label: "Needs work",
  },
  suggestion: {
    bg: "bg-amber-600/35 hover:bg-amber-600/45",
    ring: "ring-amber-600",
    label: "Suggestion",
  },
};

type Props = {
  resumeText: string;
  annotations: Annotation[];
  activeIndex: number | null;
  onSelectAnnotation: (index: number | null) => void;
  onPickFile?: () => void;
  onOpenAdvanced?: () => void;
  pickFileDisabled?: boolean;
  showAdvancedDot?: boolean;
};

export function HighlightedResume({
  resumeText,
  annotations,
  activeIndex,
  onSelectAnnotation,
  onPickFile,
  onOpenAdvanced,
  pickFileDisabled = false,
  showAdvancedDot = false,
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [tooltipMeta, setTooltipMeta] = useState<{
    type: Annotation["type"];
    feedback: string;
  } | null>(null);

  const { segments, annotationIndexBySpan } = useMemo(() => {
    const segments = buildHighlightSegments(resumeText, annotations);
    const map = new Map<object, number>();
    let annIdx = 0;
    for (const seg of segments) {
      if (seg.annotation) {
        const idx = annotations.findIndex(
          (a) =>
            a.text === seg.annotation!.text &&
            a.feedback === seg.annotation!.feedback &&
            a.type === seg.annotation!.type,
        );
        map.set(seg, idx >= 0 ? idx : annIdx++);
      }
    }
    return { segments, annotationIndexBySpan: map };
  }, [resumeText, annotations]);

  return (
    <div className="app-card overflow-hidden">
      <div className="app-card-header flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Your resume</h2>
          <p className="mt-1 text-xs text-muted">
            Hover or click highlighted phrases for AI feedback
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
            {(["strength", "weakness", "suggestion"] as const).map((type) => (
              <span key={type} className="flex items-center gap-1.5">
                <LegendSwatch type={type} />
                {ANNOTATION_STYLES[type].label}
              </span>
            ))}
          </div>
        </div>
        {onPickFile && (
          <ResumeViewerActions
            onPickFile={onPickFile}
            onOpenAdvanced={onOpenAdvanced}
            pickFileDisabled={pickFileDisabled}
            advancedDisabled={pickFileDisabled}
            showAdvancedDot={showAdvancedDot}
          />
        )}
      </div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words bg-surface-elevated p-5 font-mono text-sm leading-relaxed text-foreground">
        {segments.map((segment, i) => {
          if (!segment.annotation) {
            return <span key={i}>{segment.text}</span>;
          }

          const annIndex =
            annotationIndexBySpan.get(segment) ??
            annotations.indexOf(segment.annotation);
          const style = TYPE_STYLES[segment.annotation.type];
          const isActive =
            activeIndex === annIndex || hoveredIndex === annIndex;

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className={`cursor-pointer rounded px-0.5 ring-2 ring-transparent transition ${style.bg} ${isActive ? style.ring : ""}`}
              onMouseEnter={(e) => {
                setHoveredIndex(annIndex);
                setTooltipAnchor(e.currentTarget);
                setTooltipMeta({
                  type: segment.annotation!.type,
                  feedback: segment.annotation!.feedback,
                });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setTooltipAnchor(null);
                setTooltipMeta(null);
              }}
              onClick={(e) => {
                onSelectAnnotation(annIndex);
                e.currentTarget.focus({ preventScroll: true });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectAnnotation(annIndex);
                  e.currentTarget.focus({ preventScroll: true });
                }
              }}
            >
              {segment.text}
            </span>
          );
        })}
      </pre>
      {tooltipMeta && (
        <AnnotationTooltip
          anchorEl={tooltipAnchor}
          visible={tooltipAnchor !== null}
          type={tooltipMeta.type}
          feedback={tooltipMeta.feedback}
        />
      )}
    </div>
  );
}
