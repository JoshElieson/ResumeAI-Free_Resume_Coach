"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { HighlightedResume } from "@/components/HighlightedResume";
import {
  isAcceptedResumeFile,
  RESUME_FILE_ACCEPT,
} from "@/lib/resumeFile";
import type { Annotation } from "@/types/feedback";

const PdfResumeViewer = dynamic(
  () =>
    import("@/components/PdfResumeViewer").then((mod) => mod.PdfResumeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="app-card flex min-h-[480px] items-center justify-center text-sm text-muted">
        Loading PDF viewer…
      </div>
    ),
  },
);

type Props = {
  pdfFile: File | null;
  resumeText: string;
  annotations: Annotation[];
  activeIndex: number | null;
  onSelectAnnotation: (index: number | null) => void;
  onAnalyzeFile?: (file: File) => void;
  onOpenAdvanced?: () => void;
  analyzing?: boolean;
  showAdvancedDot?: boolean;
};

function isPdfFile(file: File | null): file is File {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function ResumeViewer({
  pdfFile,
  resumeText,
  annotations,
  activeIndex,
  onSelectAnnotation,
  onAnalyzeFile,
  onOpenAdvanced,
  analyzing = false,
  showAdvancedDot = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  const canUpload = Boolean(onAnalyzeFile);

  const submitFile = useCallback(
    (file: File) => {
      if (!onAnalyzeFile || analyzing) return;
      if (!isAcceptedResumeFile(file)) {
        return;
      }
      onAnalyzeFile(file);
    },
    [onAnalyzeFile, analyzing],
  );

  const openPicker = useCallback(() => {
    if (!canUpload || analyzing) return;
    inputRef.current?.click();
  }, [canUpload, analyzing]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!canUpload || analyzing) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setDragOver(true);
    }
  }, [canUpload, analyzing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!canUpload) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragOver(false);
    }
  }, [canUpload]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canUpload || analyzing) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [canUpload, analyzing],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!canUpload || analyzing) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) submitFile(file);
    },
    [canUpload, analyzing, submitFile],
  );

  const viewer = isPdfFile(pdfFile) ? (
    <PdfResumeViewer
      file={pdfFile}
      annotations={annotations}
      activeIndex={activeIndex}
      onSelectAnnotation={onSelectAnnotation}
      onPickFile={canUpload ? openPicker : undefined}
      onOpenAdvanced={canUpload ? onOpenAdvanced : undefined}
      pickFileDisabled={analyzing}
      showAdvancedDot={showAdvancedDot}
    />
  ) : (
    <HighlightedResume
      resumeText={resumeText}
      annotations={annotations}
      activeIndex={activeIndex}
      onSelectAnnotation={onSelectAnnotation}
      onPickFile={canUpload ? openPicker : undefined}
      onOpenAdvanced={canUpload ? onOpenAdvanced : undefined}
      pickFileDisabled={analyzing}
      showAdvancedDot={showAdvancedDot}
    />
  );

  if (!canUpload) {
    return viewer;
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={RESUME_FILE_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) submitFile(file);
          e.target.value = "";
        }}
      />
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {viewer}
        {(dragOver || analyzing) && (
          <div
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl px-6 text-center backdrop-blur-sm ${
              dragOver
                ? "border-2 border-dashed border-accent/70 bg-accent/15"
                : "bg-navy/75"
            }`}
            role={analyzing ? "status" : undefined}
            aria-live={analyzing ? "polite" : undefined}
          >
            {analyzing ? (
              <>
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent"
                  aria-hidden
                />
                <p className="text-sm font-medium text-foreground">
                  Analyzing with AI…
                </p>
                <p className="text-xs text-muted">
                  This usually takes 15–30 seconds
                </p>
              </>
            ) : (
              <>
                <UploadIconLarge />
                <p className="text-sm font-medium text-foreground">
                  Drop your resume here
                </p>
                <p className="text-xs text-muted">PDF or DOCX — max 5 MB</p>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function UploadIconLarge() {
  return (
    <svg
      className="h-10 w-10 text-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}
