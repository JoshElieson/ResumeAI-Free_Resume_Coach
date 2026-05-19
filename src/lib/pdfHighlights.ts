import { findTextSpan } from "@/lib/highlights";
import { appendVisionHighlights } from "@/lib/visionHighlights";
import {
  buildPageTextFromItems,
  sortItemsReadingOrder,
} from "@/lib/pdfTextLayout";
import type { PdfJsLib, PdfPage, PdfViewport } from "@/lib/pdfJsLoader";
import type { Annotation } from "@/types/feedback";

export type NormalizedHighlight = {
  pageNumber: number;
  left: number;
  top: number;
  width: number;
  height: number;
  annotationIndex: number;
  /** Unique per highlight rect (multi-line quotes get several small boxes) */
  segmentKey: string;
};

type TextItemLike = {
  str: string;
  transform: number[];
  width: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
};

type PdfPageLike = Pick<PdfPage, "getTextContent" | "getViewport">;

type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
};

type Box = { left: number; top: number; width: number; height: number };

type TextItem = {
  str: string;
  box: Box;
  itemIndex: number;
  fontSize: number;
  fontFamily: string;
  hasEOL?: boolean;
};

type TextStyle = {
  ascent?: number;
  vertical?: boolean;
  fontFamily?: string;
};

type PageTextData = {
  pageNumber: number;
  viewport: PdfViewport;
  items: TextItem[];
  text: string;
  itemRanges: Array<{ itemIndex: number; start: number; end: number }>;
};

const DEFAULT_ASCENT_RATIO = 0.8;

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d");
  }
  return measureCtx;
}

function resolveFontFamily(
  fontName: string | undefined,
  styles: Record<string, TextStyle>,
): string {
  const family = fontName ? styles[fontName]?.fontFamily : undefined;
  if (!family || /^g_|^fnt/i.test(family)) return "sans-serif";
  const first = family.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "");
  return first || "sans-serif";
}

/** Measure visible text width — never use PDF line advances for highlight width. */
function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
): number {
  if (!text) return 0;
  const ctx = getMeasureCtx();
  if (!ctx) return text.length * fontSize * 0.52;
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}

function isTextItem(item: unknown): item is TextItemLike {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item &&
    typeof (item as TextItemLike).str === "string"
  );
}

function ascentRatio(
  fontName: string | undefined,
  styles: Record<string, TextStyle>,
): number {
  if (!fontName) return DEFAULT_ASCENT_RATIO;
  const style = styles[fontName];
  if (style?.ascent && style.ascent > 0 && style.ascent < 1.5) {
    return style.ascent;
  }
  return DEFAULT_ASCENT_RATIO;
}

function itemBoxInViewport(
  item: TextItemLike,
  viewport: PdfViewport,
  util: PdfJsLib["Util"],
  styles: Record<string, TextStyle>,
  fontSize: number,
  fontFamily: string,
): Box {
  const tx = util.transform(viewport.transform, item.transform);
  const angle = Math.atan2(tx[1]!, tx[0]!);
  const fontAscent = fontSize * ascentRatio(item.fontName, styles);

  let left: number;
  let top: number;
  if (Math.abs(angle) < 0.001) {
    left = tx[4]!;
    top = tx[5]! - fontAscent;
  } else {
    left = tx[4]! + fontAscent * Math.sin(angle);
    top = tx[5]! - fontAscent * Math.cos(angle);
  }

  const visible = item.str.replace(/\s+$/g, "");
  const width = Math.max(
    measureTextWidth(visible || item.str, fontSize, fontFamily),
    2,
  );
  const height = fontSize * 0.92;

  return { left, top, width, height };
}

function clampBox(box: Box, viewport: PdfViewport): Box {
  const padX = 1;
  const padY = 0.5;
  const left = Math.max(0, box.left - padX);
  const top = Math.max(0, box.top - padY);
  const right = Math.min(viewport.width, box.left + box.width + padX);
  const bottom = Math.min(viewport.height, box.top + box.height + padY);
  return {
    left,
    top,
    width: Math.max(right - left, 2),
    height: Math.max(bottom - top, 2),
  };
}

