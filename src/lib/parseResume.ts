import mammoth from "mammoth";
import type { ResumeFormat } from "@/lib/resumeFile";

export type { ResumeFormat } from "@/lib/resumeFile";
export {
  getFormatFromMime,
  getFormatFromName,
  isAcceptedResumeFile,
  RESUME_FILE_ACCEPT,
} from "@/lib/resumeFile";

export async function extractTextFromFile(
  buffer: Buffer,
  format: ResumeFormat,
): Promise<string> {
  if (format === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (format === "pdf") {
    const { extractPdfText } = await import("@/lib/extractPdfText");
    return extractPdfText(buffer);
  }

  throw new Error("Unsupported file format");
}
