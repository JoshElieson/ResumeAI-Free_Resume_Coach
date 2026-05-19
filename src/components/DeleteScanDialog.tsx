"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  fileName: string;
  dontAskAgain: boolean;
  onDontAskAgainChange: (checked: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  deleting?: boolean;
};

export function DeleteScanDialog({
  open,
  fileName,
  dontAskAgain,
  onDontAskAgainChange,
  onConfirm,
  onCancel,
  deleting = false,
}: Props) {
  const deleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    deleteRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        disabled={deleting}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm disabled:cursor-not-allowed"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-scan-title"
        className="relative w-full max-w-md app-card p-6 shadow-xl shadow-black/40"
      >
        <h2
          id="delete-scan-title"
          className="text-lg font-semibold text-foreground"
        >
          Delete scan?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Delete &ldquo;{fileName}&rdquo;? This cannot be undone.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={dontAskAgain}
            disabled={deleting}
            onChange={(e) => onDontAskAgainChange(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-surface-elevated text-accent focus:ring-2 focus:ring-accent/30 focus:ring-offset-0"
          />
          Don&apos;t ask again
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            ref={deleteRef}
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
