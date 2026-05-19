"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ANNOTATION_STYLES } from "@/lib/annotationStyles";
import type { Annotation } from "@/types/feedback";

const TOOLTIP_GAP = 8;
const VIEWPORT_PAD = 12;

type Props = {
  anchorEl: HTMLElement | null;
  visible: boolean;
  type: Annotation["type"];
  feedback: string;
};

export function AnnotationTooltip({
  anchorEl,
  visible,
  type,
  feedback,
}: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  } | null>(null);

  useLayoutEffect(() => {
    if (!visible || !anchorEl) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorEl.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      const tooltipW = tooltip?.offsetWidth ?? 300;
      const tooltipH = tooltip?.offsetHeight ?? 80;

      let left = anchor.left + anchor.width / 2 - tooltipW / 2;
      left = Math.max(
        VIEWPORT_PAD,
        Math.min(left, window.innerWidth - tooltipW - VIEWPORT_PAD),
      );

      const spaceBelow = window.innerHeight - anchor.bottom - TOOLTIP_GAP;
      const spaceAbove = anchor.top - TOOLTIP_GAP;
      const placeBelow =
        spaceBelow >= tooltipH || spaceBelow >= spaceAbove;

      const placement = placeBelow ? "below" : "above";
      const top = placeBelow
        ? anchor.bottom + TOOLTIP_GAP
        : anchor.top - tooltipH - TOOLTIP_GAP;

      setCoords({ top, left, placement });
    };

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorEl, visible, feedback, type]);

  if (!visible || !anchorEl || typeof document === "undefined") {
    return null;
  }

  const styleMeta = ANNOTATION_STYLES[type];
  const anchorRect = anchorEl.getBoundingClientRect();

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none fixed z-[9999] max-w-[300px]"
      style={{
        top: coords?.top ?? anchorRect.bottom + TOOLTIP_GAP,
        left: coords?.left ?? anchorRect.left,
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-md"
        style={{ boxShadow: `0 8px 32px -4px rgb(0 0 0 / 0.5), 0 0 0 1px ${styleMeta.ring}33 inset` }}
      >
        {coords && (
          <span
            className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-white/10 bg-slate-900/95"
            style={
              coords.placement === "below"
                ? { top: -5, borderBottom: "none", borderRight: "none" }
                : { bottom: -5, borderTop: "none", borderLeft: "none" }
            }
            aria-hidden
          />
        )}
        <div className="px-3.5 py-3">
          <span
            className={`mb-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styleMeta.badge}`}
          >
            {styleMeta.label}
          </span>
          <p className="text-sm leading-relaxed text-slate-100">{feedback}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