/** Start index in page.text where this item's PDF string begins (skips synthetic spacing). */
function itemContentStart(
  range: { start: number; end: number },
  itemStr: string,
): number {
  return range.end - itemStr.length;
}

function offsetsInItemStr(
  item: TextItem,
  range: { start: number; end: number },
  overlapStart: number,
  overlapEnd: number,
): { start: number; end: number } | null {
  const contentStart = itemContentStart(range, item.str);
  const start = Math.max(0, overlapStart - contentStart);
  const end = Math.min(item.str.length, overlapEnd - contentStart);
  if (start >= end) return null;
  return { start, end };
}

function normalizeQuote(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildTextItems(
  items: unknown[],
  viewport: PdfViewport,
  util: PdfJsLib["Util"],
  styles: Record<string, TextStyle>,
): TextItem[] {
  const result: TextItem[] = [];
  for (const raw of items) {
    if (!isTextItem(raw) || !raw.str) continue;
    const tx = util.transform(viewport.transform, raw.transform);
    const fontSize = Math.hypot(tx[2]!, tx[3]!) || 12;
    const fontFamily = resolveFontFamily(raw.fontName, styles);
    result.push({
      str: raw.str,
      hasEOL: raw.hasEOL,
      itemIndex: 0,
      fontSize,
      fontFamily,
      box: itemBoxInViewport(
        raw,
        viewport,
        util,
        styles,
        fontSize,
        fontFamily,
      ),
    });
  }
  const sorted = sortItemsReadingOrder(result);
  sorted.forEach((item, index) => {
    item.itemIndex = index;
  });
  return sorted;
}

function itemsForSpan(
  items: TextItem[],
  itemRanges: Array<{ itemIndex: number; start: number; end: number }>,
  span: { start: number; end: number },
): TextItem[] {
  const indices = new Set<number>();
  for (const range of itemRanges) {
    if (range.start < span.end && range.end > span.start) {
      indices.add(range.itemIndex);
    }
  }
  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => items[i]!);
}

function splitSpanIntoLines(
  pageText: string,
  span: { start: number; end: number },
): Array<{ start: number; end: number }> {
  const lines: Array<{ start: number; end: number }> = [];
  let lineStart = span.start;

  for (let i = span.start; i < span.end; i++) {
    if (pageText[i] === "\n") {
      if (i > lineStart) lines.push({ start: lineStart, end: i });
      lineStart = i + 1;
    }
  }

  if (lineStart < span.end) {
    lines.push({ start: lineStart, end: span.end });
  }

  return lines;
}

/** Build one highlight rect per visual line using canvas-measured text widths. */
function lineBoxesForSpan(
  page: PageTextData,
  matched: TextItem[],
  span: { start: number; end: number },
): Box[] {
  const matchedIndices = new Set(matched.map((m) => m.itemIndex));
  const lines = splitSpanIntoLines(page.text, span);
  const boxes: Box[] = [];

  for (const line of lines) {
    let minLeft = Infinity;
    let maxRight = -Infinity;
    let minTop = Infinity;
    let maxHeight = 0;

    for (const itemIndex of matchedIndices) {
      const item = page.items[itemIndex];
      const range = page.itemRanges[itemIndex];
      if (!item || !range) continue;
      if (range.start >= line.end || range.end <= line.start) continue;

      const overlapStart = Math.max(line.start, range.start);
      const overlapEnd = Math.min(line.end, range.end);
      const offsets = offsetsInItemStr(
        item,
        range,
        overlapStart,
        overlapEnd,
      );
      if (!offsets) continue;

      const prefix = item.str.slice(0, offsets.start);
      const slice = item.str.slice(offsets.start, offsets.end);
      const left =
        item.box.left +
        measureTextWidth(prefix, item.fontSize, item.fontFamily);
      const width = measureTextWidth(slice, item.fontSize, item.fontFamily);
      const right = left + width;

      minLeft = Math.min(minLeft, left);
      maxRight = Math.max(maxRight, right);
      minTop = Math.min(minTop, item.box.top);
      maxHeight = Math.max(maxHeight, item.box.height);
    }

    if (!Number.isFinite(minLeft)) continue;

    boxes.push({
      left: minLeft,
      top: minTop,
      width: Math.max(maxRight - minLeft, 2),
      height: maxHeight,
    });
  }

  return boxes;
}

