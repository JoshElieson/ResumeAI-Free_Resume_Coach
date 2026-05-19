import {
  EMPTY_JOB_SEARCH_CONTEXT,
  type JobSearchContext,
} from "@/types/jobContext";

export const JOB_CONTEXT_STORAGE_KEY = "resumeai-job-context";

const FIELD_MAX = {
  targetRole: 200,
  targetCompanies: 2000,
  industry: 200,
  additionalNotes: 2000,
} as const;

function trimField(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function normalizeJobSearchContext(
  raw: Partial<JobSearchContext> | null | undefined,
): JobSearchContext {
  if (!raw) return { ...EMPTY_JOB_SEARCH_CONTEXT };
  return {
    targetRole: trimField(raw.targetRole ?? "", FIELD_MAX.targetRole),
    targetCompanies: trimField(
      raw.targetCompanies ?? "",
      FIELD_MAX.targetCompanies,
    ),
    industry: trimField(raw.industry ?? "", FIELD_MAX.industry),
    additionalNotes: trimField(
      raw.additionalNotes ?? "",
      FIELD_MAX.additionalNotes,
    ),
  };
}

export function hasJobSearchContext(ctx: JobSearchContext): boolean {
  return Boolean(
    ctx.targetRole ||
      ctx.targetCompanies ||
      ctx.industry ||
      ctx.additionalNotes,
  );
}

export function formatJobContextForPrompt(ctx: JobSearchContext): string | null {
  const normalized = normalizeJobSearchContext(ctx);
  if (!hasJobSearchContext(normalized)) return null;

  const lines: string[] = [];
  if (normalized.targetRole) {
    lines.push(`Target role / goal position: ${normalized.targetRole}`);
  }
  if (normalized.targetCompanies) {
    lines.push(`Companies applying to: ${normalized.targetCompanies}`);
  }
  if (normalized.industry) {
    lines.push(`Industry or field: ${normalized.industry}`);
  }
  if (normalized.additionalNotes) {
    lines.push(`Additional context: ${normalized.additionalNotes}`);
  }

  return lines.join("\n");
}

export function parseJobContextFromFormData(
  formData: FormData,
): JobSearchContext {
  return normalizeJobSearchContext({
    targetRole: String(formData.get("targetRole") ?? ""),
    targetCompanies: String(formData.get("targetCompanies") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    additionalNotes: String(formData.get("additionalNotes") ?? ""),
  });
}

export function loadJobContextFromStorage(): JobSearchContext {
  if (typeof window === "undefined") return { ...EMPTY_JOB_SEARCH_CONTEXT };
  try {
    const raw = localStorage.getItem(JOB_CONTEXT_STORAGE_KEY);
    if (!raw) return { ...EMPTY_JOB_SEARCH_CONTEXT };
    return normalizeJobSearchContext(JSON.parse(raw) as Partial<JobSearchContext>);
  } catch {
    return { ...EMPTY_JOB_SEARCH_CONTEXT };
  }
}

export function saveJobContextToStorage(ctx: JobSearchContext): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeJobSearchContext(ctx);
  if (hasJobSearchContext(normalized)) {
    localStorage.setItem(JOB_CONTEXT_STORAGE_KEY, JSON.stringify(normalized));
  } else {
    localStorage.removeItem(JOB_CONTEXT_STORAGE_KEY);
  }
}
