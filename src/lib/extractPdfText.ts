import pdfParse from "pdf-parse";

/** Return the number of pages in a PDF without extracting full text. */
export async function countPdfPages(buffer: Buffer): Promise<number> {
  const data = await pdfParse(buffer);
  return data.numpages;
}

/** Extract resume text from a PDF buffer (server-safe; no pdfjs / DOMMatrix). */
export async function extractPdfText(
  buffer: Buffer,
  maxPages = Infinity,
): Promise<string> {
  const data = await pdfParse(buffer, {
    max: Number.isFinite(maxPages) ? maxPages : 0,
  });
  return data.text.trim();
}
