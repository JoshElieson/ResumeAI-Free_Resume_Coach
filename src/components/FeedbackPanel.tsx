"use client";

import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OverallFeedbackCard } from "@/components/OverallFeedbackCard";
import { ResumeChatbot } from "@/components/ResumeChatbot";
import {
  formatAnnotationForChat,
  MAX_COPIED_COMMENTS,
} from "@/lib/chatCompose";
import { formatScoreDelta, getPreviousScanScore } from "@/lib/scanComparison";
import { getScoreTier, scoreBarGlow } from "@/lib/scoreScale";
import type { Annotation, FeedbackResponse } from "@/types/feedback";
import type { JobSearchContext } from "@/types/jobContext";
import type { ScanSummary } from "@/types/scan";

const TYPE_BORDER: Record<Annotation["type"], string> = {
  strength: "border-l-emerald-400",
  weakness: "border-l-rose-400",
  suggestion: "border-l-amber-400",
};

const ALL_SECTION_TYPES: Annotation["type"][] = [
  "strength",
  "weakness",
  "suggestion",
];

/** Gap above the selected note when scrolling inline notes (px). */
const NOTE_SCROLL_TOP_OFFSET = 16;

function allSectionsCollapsed(): Set<Annotation["type"]> {
  return new Set(ALL_SECTION_TYPES);
}

const NOTE_SECTIONS: {
  type: Annotation["type"];
  label: string;
  headerClass: string;
}[] = [
  {
    type: "strength",
    label: "Strengths",
    headerClass: "text-emerald-400",
  },
  {
    type: "weakness",
    label: "Weaknesses",
    headerClass: "text-rose-400",
  },
  {
    type: "suggestion",
    label: "Suggestions",
    headerClass: "text-amber-400",
  },
];

type GroupedNote = { ann: Annotation; index: number };

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CopyToChatIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function ResolveNoteIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

type Props = {
  feedback: FeedbackResponse;
  activeIndex: number | null;
  onSelectAnnotation: (index: number) => void;
  onResolveAnnotation: (index: number) => void;
  activeScanId?: string | null;
  historyRefreshKey?: number;
  /** Last score from this browser session (signed-out users). */
  sessionPreviousScore?: number | null;
  /** When false, overall feedback is shown elsewhere (e.g. under scan history). */
  showOverallFeedback?: boolean;
  jobContext?: JobSearchContext;
  resumeText?: string | null;
};

function scoreDeltaBadgeClasses(delta: number): string {
  if (delta === 0) {
    return "text-muted bg-white/5 border-white/10";
  }
  if (delta > 1) {
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
  }
  if (delta > 0) {
    return "text-emerald-300 bg-emerald-500/5 border-emerald-500/15";
  }
  if (delta <= -1) {
    return "text-rose-400 bg-rose-500/10 border-rose-500/25";
  }
  return "text-amber-400 bg-amber-500/10 border-amber-500/25";
}

