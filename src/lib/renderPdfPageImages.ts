import { join } from "path";
import { pathToFileURL } from "url";
import { loadPdfJsServer } from "@/lib/pdfJsServer";
import { MAX_RESUME_PAGES } from "@/lib/resumeLimits";

const MAX_PAGE_WIDTH_PX = 1024;
const JPEG_QUALITY = 82;

export type PageImageForVision = {
  pageNumber: number;
  mimeType: "image/jpeg";
  base64: string;
  width: number;
  height: number;
};

function pdfjsAssetUrl(...parts: string[]): string {
  return pathToFileURL(join(process.cwd(), "node_modules", "pdfjs-dist", ...parts))
    .href;
}

export async function renderPdfPageImages(
  buffer: Buffer,
  maxPages = MAX_RESUME_PAGES,
): Promise<PageImageForVision[]> {
  const pdfjs = await loadPdfJsServer();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    cMapUrl: `${pdfjsAssetUrl("cmaps")}/`,
    cMapPacked: true,
    standardFontDataUrl: `${pdfjsAssetUrl("standard_fonts")}/`,
  }).promise;

  const canvasFactory = pdf.canvasFactory;
  if (!canvasFactory) {
    throw new Error("PDF canvas factory is unavailable in this environment.");
  }

  const pageLimit = Math.min(pdf.numPages, maxPages);
  const images: PageImageForVision[] = [];

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_PAGE_WIDTH_PX / baseViewport.width);
    const viewport = page.getViewport({ scale });

    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvasAndContext = canvasFactory.create(width, height);

    const ctx = canvasAndContext.context as {
      fillStyle: string;
      fillRect: (x: number, y: number, w: number, h: number) => void;
    };
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    await page.render({
      canvasContext: canvasAndContext.context,
      viewport,
    }).promise;

    const jpeg = canvasAndContext.canvas.toBuffer("image/jpeg", JPEG_QUALITY);
    images.push({
      pageNumber,
      mimeType: "image/jpeg",
      base64: jpeg.toString("base64"),
      width,
      height,
    });

    page.cleanup();
    canvasFactory.destroy(canvasAndContext);
  }

  return images;
}
