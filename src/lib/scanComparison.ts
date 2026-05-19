import type { ScanSummary } from "@/types/scan";

/** Scans sorted newest-first (same order as `/api/scans`). */
export function getPreviousScanScore(
  scans: ScanSummary[],
  activeScanId: string | null | undefined,
): number | null {
  if (scans.length < 2) return null;

  const currentIndex = activeScanId
    ? scans.findIndex((s) => s.id === activeScanId)
    : 0;

  const index = currentIndex >= 0 ? currentIndex : 0;
  return scans[index + 1]?.score ?? null;
}

export function formatScoreDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}