function ScoreDeltaBadge({ delta }: { delta: number }) {
  const color = scoreDeltaBadgeClasses(delta);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${color}`}
      title="Change from your previous scan"
    >
      {formatScoreDelta(delta)} vs last
    </span>
  );
}

export function FeedbackPanel({
  feedback,
  activeIndex,
  onSelectAnnotation,
  onResolveAnnotation,
  activeScanId,
  historyRefreshKey = 0,
  sessionPreviousScore = null,
  showOverallFeedback = false,
  jobContext,
  resumeText,
}: Props) {
  const { data: session, status } = useSession();
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<
    Set<Annotation["type"]>
  >(() => allSectionsCollapsed());
  const [copiedComments, setCopiedComments] = useState<string[]>([]);
  const [copyWarning, setCopyWarning] = useState<string | null>(null);
  const notesScrollRef = useRef<HTMLDivElement>(null);
  const noteItemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const pendingNoteScrollIndex = useRef<number | null>(null);

  const scrollActiveNoteToTop = useCallback((index: number) => {
    const container = notesScrollRef.current;
    const item = noteItemRefs.current.get(index);
    if (!container || !item) return;

    const scrollTop = Math.max(
      0,
      item.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        NOTE_SCROLL_TOP_OFFSET,
    );

    container.scrollTo({ top: scrollTop, behavior: "smooth" });
  }, []);

  const groupedNotes = useMemo(() => {
    const groups: Record<Annotation["type"], GroupedNote[]> = {
      strength: [],
      weakness: [],
      suggestion: [],
    };
    feedback.annotations.forEach((ann, index) => {
      groups[ann.type].push({ ann, index });
    });
    return groups;
  }, [feedback.annotations]);

  function toggleSection(type: Annotation["type"]) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const isSignedIn = status === "authenticated" && Boolean(session?.user);

  useEffect(() => {
    if (!isSignedIn) {
      setPreviousScore(sessionPreviousScore);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/scans");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const scans = (data.scans ?? []) as ScanSummary[];
        setPreviousScore(getPreviousScanScore(scans, activeScanId));
      } catch {
        if (!cancelled) setPreviousScore(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isSignedIn,
    activeScanId,
    historyRefreshKey,
    sessionPreviousScore,
    feedback.score,
  ]);

  const scoreDelta =
    previousScore !== null ? feedback.score - previousScore : null;

  const scoreTier = getScoreTier(feedback.score);

  useEffect(() => {
    setCollapsedSections(allSectionsCollapsed());
  }, [feedback]);

  useEffect(() => {
    if (!copyWarning) return;
    const id = window.setTimeout(() => setCopyWarning(null), 4000);
    return () => window.clearTimeout(id);
  }, [copyWarning]);

  useEffect(() => {
    if (activeIndex === null) return;
    const ann = feedback.annotations[activeIndex];
    if (!ann) return;

    pendingNoteScrollIndex.current = activeIndex;

    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete(ann.type);
      return next;
    });
  }, [activeIndex, feedback.annotations]);

  useLayoutEffect(() => {
    const index = pendingNoteScrollIndex.current;
    if (index === null) return;
    if (!noteItemRefs.current.has(index)) return;

    scrollActiveNoteToTop(index);
    pendingNoteScrollIndex.current = null;
  }, [activeIndex, collapsedSections, scrollActiveNoteToTop]);

  function handleCopyNoteToChat(ann: Annotation) {
    const text = formatAnnotationForChat(ann);
    setCopiedComments((prev) => {
      if (prev.length >= MAX_COPIED_COMMENTS) {
        setCopyWarning(
          `You can copy up to ${MAX_COPIED_COMMENTS} comments at a time.`,
        );
        return prev;
      }
      if (prev.includes(text)) {
        return prev;
      }
      setCopyWarning(null);
      return [...prev, text];
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="app-card shrink-0 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted">Resume score</p>
          {scoreDelta !== null && <ScoreDeltaBadge delta={scoreDelta} />}
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span
            className="text-5xl font-bold tabular-nums"
            style={{ color: scoreTier.color }}
          >
            {feedback.score.toFixed(1)}
          </span>
          <span className="pb-2 text-2xl text-muted/60">/ 10</span>
        </div>
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: scoreTier.color }}
        >
          {scoreTier.label}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(feedback.score / 10) * 100}%`,
              backgroundColor: scoreTier.color,
              boxShadow: scoreBarGlow(scoreTier.color),
            }}
          />
        </div>
      </div>

      {showOverallFeedback && (
        <div className="shrink-0">
          <OverallFeedbackCard feedback={feedback} />
        </div>
      )}

      <ResumeChatbot
        className="w-full shrink-0"
        hasResumeContext={Boolean(resumeText)}
        jobContext={jobContext}
        resumeText={resumeText}
        copiedComments={copiedComments}
        onCopiedCommentsChange={setCopiedComments}
        onRemoveCopiedComment={(index) =>
          setCopiedComments((prev) => prev.filter((_, i) => i !== index))
        }
        copyWarning={copyWarning}
      />

      <div className="app-card flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <h2 className="shrink-0 text-lg font-semibold text-foreground">
          Inline notes ({feedback.annotations.length})
        </h2>
        <div
          ref={notesScrollRef}
          className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain"
        >
          {NOTE_SECTIONS.map(({ type, label, headerClass }) => {
            const items = groupedNotes[type];
            const isOpen = !collapsedSections.has(type);

            return (
              <section
                key={type}
                className="overflow-hidden rounded-lg border border-white/5 bg-surface-elevated/40"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(type)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-surface-elevated/80"
                >
                  <ChevronIcon open={isOpen} />
                  <span className={`text-sm font-semibold ${headerClass}`}>
                    {label}
                  </span>
                  <span className="text-xs text-muted">({items.length})</span>
                </button>
                {isOpen && (
                  <ul className="space-y-2 border-t border-white/5 p-2">
                    {items.length === 0 ? (
                      <li className="px-2 py-3 text-center text-xs text-muted">
                        No {label.toLowerCase()} in this scan.
                      </li>
                    ) : (
                      items.map(({ ann, index }) => (
                          <li
                            key={index}
                            ref={(el) => {
                              if (el) {
                                noteItemRefs.current.set(index, el);
                              } else {
                                noteItemRefs.current.delete(index);
                              }
                            }}
                          >
                            <div
                              className={`flex gap-1 rounded-lg border border-white/5 border-l-4 bg-surface-elevated/80 transition hover:bg-surface-elevated ${TYPE_BORDER[ann.type]} ${
                                activeIndex === index
                                  ? "ring-2 ring-accent shadow-[0_0_20px_-6px_rgb(109_94_245_/_0.5)]"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  onSelectAnnotation(index);
                                  e.currentTarget.focus({ preventScroll: true });
                                }}
                                className="min-w-0 flex-1 p-3 text-left"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  &ldquo;{ann.text}&rdquo;
                                </p>
                                <p className="mt-2 border-t border-white/5 pt-2 text-sm text-muted">
                                  {ann.feedback}
                                </p>
                              </button>
                              <div className="flex shrink-0 flex-col justify-between py-2 pr-2">
                                <button
                                  type="button"
                                  title="Copy to ResumeAI Chatbot"
                                  aria-label="Copy to ResumeAI Chatbot"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyNoteToChat(ann);
                                  }}
                                  className="rounded-md p-1.5 text-muted transition hover:bg-white/10 hover:text-foreground"
                                >
                                  <CopyToChatIcon />
                                </button>
                                <button
                                  type="button"
                                  title="Resolve comment"
                                  aria-label="Resolve comment"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onResolveAnnotation(index);
                                  }}
                                  className="rounded-md p-1.5 text-muted transition hover:bg-white/10 hover:text-emerald-400"
                                >
                                  <ResolveNoteIcon />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
