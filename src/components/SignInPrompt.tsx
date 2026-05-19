"use client";

import { AuthButton } from "@/components/AuthButton";

type Props = {
  open: boolean;
  onDismiss: () => void;
};

export function SignInPrompt({ open, onDismiss }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="sign-in-prompt-title"
      className="shrink-0 w-full"
    >
      <div className="app-card flex flex-col gap-3 border-accent/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p
            id="sign-in-prompt-title"
            className="text-sm font-semibold text-foreground"
          >
            Sign in for additional features
          </p>
          <p className="mt-1 text-sm text-muted">
            Save your scan history and get a higher daily analysis limit when
            you sign in with Google or create an email account.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <AuthButton />
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md p-1 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Dismiss"
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
      </div>
    </div>
  );
}
