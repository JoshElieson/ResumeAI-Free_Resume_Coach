"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthButton } from "@/components/AuthButton";
import { ScanHistory } from "@/components/ScanHistory";
import { ScanHistoryPlaceholder } from "@/components/ScanHistoryPlaceholder";
import { SignInPrompt } from "@/components/SignInPrompt";
import { SocialLinks } from "@/components/SocialLinks";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { ResultsColumns } from "@/components/ResultsColumns";
import { OverallFeedbackCard } from "@/components/OverallFeedbackCard";
import { ResumeChatbot } from "@/components/ResumeChatbot";
import { AdvancedTabModal } from "@/components/AdvancedTabModal";
import { UploadWorkspace } from "@/components/UploadWorkspace";
import {
  hasJobSearchContext,
  loadJobContextFromStorage,
  saveJobContextToStorage,
} from "@/lib/jobContext";
import { readJsonResponse } from "@/lib/readJsonResponse";
import { validateResumePageCountClient } from "@/lib/validateResumePagesClient";
import {
  clearActiveScanId,
  clearGuestView,
  getScanIdFromUrl,
  loadActiveScanId,
  loadGuestView,
  saveActiveScanId,
  saveGuestView,
  setScanIdInUrl,
  shouldRestoreViewOnLoad,
} from "@/lib/viewPersistence";
import type { FeedbackResponse } from "@/types/feedback";
import {
  EMPTY_JOB_SEARCH_CONTEXT,
  type JobSearchContext,
} from "@/types/jobContext";

const ResumeViewer = dynamic(
  () =>
    import("@/components/ResumeViewer").then((mod) => mod.ResumeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-white/10 bg-surface text-sm text-muted">
        Loading resume viewer…
      </div>
    ),
  },
);

type AnalysisResult = {
  resumeText: string;
  feedback: FeedbackResponse;
};

const SIGN_IN_PROMPT_DISMISSED_KEY = "sign-in-prompt-dismissed";
const SESSION_LAST_SCORE_KEY = "resume-last-score";

