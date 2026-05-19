import { formatJobContextForPrompt, hasJobSearchContext } from "@/lib/jobContext";
import OpenAI from "openai";
import type { JobSearchContext } from "@/types/jobContext";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `You are a resume and career coach in a small chat panel. Keep every reply short.

Length and format:
- Default: 2–4 sentences (under ~80 words) unless the user explicitly asks for more detail, a list, or a full rewrite.
- Lead with the single most useful takeaway. Add at most one follow-up line if needed.
- Do not use numbered lists, bullet lists, or section headers unless the user asked for them.
- Avoid filler ("great question", "here are some tips", "keep up the great work") and avoid repeating the question back.
- Plain prose only — no markdown bold, headings, or long enumerations.

Tone: direct, practical, encouraging. Reference the user's resume or job context when provided, briefly.

If the topic is unrelated to careers or resumes, redirect in one sentence.`;

const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 4_000;

export function trimChatHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_HISTORY);
}

export function validateUserMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }
  if (trimmed.length > MAX_MESSAGE_CHARS) {
    return trimmed.slice(0, MAX_MESSAGE_CHARS);
  }
  return trimmed;
}

export type ChatCoachOptions = {
  jobContext?: JobSearchContext | null;
  resumeText?: string | null;
};

function buildSystemPrompt(options?: ChatCoachOptions): string {
  let prompt = SYSTEM_PROMPT;
  const blocks: string[] = [];

  if (options?.jobContext && hasJobSearchContext(options.jobContext)) {
    const context = formatJobContextForPrompt(options.jobContext);
    if (context) {
      blocks.push(`Job search context:\n${context}`);
    }
  }

  if (options?.resumeText?.trim()) {
    const excerpt = options.resumeText.trim().slice(0, 15_000);
    blocks.push(`Resume on file (reference when advising):\n${excerpt}`);
  }

  if (blocks.length > 0) {
    prompt += `\n\n${blocks.join("\n\n")}`;
  }

  return prompt;
}

export async function chatWithResumeCoach(
  message: string,
  history: ChatMessage[] = [],
  options?: ChatCoachOptions,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to a .env.local file in the project root.",
    );
  }

  const client = new OpenAI({ apiKey });
  const prior = trimChatHistory(history);

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 280,
    messages: [
      { role: "system", content: buildSystemPrompt(options) },
      ...prior.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("No response from the AI model.");
  }

  return reply;
}
