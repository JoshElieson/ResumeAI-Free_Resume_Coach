import JSZip from "jszip";

/** Estimate page count from a DOCX buffer (Word metadata or explicit page breaks). */
export async function countDocxPages(
  buffer: Buffer | ArrayBuffer,
): Promise<number> {
  const zip = await JSZip.loadAsync(buffer);

  const appXml = await zip.file("docProps/app.xml")?.async("string");
  if (appXml) {
    const match = appXml.match(/<Pages>(\d+)<\/Pages>/i);
    if (match) {
      const n = Number.parseInt(match[1]!, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }

  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return 1;

  const pageBr = (docXml.match(/<w:br[^>]*w:type="page"/g) || []).length;
  const pageBreakBefore = (docXml.match(/<w:pageBreakBefore/g) || []).length;
  const rendered = (docXml.match(/<w:lastRenderedPageBreak/g) || []).length;

  return Math.max(1, 1 + pageBr + pageBreakBefore + rendered);
}
