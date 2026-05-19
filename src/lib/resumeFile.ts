const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
} as const;

export type ResumeFormat = (typeof ACCEPTED_TYPES)[keyof typeof ACCEPTED_TYPES];

export function getFormatFromMime(mime: string): ResumeFormat | null {
  return ACCEPTED_TYPES[mime as keyof typeof ACCEPTED_TYPES] ?? null;
}

export function getFormatFromName(filename: string): ResumeFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  return null;
}

export const RESUME_FILE_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isAcceptedResumeFile(file: File): boolean {
  return (
    getFormatFromMime(file.type) !== null ||
    getFormatFromName(file.name) !== null
  );
}
