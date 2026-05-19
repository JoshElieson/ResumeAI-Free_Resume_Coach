import { join } from "path";
import { pathToFileURL } from "url";
import {
  buildPageTextFromItems,
  sortItemsReadingOrder,
  type LayoutTextItem,
} from "@/lib/pdfTextLayout";

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height?: number;
  hasEOL?: boolean;
};

type PdfJsUtil = {
  transform: (matrix: number[], vector: number[]) => number[];
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; transform: number[] };
  getTextContent: () => Promise<{ items: unknown[] }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfJsModule = {
  getDocument: (params: {
    data: Uint8Array;
    useSystemFonts?: boolean;
  }) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
  Util: PdfJsUtil;
};

let pdfjsPromise: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = (await import(
        /* webpackIgnore: true */
        `pdfjs-dist/legacy/build/pdf.mjs`
      )) as PdfJsModule;

      const workerPath = join(
        process.cwd(),
        "node_modules",
        "pdfjs-dist",
        "legacy",
        "build",
        "pdf.worker.mjs",
      );
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    "transform" in item &&
    typeof (item as PdfTextItem).str === "string"
  );
}

function layoutItemFromPdf(
  raw: PdfTextItem,
  viewport: { transform: number[] },
  util: PdfJsUtil,
): LayoutTextItem | null {
  if (!raw.str) return null;

  const tx = util.transform(viewport.transform, raw.transform);
  const fontSize = Math.hypot(tx[2]!, tx[3]!) || 12;
  const visible = raw.str.replace(/\s+$/g, "");
  const left = tx[4]!;
  const top = tx[5]! - fontSize * 0.8;
  const width = Math.max(
    raw.width || 0,
    fontSize * (visible.length || 1) * 0.52,
    2,
  );

  return {
    str: raw.str,
    hasEOL: raw.hasEOL,
    box: { left, top, width, height: fontSize * 0.92 },
  };
}

async function extractPageText(
  page: PdfPage,
  util: PdfJsUtil,
): Promise<string> {
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const layoutItems: LayoutTextItem[] = [];

  for (const raw of textContent.items) {
    if (!isPdfTextItem(raw)) continue;
    const item = layoutItemFromPdf(raw, viewport, util);
    if (item) layoutItems.push(item);
  }

  const sorted = sortItemsReadingOrder(layoutItems);
  return buildPageTextFromItems(sorted).text;
}

/** Return the number of pages in a PDF without extracting full text. */
export async function countPdfPages(buffer: Buffer): Promise<number> {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;
  return pdf.numPages;
}

/** Extract resume text from a PDF buffer using layout positions (preserves visual gaps). */
export async function extractPdfText(
  buffer: Buffer,
  maxPages = Infinity,
): Promise<string> {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const pageLimit = Math.min(pdf.numPages, maxPages);
  const parts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const pageText = await extractPageText(page, pdfjs.Util);
    if (pageText.trim()) parts.push(pageText);
  }

  return parts.join("\n\n").trim();
}
