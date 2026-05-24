"use client";

import { SignInOverlay } from "@/components/SignInOverlay";

/** Max scan rows visible in signed-in history (matches ScanHistory). */
const VISIBLE_SCAN_COUNT = 5;
const SCAN_ROW_HEIGHT_REM = 3.375;
const SCAN_LIST_GAP_REM = 0.25;
const scanListMaxHeight = `calc(${VISIBLE_SCAN_COUNT} * ${SCAN_ROW_HEIGHT_REM}rem + ${VISIBLE_SCAN_COUNT - 1} * ${SCAN_LIST_GAP_REM}rem)`;

export function ScanHistoryPlaceholder() {
  return (
    <aside className="app-card relative z-20 flex w-full flex-col !overflow-visible">
      <div className="app-card-header px-4 py-3">
        <nav
          className="flex items-center justify-between gap-2"
          aria-label="Scan history sections"
        >
          <span className="rounded-md bg-accent-muted px-2.5 py-1 text-sm font-semibold text-foreground">
            Your scans
          </span>
          <span
            className="cursor-not-allowed rounded-md px-2.5 py-1 text-sm font-medium text-muted opacity-50"
            aria-disabled
          >
            Compare Scans
          </span>
        </nav>
      </div>

      <div
        className="relative overflow-hidden"
        style={{ minHeight: scanListMaxHeight, maxHeight: scanListMaxHeight }}
      >
        <ul className="space-y-1 p-2 opacity-40" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5">
                <div className="h-4 w-3/4 rounded bg-subtle-hover" />
                <div className="mt-2 flex justify-between gap-2">
                  <div className="h-3 w-16 rounded bg-subtle" />
                  <div className="h-3 w-8 rounded bg-subtle" />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <SignInOverlay
          title="Sign in to access scan history"
          description="Save and reopen your past resume analyses anytime."
        />
      </div>
    </aside>
  );
}
