"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { OverallFeedbackCard } from "@/components/OverallFeedbackCard";
import { ResumeChatbot } from "@/components/ResumeChatbot";
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

type Props = {
  feedback: FeedbackResponse;
  activeIndex: number | null;
  onSelectAnnotation: (index: number) => void;
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
      />

      <div className="app-card flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <h2 className="shrink-0 text-lg font-semibold text-foreground">
          Inline notes ({feedback.annotations.length})
        </h2>
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                          <li key={index}>
                            <button
                              type="button"
                              onClick={() => onSelectAnnotation(index)}
                              className={`w-full rounded-lg border border-white/5 border-l-4 bg-surface-elevated/80 p-3 text-left transition hover:bg-surface-elevated ${TYPE_BORDER[ann.type]} ${
                                activeIndex === index
                                  ? "ring-2 ring-accent shadow-[0_0_20px_-6px_rgb(109_94_245_/_0.5)]"
                                  : ""
                              }`}
                            >
                              <p className="text-sm font-medium text-foreground">
                                &ldquo;{ann.text}&rdquo;
                              </p>
                              <p className="mt-2 border-t border-white/5 pt-2 text-sm text-muted">
                                {ann.feedback}
                              </p>
                            </button>
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
