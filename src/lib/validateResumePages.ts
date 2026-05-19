import { countPdfPages } from "@/lib/extractPdfText";
import { countDocxPages } from "@/lib/countDocxPages";
import {
  MAX_RESUME_PAGES,
  tooManyPagesMessage,
} from "@/lib/resumeLimits";
import type { ResumeFormat } from "@/lib/parseResume";

export type PageCountValidation =
  | { ok: true }
  | { ok: false; pageCount: number; message: string };

export async function validateResumePageCount(
  buffer: Buffer,
  format: ResumeFormat,
): Promise<PageCountValidation> {
  const pageCount =
    format === "pdf"
      ? await countPdfPages(buffer)
      : await countDocxPages(buffer);

  if (pageCount > MAX_RESUME_PAGES) {
    return { ok: false, pageCount, message: tooManyPagesMessage(pageCount) };
  }

  return { ok: true };
}
