import { countDocxPages } from "@/lib/countDocxPages";
import {
  getFormatFromMime,
  getFormatFromName,
} from "@/lib/resumeFile";
import {
  MAX_RESUME_PAGES,
  tooManyPagesMessage,
} from "@/lib/resumeLimits";
import type { PageCountValidation } from "@/lib/validateResumePages";

async function countFilePages(file: File): Promise<number | null> {
  const format = getFormatFromMime(file.type) ?? getFormatFromName(file.name);
  // PDF page count uses pdfjs in the browser worker and can throw DOMMatrix
  // on some environments. The analyze API validates PDF page count on the server.
  if (format === "pdf") {
    return null;
  }
  if (format === "docx") {
    return countDocxPages(await file.arrayBuffer());
  }
  return null;
}

export async function validateResumePageCountClient(
  file: File,
): Promise<PageCountValidation> {
  try {
    const pageCount = await countFilePages(file);
    if (pageCount === null) return { ok: true };

    if (pageCount > MAX_RESUME_PAGES) {
      return { ok: false, pageCount, message: tooManyPagesMessage(pageCount) };
    }

    return { ok: true };
  } catch (err) {
    console.warn("Client page validation failed; server will validate:", err);
    return { ok: true };
  }
}
