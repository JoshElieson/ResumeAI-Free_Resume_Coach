"use client";

import { useSession } from "next-auth/react";
import { AuthButton } from "@/components/AuthButton";

type Props = {
  title?: string;
  description?: string;
};

export function SignInOverlay({
  title = "Sign in to unlock",
  description = "Available for signed-in users",
}: Props) {
  const { status } = useSession();

  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-navy/85 px-5 backdrop-blur-sm">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-surface-elevated">
        <svg
          className="h-5 w-5 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>
      <p className="text-center text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-[14rem] text-center text-xs leading-relaxed text-muted">
        {description}
      </p>
      <AuthButton />
      </div>
    </div>
  );
}
