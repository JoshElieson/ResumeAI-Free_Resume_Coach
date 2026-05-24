"use client";

import { useEffect } from "react";
import { UploadWorkspace } from "@/components/UploadWorkspace";
import type { JobSearchContext } from "@/types/jobContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onAnalyze: (file: File) => void;
  jobContext: JobSearchContext;
  onJobContextChange: (value: JobSearchContext) => void;
  loading: boolean;
  activeScanId?: string | null;
  historyRefreshKey?: number;
  onSelectScan: (scanId: string) => void;
};

export function AdvancedTabModal({
  open,
  onClose,
  onAnalyze,
  jobContext,
  onJobContextChange,
  loading,
  activeScanId,
  historyRefreshKey = 0,
  onSelectScan,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        disabled={loading}
        onClick={onClose}
        className="modal-overlay absolute inset-0 disabled:cursor-not-allowed"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Advanced settings"
        className="app-card relative flex h-[min(36rem,85dvh)] w-full max-w-3xl flex-col overflow-hidden shadow-lg shadow-neutral-900/10"
      >
        <div className="flex shrink-0 justify-end px-4 pt-3 pb-1 sm:px-5 sm:pt-4 sm:pb-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-subtle-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <UploadWorkspace
          nested
          className="min-h-0 flex-1"
          defaultTab="settings"
          onAnalyze={onAnalyze}
          jobContext={jobContext}
          onJobContextChange={onJobContextChange}
          loading={loading}
          activeScanId={activeScanId}
          historyRefreshKey={historyRefreshKey}
          onSelectScan={onSelectScan}
        />
      </div>
    </div>
  );
}
