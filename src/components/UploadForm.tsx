"use client";

import { useEffect, useRef, useState } from "react";
import { validateResumePageCountClient } from "@/lib/validateResumePagesClient";

type Props = {
  onAnalyze: (file: File) => void;
  loading: boolean;
  /** Render inside UploadWorkspace without an outer card. */
  embedded?: boolean;
};

export function UploadForm({ onAnalyze, loading, embedded = false }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [pageWarning, setPageWarning] = useState<string | null>(null);
  const [checkingPages, setCheckingPages] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPageWarning(null);
      setCheckingPages(false);
      return;
    }

    let cancelled = false;
    setCheckingPages(true);
    setPageWarning(null);

    void validateResumePageCountClient(file).then((result) => {
      if (cancelled) return;
      setCheckingPages(false);
      if (!result.ok) {
        setPageWarning(result.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [file]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (file && !pageWarning && !checkingPages) {
      onAnalyze(file);
    }
  }

  const submitDisabled = loading || !file || checkingPages || Boolean(pageWarning);

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full p-6 sm:p-8 ${
        embedded
          ? "flex h-full min-h-0 flex-col"
          : "app-card glow-accent"
      }`}
    >
      <label
        htmlFor="resume-file"
        className={`upload-zone flex cursor-pointer flex-col items-center justify-center px-8 py-12 ${
          embedded
            ? "min-h-0 flex-1"
            : "min-h-[14rem] sm:min-h-[18rem] sm:py-14"
        }`}
      >
        <span className="text-4xl sm:text-5xl">📄</span>
        <span className="mt-4 text-center text-base font-medium text-foreground sm:text-lg">
          {file ? file.name : "Drop or click to upload"}
        </span>
        <span className="mt-2 text-center text-sm text-muted">
          PDF or DOCX — max 5 MB, up to 3 pages
        </span>
        <input
          ref={inputRef}
          id="resume-file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {checkingPages && file && (
        <p className="mt-4 text-center text-sm text-muted" role="status">
          Checking page count…
        </p>
      )}

      {pageWarning && (
        <div
          className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {pageWarning}
        </div>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="btn-primary mt-6 w-full shrink-0"
      >
        {loading ? "Analyzing with AI…" : "Get AI feedback"}
      </button>
      {loading && (
        <div
          className="mt-3 flex items-center justify-center gap-2.5 text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-accent"
            aria-hidden
          />
          <p>This usually takes 15–30 seconds…</p>
        </div>
      )}
    </form>
  );
}
