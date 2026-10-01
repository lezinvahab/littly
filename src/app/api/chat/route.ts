import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateBabyCareAnswer,
  GeminiRequestError,
  MissingApiKeyError,
  QuotaExceededError,
} from "@/lib/babycare/gemini";
import {
  GENERIC_ERROR_MESSAGE,
  MAX_QUESTION_LENGTH,
} from "@/lib/babycare/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const chatRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Please enter a question.")
    .max(
      MAX_QUESTION_LENGTH,
      `Please keep your question under ${MAX_QUESTION_LENGTH} characters.`,
    ),
  babyAge: z
    .string()
    .trim()
    .max(32, "Invalid age selection.")
    .optional()
    .transform((value) =>
      value === undefined || value === "" ? undefined : value,
    ),
  history: z.array(historyItemSchema).max(10).optional().default([]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Expected JSON body.", code: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Please enter a question.",
        code: "empty_question",
      },
      { status: 400 },
    );
  }

  const { question, babyAge, history } = parsed.data;

  try {
    const answer = await generateBabyCareAnswer({
      question,
      babyAge,
      history,
    });
    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      // Developer-friendly in development, generic in production.
      // Never expose the key or its value.
      const message =
        process.env.NODE_ENV === "development"
          ? "GEMINI_API_KEY is not configured. Add it to your .env.local file. See .env.example."
          : GENERIC_ERROR_MESSAGE;
      return NextResponse.json(
        { error: message, code: "missing_api_key" },
        { status: 500 },
      );
    }

    if (error instanceof QuotaExceededError) {
      // Friendly, actionable message. No upstream details or codes leak.
      console.error("BabyCare AI Gemini quota exhausted");
      return NextResponse.json(
        {
          error:
            "Littly is temporarily unable to respond. Please try again shortly.",
          code: "quota_exceeded",
        },
        { status: 503 },
      );
    }

    if (error instanceof GeminiRequestError) {
      // Never leak upstream details to the client.
      console.error("BabyCare AI Gemini request failed");
    } else {
      console.error("BabyCare AI unexpected chat error");
    }

    return NextResponse.json(
      { error: GENERIC_ERROR_MESSAGE, code: "gemini_failed" },
      { status: 502 },
    );
  }
}
