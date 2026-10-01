export type BabyAgeOption =
  | "Newborn"
  | "1 month"
  | "2 months"
  | "3 months"
  | "4 months"
  | "5 months"
  | "6 months"
  | "7–12 months"
  | "1–2 years";

export interface ChatRequestBody {
  question: string;
  babyAge?: string;
  history?: ChatHistoryItem[];
}

/** A single turn of prior conversation sent to the backend for context. */
export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSuccessResponse {
  answer: string;
}

export interface ChatErrorResponse {
  error: string;
  /** Machine-readable code, e.g. "empty_question" | "missing_api_key" | "gemini_failed" */
  code?: string;
}

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: number;
  /** Local-only thumbs feedback, persisted with the chat on this device. */
  feedback?: "up" | "down";
}

export interface Conversation {
  id: string;
  title: string;
  babyAge?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type ChatStatus = "idle" | "loading" | "error";
