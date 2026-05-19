import type { FeedbackResponse } from "@/types/feedback";

export const SCAN_QUERY_PARAM = "scan";
const GUEST_VIEW_STORAGE_KEY = "resume-guest-view";
const ACTIVE_SCAN_STORAGE_KEY = "resume-active-scan-id";

export type PersistedGuestView = {
  resumeText: string;
  feedback: FeedbackResponse;
};

export function getScanIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(SCAN_QUERY_PARAM);
}

export function setScanIdInUrl(scanId: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (scanId) {
    url.searchParams.set(SCAN_QUERY_PARAM, scanId);
  } else {
    url.searchParams.delete(SCAN_QUERY_PARAM);
  }
  const next = url.search ? `${url.pathname}${url.search}` : url.pathname;
  window.history.replaceState(window.history.state, "", next);
}

export function saveGuestView(view: PersistedGuestView): void {
  try {
    sessionStorage.setItem(GUEST_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Storage full or unavailable
  }
}

export function loadGuestView(): PersistedGuestView | null {
  try {
    const raw = sessionStorage.getItem(GUEST_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGuestView;
    if (
      typeof parsed.resumeText !== "string" ||
      !parsed.feedback ||
      typeof parsed.feedback.score !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestView(): void {
  sessionStorage.removeItem(GUEST_VIEW_STORAGE_KEY);
}

export function saveActiveScanId(scanId: string): void {
  try {
    sessionStorage.setItem(ACTIVE_SCAN_STORAGE_KEY, scanId);
  } catch {
    // Storage unavailable
  }
}

export function loadActiveScanId(): string | null {
  try {
    const id = sessionStorage.getItem(ACTIVE_SCAN_STORAGE_KEY);
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export function clearActiveScanId(): void {
  sessionStorage.removeItem(ACTIVE_SCAN_STORAGE_KEY);
}

export function shouldRestoreViewOnLoad(): boolean {
  return Boolean(
    getScanIdFromUrl() || loadActiveScanId() || loadGuestView(),
  );
}
