"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { CompareScansDialog } from "@/components/CompareScansDialog";
import { DeleteScanDialog } from "@/components/DeleteScanDialog";
import {
  setSkipDeleteConfirm,
  shouldSkipDeleteConfirm,
} from "@/lib/deleteConfirm";
import { getScoreTier } from "@/lib/scoreScale";
import type { ScanSummary } from "@/types/scan";

type Props = {
  activeScanId?: string | null;
  refreshKey?: number;
  onSelect: (scanId: string) => void;
  onScanDeleted?: (scanId: string) => void;
  /** Render inside UploadWorkspace without an outer card. */
  embedded?: boolean;
};

function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Max scan rows visible before the list scrolls. */
const VISIBLE_SCAN_COUNT = 5;
/** ~one scan row (button + meta) plus list gap */
const SCAN_ROW_HEIGHT_REM = 3.375;
const SCAN_LIST_GAP_REM = 0.25;
const scanListMaxHeight = `calc(${VISIBLE_SCAN_COUNT} * ${SCAN_ROW_HEIGHT_REM}rem + ${VISIBLE_SCAN_COUNT - 1} * ${SCAN_LIST_GAP_REM}rem)`;

export function ScanHistory({
  activeScanId,
  refreshKey = 0,
  onSelect,
  onScanDeleted,
  embedded = false,
}: Props) {
  const { data: session, status } = useSession();
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScanSummary | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const isSignedIn = status === "authenticated" && Boolean(session?.user);

  const loadScans = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load history");
      setScans(data.scans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history");
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (isSignedIn) void loadScans();
    if (status === "unauthenticated") setScans([]);
  }, [status, isSignedIn, loadScans, refreshKey]);

  async function performDelete(scan: ScanSummary) {
    setDeletingId(scan.id);
    setError(null);
    try {
      const res = await fetch(`/api/scans/${scan.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete scan");

      setScans((prev) => prev.filter((s) => s.id !== scan.id));
      onScanDeleted?.(scan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete scan");
    } finally {
      setDeletingId(null);
    }
  }

  function requestDelete(scan: ScanSummary) {
    if (!isSignedIn || deletingId) return;
    if (shouldSkipDeleteConfirm()) {
      void performDelete(scan);
      return;
    }
    setDontAskAgain(false);
    setPendingDelete(scan);
  }

  function cancelDelete() {
    if (deletingId) return;
    setPendingDelete(null);
    setDontAskAgain(false);
  }

  function confirmDelete() {
    if (!pendingDelete || deletingId) return;
    if (dontAskAgain) setSkipDeleteConfirm(true);
    const scan = pendingDelete;
    setPendingDelete(null);
    setDontAskAgain(false);
    void performDelete(scan);
  }

  if (!embedded && !isSignedIn) {
    return null;
  }

  const cardClass = embedded
    ? "flex h-full min-h-0 w-full flex-col"
    : "app-card flex w-full flex-col";

  const needsScroll = scans.length >= VISIBLE_SCAN_COUNT;
  const listClass = embedded
    ? `flex min-h-0 flex-1 flex-col p-2 ${needsScroll ? "overflow-y-auto" : "overflow-hidden"}`
    : "overflow-y-auto p-2";

  const emptyPlaceholder =
    (!isSignedIn && embedded) ||
    (isSignedIn && loading && scans.length === 0) ||
    (isSignedIn && !loading && !error && scans.length === 0);

  return (
    <aside className={cardClass}>
      <div
        className={`px-4 py-3 ${embedded ? "border-b border-white/10" : "app-card-header"}`}
      >
        {embedded ? (
          <h2 className="text-sm font-semibold text-foreground">Previous Scans</h2>
        ) : (
          <nav
            className="flex items-center justify-between gap-2"
            aria-label="Scan history sections"
          >
            <span className="rounded-md bg-accent/15 px-2.5 py-1 text-sm font-semibold text-foreground">
              Your scans
            </span>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="rounded-md px-2.5 py-1 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
            >
              Compare Scans
            </button>
          </nav>
        )}
      </div>

      <div
        className={listClass}
        style={
          !embedded && needsScroll ? { maxHeight: scanListMaxHeight } : undefined
        }
      >
        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}
        {emptyPlaceholder && (
          <div className="flex flex-1 flex-col items-center justify-center px-2">
            {!isSignedIn && embedded && (
              <p className="max-w-xs text-center text-xs leading-relaxed text-muted">
                Your past analyses will appear here after you sign in.
              </p>
            )}
            {isSignedIn && loading && scans.length === 0 && (
              <p className="text-center text-xs text-muted">Loading…</p>
            )}
            {isSignedIn && !loading && !error && scans.length === 0 && (
              <p className="max-w-xs text-center text-xs leading-relaxed text-muted">
                Analyses you run while signed in appear here.
              </p>
            )}
          </div>
        )}
        {scans.length > 0 && (
        <ul
          className={`space-y-1 ${embedded && needsScroll ? "min-h-0 flex-1" : ""}`}
        >
          {scans.map((scan) => {
            const isActive = activeScanId === scan.id;
            const isDeleting = deletingId === scan.id;
            return (
              <li key={scan.id} className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(scan.id)}
                  disabled={!isSignedIn || isDeleting}
                  className={`min-w-0 flex-1 cursor-pointer overflow-hidden rounded-lg border px-3 py-2.5 text-left transition ${
                    isActive
                      ? "border-accent/50 bg-[#1e1c38] hover:bg-[#252347]"
                      : "border-white/5 bg-[#151d2e] hover:border-white/15 hover:bg-[#1a2438]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {scan.fileName}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted">
                      {formatWhen(scan.createdAt)}
                    </span>
                    <span
                      className="font-semibold tabular-nums"
                      style={{ color: getScoreTier(scan.score).color }}
                    >
                      {scan.score.toFixed(1)}
                    </span>
                  </div>
                </button>
                {isSignedIn && (
                  <button
                    type="button"
                    onClick={() => requestDelete(scan)}
                    disabled={isDeleting}
                    aria-label={`Delete ${scan.fileName}`}
                    className="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-[#151d2e] px-2 text-muted transition hover:border-rose-500/40 hover:bg-[#2a1a22] hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        )}
      </div>

      <DeleteScanDialog
        open={pendingDelete !== null}
        fileName={pendingDelete?.fileName ?? ""}
        dontAskAgain={dontAskAgain}
        onDontAskAgainChange={setDontAskAgain}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        deleting={Boolean(pendingDelete && deletingId === pendingDelete.id)}
      />

      {!embedded && (
        <CompareScansDialog
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </aside>
  );
}
