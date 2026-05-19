"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type Props = {
  className?: string;
  callbackUrl?: string;
};

export function AuthButton({ className = "", callbackUrl = "/" }: Props) {
  const { data: session, status } = useSession();
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      setSessionTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setSessionTimedOut(true), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "loading" && !sessionTimedOut) {
    return (
      <span className={`text-sm text-muted ${className}`}>Loading…</span>
    );
  }

  if (session?.user) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <UserAvatar
          image={session.user.image}
          name={session.user.name}
          email={session.user.email}
        />
        <div className="hidden flex-col sm:flex">
          <span className="text-sm font-medium text-foreground">
            {session.user.name ?? session.user.email}
          </span>
          <span className="text-xs text-muted">Signed in</span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl })}
          className="btn-secondary px-3 py-2"
        >
          Sign out
        </button>
      </div>
    );
  }

  const registerHref = `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className={`relative ${className}`}>
      <div className="group relative inline-block">
        <button
          type="button"
          aria-haspopup="menu"
          className="btn-primary inline-flex cursor-default items-center gap-1.5 px-4 py-2"
        >
          Create an Account
          <ChevronIcon />
        </button>

        <div
          className="pointer-events-none absolute right-0 top-full z-50 min-w-[15.5rem] pt-1 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
          role="menu"
          aria-label="Sign in options"
        >
          <div className="app-card overflow-hidden rounded-lg border border-white/10 py-1 shadow-lg">
            <button
              type="button"
              role="menuitem"
              onClick={() => signIn("google", { callbackUrl })}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-white/5"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
            <Link
              href={registerHref}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-white/5"
            >
              <EmailIcon />
              Sign in with Email
            </Link>
            <p className="px-3 py-2 text-xs text-muted">
              Already have an account?{" "}
              <Link
                href={loginHref}
                className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({
  image,
  name,
  email,
}: {
  image?: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = name ?? email ?? "?";
  const initials = label
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (image && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-accent/40"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-foreground ring-2 ring-accent/40"
    >
      {initials}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 opacity-70"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/email-signup.png"
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 object-contain object-center"
      aria-hidden
    />
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
