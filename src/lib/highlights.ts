import type { Annotation, HighlightSegment } from "@/types/feedback";

type Span = {
  start: number;
  end: number;
  annotation: Annotation;
};

export function findTextSpan(
  resume: string,
  annotation: Annotation,
): { start: number; end: number } | null {
  const trimmed = annotation.text.trim();
  if (!trimmed) return null;

  let index = resume.indexOf(trimmed);
  if (index !== -1) {
    return { start: index, end: index + trimmed.length };
  }

  const lowerResume = resume.toLowerCase();
  const lowerQuote = trimmed.toLowerCase();
  index = lowerResume.indexOf(lowerQuote);
  if (index !== -1) {
    return { start: index, end: index + trimmed.length };
  }

  const normalizedResume = resume.replace(/\s+/g, " ");
  const normalizedQuote = trimmed.replace(/\s+/g, " ");
  const normIndex = normalizedResume.indexOf(normalizedQuote);
  if (normIndex === -1) return null;

  let normPos = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < resume.length; i++) {
    if (/\s/.test(resume[i]!) && (normPos === 0 || normalizedResume[normPos - 1] === " ")) {
      continue;
    }
    if (normPos === normIndex) start = i;
    if (normPos === normIndex + normalizedQuote.length) {
      end = i;
      break;
    }
    normPos++;
  }
  if (start === -1) return null;
  if (end === -1) end = resume.length;
  return { start, end };
}

export function buildHighlightSegments(
  resume: string,
  annotations: Annotation[],
): HighlightSegment[] {
  const spans: Span[] = [];

  for (const annotation of annotations) {
    const found = findTextSpan(resume, annotation);
    if (!found) continue;
    spans.push({
      start: found.start,
      end: found.end,
      annotation,
    });
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: Span[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start < last.end) {
      if (span.end > last.end) last.end = span.end;
      continue;
    }
    merged.push({ ...span });
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const span of merged) {
    if (span.start > cursor) {
      segments.push({ text: resume.slice(cursor, span.start) });
    }
    segments.push({
      text: resume.slice(span.start, span.end),
      annotation: span.annotation,
    });
    cursor = span.end;
  }

  if (cursor < resume.length) {
    segments.push({ text: resume.slice(cursor) });
  }

  if (segments.length === 0) {
    return [{ text: resume }];
  }

  return segments;
}
