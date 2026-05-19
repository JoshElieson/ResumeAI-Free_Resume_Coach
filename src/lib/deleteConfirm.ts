const SKIP_DELETE_CONFIRM_KEY = "resume-skip-delete-confirm";

export function shouldSkipDeleteConfirm(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === "1";
}

export function setSkipDeleteConfirm(skip: boolean): void {
  if (typeof window === "undefined") return;
  if (skip) {
    localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, "1");
  } else {
    localStorage.removeItem(SKIP_DELETE_CONFIRM_KEY);
  }
}
