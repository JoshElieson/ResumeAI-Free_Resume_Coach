"use client";

import type { JobSearchContext } from "@/types/jobContext";
import { useId } from "react";

type Props = {
  value: JobSearchContext;
  onChange: (value: JobSearchContext) => void;
  disabled?: boolean;
};

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-surface-elevated/80 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

export function AdvancedJobSettings({ value, onChange, disabled }: Props) {
  const panelId = useId();

  function update<K extends keyof JobSearchContext>(key: K, next: string) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-6 sm:p-8">
      <div className="shrink-0">
        <h2 className="text-base font-semibold text-foreground">Advanced settings</h2>
        <p className="mt-1 text-sm text-muted">
          Optional — tailor feedback to roles and companies you are targeting.
        </p>
      </div>

      <div id={panelId} className="mt-6 space-y-4">
        <div>
          <label htmlFor={`${panelId}-role`} className="mb-1 block text-xs font-medium text-muted">
            Goal position
          </label>
          <input
            id={`${panelId}-role`}
            type="text"
            value={value.targetRole}
            onChange={(e) => update("targetRole", e.target.value)}
            disabled={disabled}
            placeholder="Senior Software Engineer"
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${panelId}-companies`}
            className="mb-1 block text-xs font-medium text-muted"
          >
            Companies applying to
          </label>
          <textarea
            id={`${panelId}-companies`}
            value={value.targetCompanies}
            onChange={(e) => update("targetCompanies", e.target.value)}
            disabled={disabled}
            placeholder="Google, Stripe, local startups, ..."
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>
        <div>
          <label
            htmlFor={`${panelId}-industry`}
            className="mb-1 block text-xs font-medium text-muted"
          >
            Industry
          </label>
          <input
            id={`${panelId}-industry`}
            type="text"
            value={value.industry}
            onChange={(e) => update("industry", e.target.value)}
            disabled={disabled}
            placeholder="Healthcare, Finance, ..."
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${panelId}-notes`}
            className="mb-1 block text-xs font-medium text-muted"
          >
            Additional context
          </label>
          <textarea
            id={`${panelId}-notes`}
            value={value.additionalNotes}
            onChange={(e) => update("additionalNotes", e.target.value)}
            disabled={disabled}
            placeholder="career switch, remote-only, new grad, ..."
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>
      </div>
    </div>
  );
}
