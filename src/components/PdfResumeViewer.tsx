"use client";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LegendSwatch } from "@/components/LegendSwatch";

import { ANNOTATION_STYLES } from "@/lib/annotationStyles";

import { findPdfHighlights, type NormalizedHighlight } from "@/lib/pdfHighlights";

import {
  loadPdfJs,
  type PdfDocument,
  type PdfJsLib,
} from "@/lib/pdfJsLoader";

import { MAX_RESUME_PAGES } from "@/lib/resumeLimits";

import { AnnotationTooltip } from "@/components/AnnotationTooltip";

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



function PageArrowIcon({ direction }: { direction: "left" | "right" }) {

  return (

    <svg

      className="h-5 w-5"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      aria-hidden

    >

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        d={

          direction === "left"

            ? "M15 18l-6-6 6-6"

            : "M9 18l6-6-6-6"

        }

      />

    </svg>

  );

}



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

  const pdfRef = useRef<PdfDocument | null>(null);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const highlightRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const highlightsByPageRef = useRef<Map<number, NormalizedHighlight[]>>(

    new Map(),

  );

  const pdfjsUtilRef = useRef<PdfJsLib["Util"] | null>(null);

  const lastHighlightLayoutWidthRef = useRef<number | null>(null);

  const onSelectRef = useRef(onSelectAnnotation);

  onSelectRef.current = onSelectAnnotation;

  const setHoveredRef = useRef<(index: number | null) => void>(() => {});

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);

  setHoveredRef.current = setHoveredIndex;



  const [pageWidth, setPageWidth] = useState(700);

  const [numPages, setNumPages] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);

  const [highlights, setHighlights] = useState<NormalizedHighlight[]>([]);

  const [loading, setLoading] = useState(true);

  const [pageRendering, setPageRendering] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [pdfReady, setPdfReady] = useState(false);



  useEffect(() => {
    setCurrentPage(1);
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



  const syncPageVisibility = useCallback(() => {

    for (const [pageNum, wrap] of pageRefs.current) {

      wrap.style.display = pageNum === currentPage ? "" : "none";

    }

  }, [currentPage]);



  const clearRenderedPages = useCallback(() => {

    for (const wrap of pageRefs.current.values()) {

      wrap.remove();

    }

    pageRefs.current.clear();

    highlightRefs.current.clear();

  }, []);



  const removeHighlightButtons = useCallback((wrap: HTMLDivElement) => {

    for (const btn of wrap.querySelectorAll("button")) {

      const key = btn.dataset.segmentKey;

      if (key) highlightRefs.current.delete(key);

      btn.remove();

    }

  }, []);



  const appendHighlightButton = useCallback(

    (

      wrap: HTMLDivElement,

      h: NormalizedHighlight,

      viewportWidth: number,

      viewportHeight: number,

    ) => {

      const ann = annotations[h.annotationIndex];

      if (!ann) return;

      const style = ANNOTATION_STYLES[ann.type];



      const btn = document.createElement("button");

      btn.type = "button";

      btn.className =

        "absolute rounded-[2px] transition-all duration-150 hover:brightness-110 focus:outline-none";

      btn.dataset.segmentKey = h.segmentKey;

      btn.dataset.annotationIndex = String(h.annotationIndex);

      btn.style.left = `${(h.left / viewportWidth) * 100}%`;

      btn.style.top = `${(h.top / viewportHeight) * 100}%`;

      btn.style.width = `${(h.width / viewportWidth) * 100}%`;

      btn.style.height = `${(h.height / viewportHeight) * 100}%`;

      btn.style.minWidth = "4px";

      btn.style.minHeight = "4px";

      btn.style.backgroundColor = style.fill;

      btn.style.zIndex = "10";



      btn.addEventListener("click", (e) => {

        onSelectRef.current(h.annotationIndex);

        (e.currentTarget as HTMLButtonElement).focus({

          preventScroll: true,

        });

      });

      btn.addEventListener("mouseenter", () => {

        setHoveredRef.current(h.annotationIndex);

        setTooltipAnchor(btn);

      });

      btn.addEventListener("mouseleave", () => {

        setHoveredRef.current(null);

        setTooltipAnchor(null);

      });



      highlightRefs.current.set(h.segmentKey, btn);

      wrap.appendChild(btn);

    },

    [annotations],

  );



  const syncHighlightsOnRenderedPages = useCallback(() => {

    for (const [pageNum, wrap] of pageRefs.current) {

      const canvas = wrap.querySelector("canvas");

      if (!canvas) continue;

      removeHighlightButtons(wrap);

      const pageHighlights = highlightsByPageRef.current.get(pageNum) ?? [];

      for (const h of pageHighlights) {

        appendHighlightButton(wrap, h, canvas.width, canvas.height);

      }

    }

  }, [appendHighlightButton, removeHighlightButtons]);



  useEffect(() => {

    if (!pagesHostRef.current) return;



    let cancelled = false;

    const host = pagesHostRef.current;



    setLoading(true);

    setLoadError(null);

    setPdfReady(false);

    setNumPages(0);

    setHighlights([]);

    host.innerHTML = "";

    clearRenderedPages();

    highlightsByPageRef.current.clear();

    pdfRef.current = null;

    pdfjsUtilRef.current = null;

    lastHighlightLayoutWidthRef.current = null;



    (async () => {

      try {

        const pdfjs = await loadPdfJs();

        if (cancelled) return;

        const data = new Uint8Array(await file.arrayBuffer());

        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;

        if (cancelled) return;



        pdfRef.current = pdf;

        pdfjsUtilRef.current = pdfjs.Util;

        setNumPages(pdf.numPages);

        setPdfReady(true);

        setLoading(false);

      } catch (err) {

        console.error("PDF load error:", err);

        if (!cancelled) {

          setLoadError(

            "Could not load the PDF. Check your connection and refresh.",

          );

          setLoading(false);

        }

      }

    })();



    return () => {

      cancelled = true;

      pdfRef.current = null;

      pdfjsUtilRef.current = null;

    };

  }, [file, clearRenderedPages]);



  useEffect(() => {

    const pdf = pdfRef.current;

    const util = pdfjsUtilRef.current;

    if (!pdfReady || !pdf || !util) return;



    let cancelled = false;

    const layoutWidthChanged =

      lastHighlightLayoutWidthRef.current !== null &&

      lastHighlightLayoutWidthRef.current !== pageWidth;



    lastHighlightLayoutWidthRef.current = pageWidth;



    (async () => {

      try {

        const rects = await findPdfHighlights(

          pdf,

          annotations,

          util,

          pageWidth,

        );

        if (cancelled) return;



        const byPage = new Map<number, NormalizedHighlight[]>();

        for (const h of rects) {

          const list = byPage.get(h.pageNumber) ?? [];

          list.push(h);

          byPage.set(h.pageNumber, list);

        }

        highlightsByPageRef.current = byPage;

        setHighlights(rects);



        if (layoutWidthChanged) {

          clearRenderedPages();

        } else {

          setHoveredIndex(null);

          setTooltipAnchor(null);

          syncHighlightsOnRenderedPages();

        }

      } catch (err) {

        console.error("PDF highlight sync error:", err);

      }

    })();



    return () => {

      cancelled = true;

    };

  }, [

    annotations,

    pageWidth,

    pdfReady,

    clearRenderedPages,

    syncHighlightsOnRenderedPages,

  ]);



  useEffect(() => {

    if (!pdfReady || !pdfRef.current || !pagesHostRef.current || loading) {

      return;

    }



    let cancelled = false;

    const host = pagesHostRef.current;

    const pageNum = currentPage;



    if (pageRefs.current.has(pageNum)) {

      syncPageVisibility();

      return;

    }



    setPageRendering(true);



    (async () => {

      try {

        const pdf = pdfRef.current;

        if (!pdf || cancelled) return;



        const page = await pdf.getPage(pageNum);

        if (cancelled) return;



        const baseViewport = page.getViewport({ scale: 1 });

        const scale = pageWidth / baseViewport.width;

        const viewport = page.getViewport({ scale });



        const wrap = document.createElement("div");

        wrap.dataset.pageNumber = String(pageNum);

        wrap.className =

          "relative mx-auto overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10";

        wrap.style.width = "100%";

        wrap.style.maxWidth = `${viewport.width}px`;

        wrap.style.aspectRatio = `${viewport.width} / ${viewport.height}`;



        const canvas = document.createElement("canvas");

        canvas.width = viewport.width;

        canvas.height = viewport.height;

        canvas.className = "block h-full w-full bg-white";



        const ctx = canvas.getContext("2d");

        if (!ctx) return;



        await page.render({ canvasContext: ctx, viewport }).promise;

        if (cancelled) return;



        wrap.appendChild(canvas);



        const pageHighlights = highlightsByPageRef.current.get(pageNum) ?? [];

        for (const h of pageHighlights) {

          appendHighlightButton(

            wrap,

            h,

            viewport.width,

            viewport.height,

          );

        }



        pageRefs.current.set(pageNum, wrap);

        host.appendChild(wrap);



        for (const [n, el] of pageRefs.current) {

          el.style.display = n === pageNum ? "" : "none";

        }



        if (!cancelled) setPageRendering(false);

      } catch (err) {

        console.error("PDF page render error:", err);

        if (!cancelled) {

          setLoadError("Could not render this page. Try refreshing.");

          setPageRendering(false);

        }

      }

    })();



    return () => {

      cancelled = true;

    };

  }, [

    pdfReady,

    currentPage,

    pageWidth,

    loading,

    syncPageVisibility,

    appendHighlightButton,

  ]);



  useEffect(() => {

    if (currentPage > numPages && numPages > 0) {

      setCurrentPage(numPages);

    }

  }, [currentPage, numPages]);



  useEffect(() => {

    for (const [key, btn] of highlightRefs.current.entries()) {

      const index = Number(btn.dataset.annotationIndex);

      if (Number.isNaN(index)) continue;

      const ann = annotations[index];

      if (!ann) {

        highlightRefs.current.delete(key);

        btn.remove();

        continue;

      }

      const style = ANNOTATION_STYLES[ann.type];

      const isHighlighted = activeIndex === index || hoveredIndex === index;

      btn.style.backgroundColor = isHighlighted ? style.fillActive : style.fill;

      btn.style.outline = isHighlighted ? `2px solid ${style.ring}` : "";

      btn.style.outlineOffset = isHighlighted ? "1px" : "0";

      btn.style.zIndex = isHighlighted ? "20" : "10";

      void key;

    }

  }, [activeIndex, hoveredIndex, annotations, highlights, currentPage]);



  const matchedCount = useMemo(

    () => new Set(highlights.map((h) => h.annotationIndex)).size,

    [highlights],

  );



  useEffect(() => {

    if (activeIndex === null) return;

    const target = highlights.find((h) => h.annotationIndex === activeIndex);

    if (!target) return;

    setCurrentPage(target.pageNumber);

  }, [activeIndex, highlights]);



  const pageCountWarning =

    numPages > MAX_RESUME_PAGES

      ? ` · ${numPages} pages (long documents may be slow)`

      : "";



  return (

    <div className="app-card">

      <div className="app-card-header flex items-start justify-between gap-4 px-5 py-4">

        <div className="min-w-0 flex-1">

          <h2 className="text-lg font-semibold text-foreground">Your resume</h2>

          <p className="mt-1 text-xs text-muted">

            {loading

              ? "Loading PDF…"

              : pageRendering

                ? "Rendering page…"

                : loadError

                  ? loadError

                  : `Click highlights on the PDF for AI feedback · ${matchedCount} of ${annotations.length} notes on document${pageCountWarning}`}

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

        {(loading || pageRendering) && (

          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted">

            {loading ? "Loading PDF…" : "Rendering page…"}

          </div>

        )}



        <div

          ref={pagesHostRef}

          className={`flex flex-col items-center ${loading || pageRendering ? "hidden" : ""}`}

        />



        {numPages > 1 && !loading && !loadError && (

          <nav

            className="mt-4 flex items-center justify-center gap-4"

            aria-label="Resume pages"

          >

            <button

              type="button"

              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-surface-elevated/80 text-foreground shadow-sm transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"

              disabled={currentPage <= 1 || pageRendering}

              aria-label="Previous page"

              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}

            >

              <PageArrowIcon direction="left" />

            </button>

            <span className="min-w-[6.5rem] text-center text-sm text-muted">

              Page {currentPage} of {numPages}

            </span>

            <button

              type="button"

              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-surface-elevated/80 text-foreground shadow-sm transition hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"

              disabled={currentPage >= numPages || pageRendering}

              aria-label="Next page"

              onClick={() =>

                setCurrentPage((p) => Math.min(numPages, p + 1))

              }

            >

              <PageArrowIcon direction="right" />

            </button>

          </nav>

        )}

      </div>



      {hoveredIndex !== null && annotations[hoveredIndex] && (

        <AnnotationTooltip

          anchorEl={tooltipAnchor}

          visible={tooltipAnchor !== null}

          type={annotations[hoveredIndex].type}

          feedback={annotations[hoveredIndex].feedback}

        />

      )}

    </div>

  );

}

