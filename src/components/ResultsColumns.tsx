"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  resume: ReactNode;
  sidebar: ReactNode;
  className?: string;
};

/** Keeps the feedback sidebar from extending below the resume column. */
export function ResultsColumns({ resume, sidebar, className = "" }: Props) {
  const resumeRef = useRef<HTMLDivElement>(null);
  const [sidebarMaxHeight, setSidebarMaxHeight] = useState<number | undefined>();

  useEffect(() => {
    const node = resumeRef.current;
    if (!node) return;

    const sync = () => {
      setSidebarMaxHeight(node.getBoundingClientRect().height);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [resume]);

  return (
    <div
      className={`grid min-h-0 min-w-0 flex-1 gap-6 xl:grid-cols-[1fr_380px] xl:items-start ${className}`}
    >
      <div ref={resumeRef} className="min-w-0 self-start">
        {resume}
      </div>
      <div
        className="flex min-w-0 flex-col self-start overflow-hidden"
        style={
          sidebarMaxHeight != null
            ? { maxHeight: sidebarMaxHeight }
            : undefined
        }
      >
        {sidebar}
      </div>
    </div>
  );
}
