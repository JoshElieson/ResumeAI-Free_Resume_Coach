/** PDF.js build loaded at runtime (avoids Next.js webpack + pdfjs-dist bug). */

const PDFJS_VERSION = "5.4.296";

export type PdfViewport = {
  width: number;
  height: number;
  scale: number;
  transform: number[];
};

export type PdfJsLib = {
  getDocument: (src: string | { url: string }) => {
    promise: Promise<PdfDocument>;
  };
  GlobalWorkerOptions: { workerSrc: string };
  Util: {
    transform: (matrix: number[], vector: number[]) => number[];
  };
};

export type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

export type PdfPage = {
  getViewport: (opts: { scale: number }) => PdfViewport;
  getTextContent: () => Promise<{ items: unknown[] }>;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => { promise: Promise<void> };
};

let pdfjsPromise: Promise<PdfJsLib> | null = null;

export function loadPdfJs(): Promise<PdfJsLib> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PDF.js is only available in the browser"));
  }

  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = (await import(
        /* webpackIgnore: true */
        `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.min.mjs`
      )) as PdfJsLib;

      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.min.mjs`;
      return pdfjs;
    })();
  }

  return pdfjsPromise;
}
