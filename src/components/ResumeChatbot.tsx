"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat";
import type { JobSearchContext } from "@/types/jobContext";

const UPLOAD_RESUME_FIRST_MESSAGE =
  "Upload your resume or open a saved scan before asking for advice — that way I can give feedback tailored to your experience.";

const UPLOAD_LOCKED_PLACEHOLDER = "Upload a file before asking for advice";

const TYPING_DELAY_MS = 500;

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[90%] rounded-xl border border-white/10 bg-surface-elevated/80 px-4 py-3 text-sm text-muted"
        aria-label="Assistant is typing"
      >
        <span className="inline-flex gap-0.5">
          <span className="animate-pulse">.</span>
          <span className="animate-pulse [animation-delay:150ms]">.</span>
          <span className="animate-pulse [animation-delay:300ms]">.</span>
        </span>
      </div>
    </div>
  );
}

type Props = {
  className?: string;
  /** Pin to the top-right of the viewport (below the header). */
  floating?: boolean;
  /** True after the user has uploaded or selected a scan with resume content. */
  hasResumeContext?: boolean;
  /** Lock height to match the upload panel (desktop). */
  heightPx?: number;
  jobContext?: JobSearchContext;
  resumeText?: string | null;
};

export function ResumeChatbot({
  className = "",
  floating = false,
  hasResumeContext = false,
  heightPx,
  jobContext,
  resumeText,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function focusInput() {
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const inputLocked =
    !hasResumeContext && messages.some((m) => m.role === "user");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || inputLocked) return;

    const text = input.trim();
    if (!text) return;

    setInput("");
    setError(null);

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);

    setSending(true);

    if (!hasResumeContext) {
      await new Promise((resolve) => setTimeout(resolve, TYPING_DELAY_MS));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: UPLOAD_RESUME_FIRST_MESSAGE },
      ]);
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          jobContext,
          resumeText: resumeText ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not send message");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply as string },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
      if (!inputLocked) {
        focusInput();
      }
    }
  }

  const layoutClass = floating
    ? "fixed top-20 right-3 z-30 flex h-[min(20rem,calc(100dvh-6rem))] max-h-[min(20rem,calc(100dvh-6rem))] w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden sm:top-24 sm:right-6 sm:h-[min(22rem,calc(100dvh-7rem))] sm:max-h-[min(22rem,calc(100dvh-7rem))] sm:w-80"
    : "relative flex h-[26rem] max-h-[26rem] w-full shrink-0 flex-col overflow-hidden sm:h-[28rem] sm:max-h-[28rem]";

  const lockedHeightStyle =
    heightPx != null
      ? { height: heightPx, maxHeight: heightPx, minHeight: heightPx }
      : undefined;

  return (
    <aside
      className={`app-card overflow-hidden shadow-lg shadow-black/30 ${layoutClass} ${className}`}
      style={lockedHeightStyle}
    >
      <div className="app-card-header shrink-0 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">ResumeAI Chatbot</h2>
        <p className="mt-0.5 text-xs text-muted">
          Ask career and resume questions
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {messages.length === 0 && (
            <p className="text-sm leading-relaxed text-muted">
              {hasResumeContext
                ? "Try: “How can I improve my bullet points?” or “What should I cut from a two-page resume?”"
                : "Upload your resume or open a saved scan first, then ask for tailored advice."}
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent/25 text-foreground"
                    : "border border-white/10 bg-surface-elevated/80 text-foreground/90"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && <TypingBubble />}
          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-white/10 p-4"
        >
          <textarea
            ref={inputRef}
            value={input}
            disabled={inputLocked}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (inputLocked) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e);
              }
            }}
            placeholder={
              inputLocked ? UPLOAD_LOCKED_PLACEHOLDER : "Type a message…"
            }
            rows={2}
            className={`w-full resize-none rounded-lg border border-white/10 bg-surface-elevated/80 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 ${
              inputLocked
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
          />
          <button
            type="submit"
            disabled={sending || inputLocked || !input.trim()}
            onMouseDown={(e) => e.preventDefault()}
            className="btn-primary mt-2 w-full py-2 text-sm"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </aside>
  );
}
