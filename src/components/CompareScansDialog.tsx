"use client";

import { useEffect } from "react";
import { CompareScans } from "@/components/CompareScans";
import { SignInOverlay } from "@/components/SignInOverlay";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CompareScansDialog({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="modal-overlay absolute inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-scans-dialog-title"
        className="relative flex max-h-[min(90vh,44rem)] w-full max-w-2xl flex-col overflow-hidden app-card shadow-lg shadow-neutral-900/10"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2
              id="compare-scans-dialog-title"
              className="text-sm font-semibold text-foreground"
            >
              Compare Scans
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Side-by-side scores and feedback across two analyses
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-subtle-hover hover:text-foreground"
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
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <CompareScans embedded hideHeader />
          <SignInOverlay description="Sign in to compare two saved resume analyses side by side." />
        </div>
      </div>
    </div>
  );
}
