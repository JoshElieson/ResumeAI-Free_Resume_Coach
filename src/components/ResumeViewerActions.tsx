"use client";

import { SettingsIcon } from "@/components/SettingsIcon";
import { UploadIcon } from "@/components/UploadIcon";

type Props = {
  onPickFile: () => void;
  onOpenAdvanced?: () => void;
  pickFileDisabled?: boolean;
  advancedDisabled?: boolean;
  showAdvancedDot?: boolean;
};

export function ResumeViewerActions({
  onPickFile,
  onOpenAdvanced,
  pickFileDisabled = false,
  advancedDisabled = false,
  showAdvancedDot = false,
}: Props) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <button
        type="button"
        onClick={onPickFile}
        disabled={pickFileDisabled}
        className="btn-secondary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <UploadIcon />
        Upload new file
      </button>
      {onOpenAdvanced && (
        <button
          type="button"
          onClick={onOpenAdvanced}
          disabled={advancedDisabled}
          className="btn-secondary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SettingsIcon />
          <span className="flex items-center gap-2">
            Advanced
            {showAdvancedDot && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-label="Custom job context set"
              />
            )}
          </span>
        </button>
      )}
    </div>
  );
}
