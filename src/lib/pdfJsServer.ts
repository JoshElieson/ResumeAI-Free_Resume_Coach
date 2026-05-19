import { join } from "path";
import { pathToFileURL } from "url";

export type PdfJsServerModule = {
  getDocument: (params: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    cMapPacked?: boolean;
    standardFontDataUrl?: string;
  }) => { promise: Promise<PdfServerDocument> };
  GlobalWorkerOptions: { workerSrc: string };
  Util: {
    transform: (matrix: number[], vector: number[]) => number[];
  };
};

export type PdfServerDocument = {
  numPages: number;
  canvasFactory?: {
    create: (
      width: number,
      height: number,
    ) => {
      canvas: { toBuffer: (mime: string, quality?: number) => Buffer };
      context: unknown;
    };
    destroy: (canvasAndContext: unknown) => void;
  };
  getPage: (pageNumber: number) => Promise<PdfServerPage>;
};

export type PdfServerPage = {
  getViewport: (opts: { scale: number }) => {
    width: number;
    height: number;
    scale: number;
    transform: number[];
  };
  getTextContent: () => Promise<{ items: unknown[] }>;
  render: (params: {
    canvasContext: unknown;
    viewport: { width: number; height: number; scale: number };
  }) => { promise: Promise<void> };
  cleanup: () => void;
};

let pdfjsPromise: Promise<PdfJsServerModule> | null = null;

export async function loadPdfJsServer(): Promise<PdfJsServerModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = (await import(
        /* webpackIgnore: true */
        `pdfjs-dist/legacy/build/pdf.mjs`
      )) as unknown as PdfJsServerModule;

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

export async function loadPdfFromBuffer(
  buffer: Buffer,
): Promise<PdfServerDocument> {
  const pdfjs = await loadPdfJsServer();
  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;
}
