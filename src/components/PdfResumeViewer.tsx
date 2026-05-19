"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LegendSwatch } from "@/components/LegendSwatch";
import { ANNOTATION_STYLES } from "@/lib/annotationStyles";
import { findPdfHighlights, type NormalizedHighlight } from "@/lib/pdfHighlights";
import { loadPdfJs } from "@/lib/pdfJsLoader";
import { ResumeViewerActions } from "@/components/ResumeViewerActions";
import type { Annotation } from "@/types/feedback";

type Props = {
  file: File;
  annotations: Annotation[];
  activeIndex: number | null;
  onSelectAnnotation: (index: number | null) => void;
  onPickFile?: () => void;
  onOpenAdvanced?: () => void;
  pickFileDisabled?: boolean;
  showAdvancedDot?: boolean;
};

const MIN_WIDTH = 320;
const MAX_WIDTH = 820;
const PAGE_GAP = 16;

function PdfLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
      {(["strength", "weakness", "suggestion"] as const).map((type) => (
        <span key={type} className="flex items-center gap-1.5 text-muted">
          <LegendSwatch type={type} />
          {ANNOTATION_STYLES[type].label}
        </span>
      ))}
    </div>
  );
}

export function PdfResumeViewer({
  file,
  annotations,
  activeIndex,
  onSelectAnnotation,
  onPickFile,
  onOpenAdvanced,
  pickFileDisabled = false,
  showAdvancedDot = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesHostRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const highlightRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const onSelectRef = useRef(onSelectAnnotation);
  onSelectRef.current = onSelectAnnotation;
  const setHoveredRef = useRef<(index: number | null) => void>(() => {});
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  setHoveredRef.current = setHoveredIndex;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(700);
  const [numPages, setNumPages] = useState(0);
  const [highlights, setHighlights] = useState<NormalizedHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? MAX_WIDTH;
      setPageWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width - 32)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdfUrl || !pagesHostRef.current) return;

    let cancelled = false;
    const host = pagesHostRef.current;

    setLoading(true);
    setLoadError(null);
    setNumPages(0);
    setHighlights([]);
    host.innerHTML = "";
    pageRefs.current.clear();
    highlightRefs.current.clear();

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument(pdfUrl).promise;
        if (cancelled) return;

        const rects = await findPdfHighlights(
          pdf,
          annotations,
          pdfjs.Util,
          pageWidth,
        );
        if (cancelled) return;

        setHighlights(rects);
        setNumPages(pdf.numPages);

        const highlightsByPage = new Map<number, NormalizedHighlight[]>();
        for (const h of rects) {
          const list = highlightsByPage.get(h.pageNumber) ?? [];
          list.push(h);
          highlightsByPage.set(h.pageNumber, list);
        }

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = pageWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const wrap = document.createElement("div");
          wrap.className =
            "relative mx-auto overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10";
          wrap.style.width = "100%";
          wrap.style.maxWidth = `${viewport.width}px`;
          wrap.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
          pageRefs.current.set(pageNum, wrap);

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "block h-full w-full bg-white";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;
          wrap.appendChild(canvas);

          const pageHighlights = highlightsByPage.get(pageNum) ?? [];
          for (const h of pageHighlights) {
            const ann = annotations[h.annotationIndex];
            if (!ann) continue;
            const style = ANNOTATION_STYLES[ann.type];

            const btn = document.createElement("button");
            btn.type = "button";
            btn.title = ann.feedback;
            btn.className =
              "absolute rounded-[2px] transition-all duration-150 hover:brightness-110 focus:outline-none";
            btn.dataset.segmentKey = h.segmentKey;
            btn.dataset.annotationIndex = String(h.annotationIndex);
            btn.style.left = `${(h.left / viewport.width) * 100}%`;
            btn.style.top = `${(h.top / viewport.height) * 100}%`;
            btn.style.width = `${(h.width / viewport.width) * 100}%`;
            btn.style.height = `${(h.height / viewport.height) * 100}%`;
            btn.style.minWidth = "4px";
            btn.style.minHeight = "4px";
            btn.style.backgroundColor = style.fill;
            btn.style.zIndex = "10";

            btn.addEventListener("click", () =>
              onSelectRef.current(h.annotationIndex),
            );
            btn.addEventListener("mouseenter", () =>
              setHoveredRef.current(h.annotationIndex),
            );
            btn.addEventListener("mouseleave", () => setHoveredRef.current(null));

            highlightRefs.current.set(h.segmentKey, btn);
            wrap.appendChild(btn);
          }

          host.appendChild(wrap);

          if (pageNum < pdf.numPages) {
            const gap = document.createElement("div");
            gap.style.height = `${PAGE_GAP}px`;
            host.appendChild(gap);
          }
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("PDF render error:", err);
        if (!cancelled) {
          setLoadError(
            "Could not render the PDF. Check your connection and refresh.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pageWidth, annotations, file]);

  useEffect(() => {
    for (const [key, btn] of highlightRefs.current.entries()) {
      const index = Number(btn.dataset.annotationIndex);
      if (Number.isNaN(index)) continue;
      const ann = annotations[index];
      if (!ann) continue;
      const style = ANNOTATION_STYLES[ann.type];
      const isHighlighted = activeIndex === index || hoveredIndex === index;
      btn.style.backgroundColor = isHighlighted ? style.fillActive : style.fill;
      btn.style.outline = isHighlighted ? `2px solid ${style.ring}` : "";
      btn.style.outlineOffset = isHighlighted ? "1px" : "0";
      btn.style.zIndex = isHighlighted ? "20" : "10";
      void key;
    }
  }, [activeIndex, hoveredIndex, annotations, highlights]);

  const matchedCount = useMemo(
    () => new Set(highlights.map((h) => h.annotationIndex)).size,
    [highlights],
  );


  useEffect(() => {
    if (activeIndex === null) return;
    const target = highlights.find((h) => h.annotationIndex === activeIndex);
    if (!target) return;

    requestAnimationFrame(() => {
      const activeBtn = [...highlightRefs.current.values()].find(
        (btn) => Number(btn.dataset.annotationIndex) === activeIndex,
      );
      activeBtn?.scrollIntoView({ behavior: "smooth", block: "center" });
      pageRefs.current.get(target.pageNumber)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [activeIndex, highlights]);

  return (
    <div className="app-card">
      <div className="app-card-header flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Your resume</h2>
          <p className="mt-1 text-xs text-muted">
            {loading
              ? "Rendering PDF…"
              : loadError
                ? loadError
                : `Click highlights on the PDF for AI feedback · ${matchedCount} of ${annotations.length} notes on document`}
          </p>
          {!loading && !loadError && numPages > 0 && <PdfLegend />}
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

      <div
        ref={containerRef}
        className="bg-slate-200/90 p-4 sm:p-6 dark:bg-navy-mid/80"
      >
        {loading && (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted">
            Loading PDF…
          </div>
        )}

        <div
          ref={pagesHostRef}
          className={`flex flex-col items-center ${loading ? "hidden" : ""}`}
        />
      </div>

    </div>
  );
}
