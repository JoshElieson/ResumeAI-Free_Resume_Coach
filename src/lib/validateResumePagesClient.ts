import { countDocxPages } from "@/lib/countDocxPages";
import { loadPdfJs } from "@/lib/pdfJsLoader";
import {
  getFormatFromMime,
  getFormatFromName,
} from "@/lib/parseResume";
import {
  MAX_RESUME_PAGES,
  tooManyPagesMessage,
} from "@/lib/resumeLimits";
import type { PageCountValidation } from "@/lib/validateResumePages";

async function countFilePages(file: File): Promise<number | null> {
  const format = getFormatFromMime(file.type) ?? getFormatFromName(file.name);
  if (format === "pdf") {
    const pdfjs = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    return pdf.numPages;
  }
  if (format === "docx") {
    return countDocxPages(await file.arrayBuffer());
  }
  return null;
}

export async function validateResumePageCountClient(
  file: File,
): Promise<PageCountValidation> {
  const pageCount = await countFilePages(file);
  if (pageCount === null) return { ok: true };

  if (pageCount > MAX_RESUME_PAGES) {
    return { ok: false, pageCount, message: tooManyPagesMessage(pageCount) };
  }

  return { ok: true };
}
