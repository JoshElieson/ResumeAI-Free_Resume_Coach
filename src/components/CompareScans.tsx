"use client";

type Props = {
  embedded?: boolean;
  /** Omit the title block when a parent (e.g. dialog) provides it. */
  hideHeader?: boolean;
};

export function CompareScans({ embedded = false, hideHeader = false }: Props) {
  const shellClass = embedded
    ? "flex h-full min-h-0 w-full flex-col"
    : "app-card flex w-full flex-col";

  return (
    <section className={shellClass}>
      {!hideHeader && (
        <div
          className={`px-4 py-3 ${embedded ? "border-b border-border" : "app-card-header"}`}
        >
          <h2 className="text-sm font-semibold text-foreground">Compare Scans</h2>
          <p className="mt-0.5 text-xs text-muted">
            Side-by-side scores and feedback across two analyses
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <ScanSlot label="Scan A" placeholder="Select a saved scan" />
          <span
            className="hidden text-center text-xs font-semibold uppercase tracking-wider text-muted sm:block"
            aria-hidden
          >
            vs
          </span>
          <ScanSlot label="Scan B" placeholder="Select a saved scan" />
        </div>

        <div className="rounded-xl border border-dashed border-border bg-surface-elevated px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Comparison preview</p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">
            Score deltas, shared strengths, and differing suggestions will show here
            once compare is enabled.
          </p>
          <ul className="mx-auto mt-4 grid max-w-md gap-2 text-left text-xs text-muted sm:grid-cols-2">
            <li className="flex items-center gap-2 rounded-lg border border-border bg-subtle px-3 py-2">
              <span className="text-accent">●</span>
              Overall score change
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-border bg-subtle px-3 py-2">
              <span className="text-accent">●</span>
              Annotation highlights
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-border bg-subtle px-3 py-2">
              <span className="text-accent">●</span>
              Category breakdown
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-border bg-subtle px-3 py-2">
              <span className="text-accent">●</span>
              Export summary
            </li>
          </ul>
        </div>

        <button
          type="button"
          disabled
          className="btn-primary w-full cursor-not-allowed opacity-50"
        >
          Compare scans — coming soon
        </button>
      </div>
    </section>
  );
}

function ScanSlot({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <button
        type="button"
        disabled
        className="mt-3 flex w-full cursor-not-allowed items-center justify-between gap-2 rounded-lg border border-border bg-subtle px-3 py-3 text-left text-sm text-muted opacity-70"
      >
        <span>{placeholder}</span>
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
