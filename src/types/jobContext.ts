import { z } from "zod";

export type JobSearchContext = {
  targetRole: string;
  targetCompanies: string;
  industry: string;
  additionalNotes: string;
};

export const EMPTY_JOB_SEARCH_CONTEXT: JobSearchContext = {
  targetRole: "",
  targetCompanies: "",
  industry: "",
  additionalNotes: "",
};

export const jobSearchContextSchema = z.object({
  targetRole: z.string().max(200).optional(),
  targetCompanies: z.string().max(2000).optional(),
  industry: z.string().max(200).optional(),
  additionalNotes: z.string().max(2000).optional(),
});
