"use client";

import { useState } from "react";
import { SignInOverlay } from "@/components/SignInOverlay";
import { ScanHistory } from "@/components/ScanHistory";
import { CompareScans } from "@/components/CompareScans";
import { AdvancedJobSettings } from "@/components/AdvancedJobSettings";
import { UploadForm } from "@/components/UploadForm";
import { hasJobSearchContext } from "@/lib/jobContext";
import type { JobSearchContext } from "@/types/jobContext";

type Tab = "upload" | "scans" | "compare" | "settings";

export type UploadWorkspaceTab = Tab;

type Props = {
  onAnalyze: (file: File) => void;
  jobContext: JobSearchContext;
  onJobContextChange: (value: JobSearchContext) => void;
  loading: boolean;
  activeScanId?: string | null;
  historyRefreshKey?: number;
  onSelectScan: (scanId: string) => void;
  className?: string;
  defaultTab?: Tab;
  /** Omit outer card when embedded inside another shell (e.g. modal). */
  nested?: boolean;
};

const tabs: { id: Tab; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "scans", label: "Previous Scans" },
  { id: "compare", label: "Compare Scans" },
  { id: "settings", label: "Advanced" },
];

export function UploadWorkspace({
  onAnalyze,
  jobContext,
  onJobContextChange,
  loading,
  activeScanId,
  historyRefreshKey = 0,
  onSelectScan,
  className = "",
  defaultTab = "upload",
  nested = false,
}: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div
      className={`flex h-full w-full overflow-hidden ${
        nested ? "" : "app-card glow-accent"
      } ${className}`}
    >
      <nav
        className="flex w-28 shrink-0 flex-col self-stretch border-r border-border bg-surface-elevated sm:w-36"
        aria-label="Upload sections"
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          const showDot =
            item.id === "settings" && hasJobSearchContext(jobContext);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`border-l-2 px-3 py-4 text-left text-xs font-medium transition sm:px-4 sm:text-sm ${
                active
                  ? "border-accent bg-accent-muted text-foreground"
                  : "border-transparent text-muted hover:bg-subtle hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {item.label}
                {showDot && !active && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="relative grid min-h-0 min-w-0 flex-1 [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:h-full">
        <div
          className={`h-full min-w-0 ${tab === "upload" ? "" : "pointer-events-none invisible"}`}
          aria-hidden={tab !== "upload"}
        >
          <UploadForm embedded onAnalyze={onAnalyze} loading={loading} />
        </div>
        <div
          className={`h-full min-w-0 ${tab === "settings" ? "" : "pointer-events-none invisible"}`}
          aria-hidden={tab !== "settings"}
        >
          <AdvancedJobSettings
            value={jobContext}
            onChange={onJobContextChange}
            disabled={loading}
          />
        </div>
        <div
          className={`relative h-full min-h-0 min-w-0 ${tab === "scans" ? "" : "pointer-events-none invisible"}`}
          aria-hidden={tab !== "scans"}
        >
          <ScanHistory
            embedded
            activeScanId={activeScanId}
            refreshKey={historyRefreshKey}
            onSelect={onSelectScan}
          />
          {tab === "scans" && (
            <SignInOverlay description="Sign in to view and reopen your saved resume analyses." />
          )}
        </div>
        <div
          className={`relative h-full min-h-0 min-w-0 ${tab === "compare" ? "" : "pointer-events-none invisible"}`}
          aria-hidden={tab !== "compare"}
        >
          <CompareScans embedded />
          {tab === "compare" && (
            <SignInOverlay description="Sign in to compare two saved resume analyses side by side." />
          )}
        </div>
      </div>
    </div>
  );
}