function spanMatchScore(
  pageText: string,
  span: { start: number; end: number },
  quote: string,
): number {
  const excerpt = pageText.slice(span.start, span.end);
  const normExcerpt = normalizeQuote(excerpt);
  const normQuote = normalizeQuote(quote);
  if (normExcerpt === normQuote) return 0;
  if (!normExcerpt.includes(normQuote)) return Infinity;
  return Math.abs(normExcerpt.length - normQuote.length) + 4;
}

async function loadPageTextData(
  page: PdfPageLike,
  pageNumber: number,
  util: PdfJsLib["Util"],
  renderWidth: number,
): Promise<PageTextData> {
  const textContent = await page.getTextContent();
  const styles = (textContent as { styles?: Record<string, TextStyle> }).styles ?? {};
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = renderWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const items = buildTextItems(textContent.items, viewport, util, styles);
  const { text, itemRanges } = buildPageTextFromItems(items);

  return { pageNumber, viewport, items, text, itemRanges };
}

function highlightsForMatch(
  page: PageTextData,
  annotationIndex: number,
  matchedItems: TextItem[],
  span: { start: number; end: number },
): NormalizedHighlight[] {
  const lineBoxes = lineBoxesForSpan(page, matchedItems, span);
  const results: NormalizedHighlight[] = [];

  lineBoxes.forEach((box, lineIdx) => {
    const clamped = clampBox(box, page.viewport);
    results.push({
      pageNumber: page.pageNumber,
      annotationIndex,
      segmentKey: `${annotationIndex}-${page.pageNumber}-${lineIdx}`,
      left: clamped.left,
      top: clamped.top,
      width: clamped.width,
      height: clamped.height,
    });
  });

  return results;
}

export async function findPdfHighlights(
  pdf: PdfDocumentLike,
  annotations: Annotation[],
  util: PdfJsLib["Util"],
  renderWidth: number,
): Promise<NormalizedHighlight[]> {
  const pages: PageTextData[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    pages.push(await loadPageTextData(page, pageNumber, util, renderWidth));
  }

  const all: NormalizedHighlight[] = [];
  const visionCovered = new Set<number>();
  const pageViewportSizes = new Map(
    pages.map((page) => [
      page.pageNumber,
      { width: page.viewport.width, height: page.viewport.height },
    ]),
  );

  appendVisionHighlights(
    annotations,
    pageViewportSizes,
    all,
    visionCovered,
  );

  annotations.forEach((annotation, annotationIndex) => {
    if (visionCovered.has(annotationIndex)) return;

    let bestPage: PageTextData | null = null;
    let bestSpan: { start: number; end: number } | null = null;
    let bestScore = Infinity;

    for (const page of pages) {
      const span = findTextSpan(page.text, annotation);
      if (!span) continue;

      const score = spanMatchScore(page.text, span, annotation.text);
      if (score < bestScore) {
        bestScore = score;
        bestPage = page;
        bestSpan = span;
      }
    }

    if (!bestPage || !bestSpan || bestScore === Infinity) return;

    const matchedItems = itemsForSpan(
      bestPage.items,
      bestPage.itemRanges,
      bestSpan,
    );
    if (matchedItems.length === 0) return;

    all.push(
      ...highlightsForMatch(bestPage, annotationIndex, matchedItems, bestSpan),
    );
  });

  return all;
}
