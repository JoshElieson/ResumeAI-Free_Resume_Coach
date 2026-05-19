import { formatJobContextForPrompt, hasJobSearchContext } from "@/lib/jobContext";
import OpenAI from "openai";
import { feedbackResponseSchema, type FeedbackResponse } from "@/types/feedback";
import type { JobSearchContext } from "@/types/jobContext";

const SYSTEM_PROMPT = `You are an expert resume coach and hiring manager. Analyze the resume text and return structured JSON feedback.

Rules:
- score: number from 0 to 10 (one decimal allowed, e.g. 7.5)
- overallFeedback: exactly 1-2 short sentences (under 45 words total). Brief holistic take — no lists, no paragraph-length prose.
- strengthsSummary: exactly 1-2 short sentences (under 40 words total) on what's working. Omit filler and repetition.
- improvementsSummary: exactly 1-2 short sentences (under 40 words total) on the top priorities to fix. Be direct.
- annotations: 8-15 items. Each must quote EXACT text copied verbatim from the resume (a phrase, bullet fragment, or section header — at least 3 characters). Do not paraphrase or invent text that is not in the resume.
- Do not flag spacing or formatting issues when the quoted text already has normal spaces between words (e.g. "University Aug 2026" is fine). Only flag spacing when words are genuinely run together in the quoted text.
- annotation.type: "strength" for strong content, "weakness" for clear problems, "suggestion" for improvements
- annotation.feedback: one concise sentence explaining why you flagged it

Writing style: scannable and tight. Every summary field must read like a quick note, not an essay. Put detailed critique in annotations, not in overallFeedback or the summaries.

Focus on: impact/metrics, clarity, formatting signals, keywords, weak verbs, gaps, length, and relevance. Be constructive and specific.

When job search context is provided, tailor the score, summaries, and annotations to that target role, companies, and industry.`;

export async function analyzeResume(
  resumeText: string,
  jobContext?: JobSearchContext | null,
): Promise<FeedbackResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to a .env.local file in the project root.",
    );
  }

  const client = new OpenAI({ apiKey });

  const contextBlock =
    jobContext && hasJobSearchContext(jobContext)
      ? formatJobContextForPrompt(jobContext)
      : null;

  const userContent = contextBlock
    ? `Analyze this resume and return JSON with keys: score, overallFeedback, strengthsSummary, improvementsSummary, annotations (array of {text, type, feedback}). Keep overallFeedback, strengthsSummary, and improvementsSummary to 1-2 sentences each.

Job search context (tailor feedback to this):
${contextBlock}

--- RESUME ---
${resumeText}
--- END ---`
    : `Analyze this resume and return JSON with keys: score, overallFeedback, strengthsSummary, improvementsSummary, annotations (array of {text, type, feedback}). Keep overallFeedback, strengthsSummary, and improvementsSummary to 1-2 sentences each.

--- RESUME ---
${resumeText}
--- END ---`;

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("No response from the AI model.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  const result = feedbackResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI response did not match the expected format. Please try again.");
  }

  return result.data;
}
