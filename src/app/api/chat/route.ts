import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  chatWithResumeCoach,
  trimChatHistory,
  validateUserMessage,
  type ChatMessage,
} from "@/lib/chat";
import { normalizeJobSearchContext } from "@/lib/jobContext";
import { jobSearchContextSchema } from "@/types/jobContext";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional(),
  jobContext: jobSearchContextSchema.optional(),
  resumeText: z.string().max(30_000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const message = validateUserMessage(parsed.data.message);
    const history = trimChatHistory(
      (parsed.data.history ?? []) as ChatMessage[],
    );

    const jobContext = parsed.data.jobContext
      ? normalizeJobSearchContext(parsed.data.jobContext)
      : null;

    const reply = await chatWithResumeCoach(message, history, {
      jobContext,
      resumeText: parsed.data.resumeText ?? null,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
