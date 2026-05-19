/** Maximum pages accepted for resume uploads (PDF or DOCX). */
export const MAX_RESUME_PAGES = 3;

export function tooManyPagesMessage(pageCount: number): string {
  return `Double-check that you uploaded the correct document. Is your resume really ${pageCount} pages?`;
}
