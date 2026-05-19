const MAX_COPIED_COMMENTS = 3;
const COPIED_COMMENT_PREVIEW_WORDS = 8;

export { MAX_COPIED_COMMENTS, COPIED_COMMENT_PREVIEW_WORDS };

const LABELED_NOTE_PATTERN =
  /^Resume line:\s*"([\s\S]*?)"\s*\nFeedback:\s*([\s\S]+)$/;
const LEGACY_NOTE_PATTERN =
  /^About this line on my resume:\s*"([\s\S]*?)"(?:\s*\n\s*\n([\s\S]+))?$/;

export type ChatCopiedAnnotation = {
  text: string;
  feedback: string;
};

/** Full note payload sent to the chatbot (resume quote + coach feedback). */
export function formatAnnotationForChat(ann: ChatCopiedAnnotation): string {
  return `Resume line: "${ann.text}"\nFeedback: ${ann.feedback}`;
}

function parseCopiedComment(comment: string): {
  resumeLine: string;
  feedback: string;
} | null {
  const trimmed = comment.trim();
  const labeled = trimmed.match(LABELED_NOTE_PATTERN);
  if (labeled) {
    return { resumeLine: labeled[1].trim(), feedback: labeled[2].trim() };
  }
  const legacy = trimmed.match(LEGACY_NOTE_PATTERN);
  if (legacy) {
    return {
      resumeLine: legacy[1].trim(),
      feedback: legacy[2]?.trim() ?? "",
    };
  }
  return null;
}

function stripTrailingEllipsis(text: string): string {
  return text.replace(/(?:\.{2,}|…)\s*$/u, "").trim();
}

function truncateToWords(text: string, maxWords: number): string {
  const normalized = stripTrailingEllipsis(text.replace(/\s+/g, " "));
  if (!normalized) return "";

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

/** Resume line (or feedback) for the chip — full text is still sent to the API. */
function previewSourceFromComment(comment: string): string {
  const parsed = parseCopiedComment(comment);
  if (!parsed) return comment.trim();
  return parsed.resumeLine || parsed.feedback || comment.trim();
}

/** First few words of a copied note, with "..." when truncated (single-line label). */
export function formatCopiedCommentPreview(
  comment: string,
  maxWords = COPIED_COMMENT_PREVIEW_WORDS,
): string {
  return truncateToWords(previewSourceFromComment(comment), maxWords);
}

export function buildChatSubmitMessage(
  comments: string[],
  userInput: string,
): string {
  const trimmed = userInput.trim();
  const commentBlock = comments
    .map((comment, index) => `--- Resume note ${index + 1} ---\n${comment}`)
    .join("\n\n");

  if (trimmed && commentBlock) {
    return `${trimmed}\n\n${commentBlock}`;
  }
  return trimmed || commentBlock;
}

