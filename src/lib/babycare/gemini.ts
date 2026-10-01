/** Server-side only helper. Never import this from client components. */

import { GoogleGenAI } from "@google/genai";
import type { ChatHistoryItem } from "@/types/babycare";
import {
  BABYCARE_SYSTEM_INSTRUCTION,
  GEMINI_MODEL,
} from "@/lib/babycare/constants";

export class MissingApiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured");
    this.name = "MissingApiKeyError";
  }
}

export class GeminiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiRequestError";
  }
}

/** Upstream rate limit / quota exhaustion. Never carries key material. */
export class QuotaExceededError extends Error {
  constructor() {
    super("Gemini API quota exceeded");
    this.name = "QuotaExceededError";
  }
}

interface GenerateAnswerInput {
  question: string;
  babyAge?: string;
  history?: ChatHistoryItem[];
}

/** Detect upstream rate-limit/quota signals without leaking details. */
function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { status?: unknown; code?: unknown };
  if (candidate.status === 429 || candidate.code === 429) return true;
  const raw = error instanceof Error ? error.message : "";
  return /429|quota|rate.?limit|resource.?exhausted/i.test(raw);
}

/**
 * Server-side only helper. Never import this from client components.
 * Reads GEMINI_API_KEY from the server environment and calls Gemini.
 * Prior conversation turns are passed as multi-turn contents so the
 * model can answer follow-up questions in context.
 */
export async function generateBabyCareAnswer({
  question,
  babyAge,
  history = [],
}: GenerateAnswerInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const ai = new GoogleGenAI({ apiKey });

  const ageContext =
    babyAge && babyAge.trim().length > 0
      ? `\n\nContext: the baby's age is "${babyAge.trim()}". Consider this when relevant.`
      : "";

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    {
      role: "user",
      parts: [{ text: `${question.trim()}${ageContext}` }],
    },
  ];

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: BABYCARE_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini API error";
    if (isQuotaError(error)) {
      throw new QuotaExceededError();
    }
    throw new GeminiRequestError(message);
  }

  const text = response.text?.trim();

  if (!text) {
    throw new GeminiRequestError("Gemini returned an empty response");
  }

  return text;
}