export default function Home() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [sessionPreviousScore, setSessionPreviousScore] = useState<
    number | null
  >(null);
  const uploadPanelRef = useRef<HTMLDivElement>(null);
  const [chatbotHeightPx, setChatbotHeightPx] = useState<number | undefined>(
    undefined,
  );
  const [jobContext, setJobContext] = useState<JobSearchContext>(
    EMPTY_JOB_SEARCH_CONTEXT,
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [restoringView, setRestoringView] = useState(
    () =>
      typeof window !== "undefined" && shouldRestoreViewOnLoad(),
  );
  const restoreAttemptedRef = useRef(false);

  const isSignedIn = status === "authenticated";

  useEffect(() => {
    setJobContext(loadJobContextFromStorage());
  }, []);

  useEffect(() => {
    saveJobContextToStorage(jobContext);
  }, [jobContext]);

  function resetView() {
    setResult(null);
    setUploadedFile(null);
    setError(null);
    setShowSignInPrompt(false);
    setActiveIndex(null);
    setActiveScanId(null);
    setSessionPreviousScore(null);
    setRestoringView(false);
    clearGuestView();
    clearActiveScanId();
    setScanIdInUrl(null);
  }

  async function handleAnalyze(file: File) {
    setError(null);
    setShowSignInPrompt(false);
    setLoading(true);
    setActiveIndex(null);
    setActiveScanId(null);
    clearGuestView();

    try {
      const pageCheck = await validateResumePageCountClient(file);
      if (!pageCheck.ok) {
        setError(pageCheck.message);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetRole", jobContext.targetRole);
      formData.append("targetCompanies", jobContext.targetCompanies);
      formData.append("industry", jobContext.industry);
      formData.append("additionalNotes", jobContext.additionalNotes);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await readJsonResponse<{
        error?: string;
        resumeText: string;
        feedback: AnalysisResult["feedback"];
        scanId?: string;
        rateLimit?: { promptSignIn?: boolean };
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      setUploadedFile(file);
      if (!session?.user) {
        const raw = sessionStorage.getItem(SESSION_LAST_SCORE_KEY);
        const parsed = raw !== null && raw !== "" ? Number.parseFloat(raw) : NaN;
        setSessionPreviousScore(Number.isFinite(parsed) ? parsed : null);
        sessionStorage.setItem(
          SESSION_LAST_SCORE_KEY,
          String(data.feedback.score),
        );
      } else {
        setSessionPreviousScore(null);
      }
      const analysis: AnalysisResult = {
        resumeText: data.resumeText,
        feedback: data.feedback,
      };
      setResult(analysis);
      if (data.scanId) {
        clearGuestView();
        setActiveScanId(data.scanId);
        saveActiveScanId(data.scanId);
        setScanIdInUrl(data.scanId);
        setHistoryRefreshKey((k) => k + 1);
      } else {
        if (!session?.user) {
          saveGuestView(analysis);
        } else {
          clearGuestView();
        }
      }

      const dismissed =
        sessionStorage.getItem(SIGN_IN_PROMPT_DISMISSED_KEY) === "1";
      if (!session?.user && data.rateLimit?.promptSignIn && !dismissed) {
        setShowSignInPrompt(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const loadSavedScan = useCallback(async (scanId: string) => {
    setLoadingScan(true);
    setError(null);
    setActiveIndex(null);

    try {
      const [scanRes, fileRes] = await Promise.all([
        fetch(`/api/scans/${scanId}`),
        fetch(`/api/scans/${scanId}/file`),
      ]);

      const scanData = await readJsonResponse<{
        error?: string;
        scan: AnalysisResult & {
          id: string;
          fileName: string;
          mimeType: string;
        };
      }>(scanRes);
      if (!scanRes.ok) {
        throw new Error(scanData.error ?? "Could not load scan");
      }

      const scan = scanData.scan as AnalysisResult & {
        id: string;
        fileName: string;
        mimeType: string;
      };

      let file: File | null = null;
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        file = new File([blob], scan.fileName, {
          type: scan.mimeType || blob.type,
        });
      }

      clearGuestView();
      setActiveScanId(scanId);
      saveActiveScanId(scanId);
      setScanIdInUrl(scanId);
      setSessionPreviousScore(null);
      setUploadedFile(file);
      setResult({
        resumeText: scan.resumeText,
        feedback: scan.feedback,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load scan");
      clearActiveScanId();
      setScanIdInUrl(null);
    } finally {
      setLoadingScan(false);
    }
  }, []);

  function handleResolveAnnotation(index: number) {
    setResult((prev) => {
      if (!prev) return prev;
      const annotations = prev.feedback.annotations.filter((_, i) => i !== index);
      const next: AnalysisResult = {
        ...prev,
        feedback: { ...prev.feedback, annotations },
      };
      if (!session?.user) {
        saveGuestView(next);
      }
      return next;
    });
    setActiveIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  }

  const showResults = Boolean(result);
  const viewMode =
    showResults || loadingScan || restoringView ? "results" : "upload";
  const headerTagline = isSignedIn
    ? "Upload your resume for a score, highlights, and actionable feedback. Signed-in scans are saved to your history."
    : "Upload your resume for a score, highlights, and actionable feedback. Sign in to save your scans.";

  useEffect(() => {
    if (status === "loading") return;
    if (restoreAttemptedRef.current) return;

    let scanId = getScanIdFromUrl() ?? loadActiveScanId();

    if (scanId) {
      if (isSignedIn) {
        restoreAttemptedRef.current = true;
        setRestoringView(true);
        void loadSavedScan(scanId).finally(() => setRestoringView(false));
        return;
      }
      clearActiveScanId();
      setScanIdInUrl(null);
      scanId = null;
    }

    if (!isSignedIn) {
      const guest = loadGuestView();
      if (guest) {
        restoreAttemptedRef.current = true;
        setResult(guest);
        setRestoringView(false);
        return;
      }
    }

    restoreAttemptedRef.current = true;
    setRestoringView(false);
  }, [status, isSignedIn, loadSavedScan]);

  useEffect(() => {
    if (status === "loading") return;
    if (activeScanId) {
      saveActiveScanId(activeScanId);
      setScanIdInUrl(activeScanId);
    } else if (
      !showResults &&
      !restoringView &&
      !getScanIdFromUrl() &&
      !loadActiveScanId()
    ) {
      clearActiveScanId();
      setScanIdInUrl(null);
    }
  }, [activeScanId, showResults, restoringView, status]);

  useEffect(() => {
    if (showResults) {
      setChatbotHeightPx(undefined);
      return;
    }

    const node = uploadPanelRef.current;
    if (!node) return;

    const lg = window.matchMedia("(min-width: 1024px)");

    const syncHeight = () => {
      if (lg.matches) {
        setChatbotHeightPx(node.getBoundingClientRect().height);
      } else {
        setChatbotHeightPx(undefined);
      }
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(node);
    lg.addEventListener("change", syncHeight);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      lg.removeEventListener("change", syncHeight);
      window.removeEventListener("resize", syncHeight);
    };
  }, [showResults]);

  return (
    <main className="app-bg flex min-h-dvh flex-col">
      <header className="relative z-[100] shrink-0 overflow-visible border-b border-white/10 bg-navy-mid/80 backdrop-blur-md">
        <div
          className={`mx-auto w-full px-4 py-5 sm:px-6 ${
            showResults ? "max-w-[96rem]" : "max-w-7xl"
          }`}
        >
          <div
            className={
              showResults
                ? "flex gap-6"
                : "flex w-full items-center justify-between gap-6"
            }
          >
            <div className="w-[26rem] shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                ResumeAI
              </h1>
              <p className="mt-1 text-sm text-muted">{headerTagline}</p>
            </div>
            {showResults ? (
              <div className="grid min-w-0 flex-1 gap-6 xl:max-w-7xl xl:grid-cols-[1fr_380px] xl:items-center">
                <div aria-hidden className="hidden xl:block" />
                <div className="relative z-[110] flex shrink-0 flex-wrap items-center justify-end gap-3">
                  <AuthButton />
                </div>
              </div>
            ) : (
              <div className="relative z-[110] flex shrink-0 flex-wrap items-center justify-end gap-3">
                <AuthButton />
              </div>
            )}
          </div>
        </div>
      </header>

      <section
        className={`relative z-0 mx-auto flex min-h-0 w-full flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 ${
          showResults ? "max-w-[96rem]" : "max-w-7xl"
        }`}
      >
        {error && showResults && (
          <div className="shrink-0 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <SignInPrompt
          open={showResults && showSignInPrompt && !isSignedIn}
          onDismiss={() => {
            setShowSignInPrompt(false);
            sessionStorage.setItem(SIGN_IN_PROMPT_DISMISSED_KEY, "1");
          }}
        />

        {viewMode === "upload" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8 sm:py-12 lg:items-stretch">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 lg:w-[min(100%,80rem)] lg:max-w-7xl">
                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start">
                  <div ref={uploadPanelRef} className="min-h-0 min-w-0">
                    <UploadWorkspace
                      className="h-full"
                      onAnalyze={handleAnalyze}
                      jobContext={jobContext}
                      onJobContextChange={setJobContext}
                      loading={loading}
                      activeScanId={activeScanId}
                      historyRefreshKey={historyRefreshKey}
                      onSelectScan={(id) => void loadSavedScan(id)}
                    />
                  </div>
                  <ResumeChatbot
                    className="min-h-0 w-full shrink-0 lg:w-80"
                    hasResumeContext={Boolean(result?.resumeText)}
                    heightPx={chatbotHeightPx}
                    jobContext={jobContext}
                    resumeText={result?.resumeText}
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-300">
                    <p>{error}</p>
                  </div>
                )}
              </div>
          </div>
        ) : !showResults ? (
          <div className="app-card flex min-h-[480px] flex-1 items-center justify-center text-sm text-muted">
            Restoring your scan…
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-6">
            <div className="flex w-[17rem] shrink-0 flex-col gap-4 self-start">
              {isSignedIn ? (
                <ScanHistory
                  activeScanId={activeScanId}
                  refreshKey={historyRefreshKey}
                  onSelect={(id) => void loadSavedScan(id)}
                  onScanDeleted={(id) => {
                    if (id === activeScanId) resetView();
                  }}
                />
              ) : (
                <ScanHistoryPlaceholder />
              )}
              <OverallFeedbackCard feedback={result!.feedback} />
            </div>
            <ResultsColumns
              className="overflow-auto xl:max-w-7xl"
              resume={
                loadingScan ? (
                  <div className="app-card flex min-h-[480px] items-center justify-center text-sm text-muted">
                    Loading saved scan…
                  </div>
                ) : (
                  <ResumeViewer
                    pdfFile={uploadedFile}
                    resumeText={result!.resumeText}
                    annotations={result!.feedback.annotations}
                    activeIndex={activeIndex}
                    onSelectAnnotation={setActiveIndex}
                    onAnalyzeFile={(file) => void handleAnalyze(file)}
                    onOpenAdvanced={() => setAdvancedOpen(true)}
                    analyzing={loading}
                    showAdvancedDot={hasJobSearchContext(jobContext)}
                  />
                )
              }
              sidebar={
                <FeedbackPanel
                  feedback={result!.feedback}
                  activeIndex={activeIndex}
                  onSelectAnnotation={setActiveIndex}
                  onResolveAnnotation={handleResolveAnnotation}
                  activeScanId={activeScanId}
                  historyRefreshKey={historyRefreshKey}
                  sessionPreviousScore={sessionPreviousScore}
                  jobContext={jobContext}
                  resumeText={result!.resumeText}
                />
              }
            />
          </div>
        )}
      </section>

      <AdvancedTabModal
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        onAnalyze={handleAnalyze}
        jobContext={jobContext}
        onJobContextChange={setJobContext}
        loading={loading}
        activeScanId={activeScanId}
        historyRefreshKey={historyRefreshKey}
        onSelectScan={(id) => {
          setAdvancedOpen(false);
          void loadSavedScan(id);
        }}
      />

      <SocialLinks />
    </main>
  );
}
