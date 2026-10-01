"use client";

import type { ChatMessage, Conversation } from "@/types/babycare";

/**
 * Anonymous local persistence.
 *
 * - No login. Each browser/device keeps its own conversations in its own
 *   localStorage, so visitors are isolated by construction: no server
 *   storage, no shared variables, no cross-user visibility.
 * - Every visitor automatically gets a stable anonymous install identity
 *   (`getAnonymousId()`). It owns nothing today except namespacing the
 *   storage key, but it is the hook a future sign-in/database migration
 *   can use (guest conversations -> account) without restructuring chat code.
 * - Only chat text (questions/answers) and the anonymous id live here.
 *   NEVER store API keys or secrets in this module.
 */

const ANON_ID_KEY = "littly:anon_install:v1";
const LEGACY_CONVERSATIONS_KEY = "babycare-ai:conversations:v1";
const MAX_STORED_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

function conversationsKey(anonymousId: string): string {
  return `littly:conversations:${anonymousId}:v1`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Return this browser's stable anonymous identity, creating and persisting
 * one for new visitors. Never throws; falls back to an in-memory id when
 * storage is unavailable (private mode), keeping the app usable in-memory.
 */
let memoryAnonymousId: string | null = null;

export function getAnonymousId(): string {
  if (memoryAnonymousId) return memoryAnonymousId;
  if (!isBrowser()) return "server";
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const fresh = createId();
    localStorage.setItem(ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    if (!memoryAnonymousId) memoryAnonymousId = createId();
    return memoryAnonymousId;
  }
}

function isValidMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.role !== "user" && candidate.role !== "assistant") return false;
  if (typeof candidate.content !== "string") return false;
  if (typeof candidate.id !== "string") return false;
  if (typeof candidate.createdAt !== "number") return false;
  if (
    candidate.feedback !== undefined &&
    candidate.feedback !== "up" &&
    candidate.feedback !== "down"
  ) {
    return false;
  }
  return true;
}

function isValidConversation(value: unknown): value is Conversation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.messages) &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.updatedAt === "number"
  );
}

function sanitizeConversations(value: unknown): Conversation[] {
  if (!Array.isArray(value)) return [];
  const clean: Conversation[] = [];
  for (const item of value) {
    if (!isValidConversation(item)) continue;
    clean.push({
      ...item,
      title: item.title.slice(0, 200),
      messages: item.messages
        .filter(isValidMessage)
        .map((message) => ({
          ...message,
          content: message.content.slice(0, 8000),
        }))
        .slice(-MAX_MESSAGES_PER_CONVERSATION),
    });
  }
  return clean
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_STORED_CONVERSATIONS);
}

function readKey(key: string): Conversation[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return sanitizeConversations(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Load this visitor's conversations, newest first. Migrates the pre-identity
 * storage key once, then removes it. Never throws.
 */
export function loadConversations(): Conversation[] {
  if (!isBrowser()) return [];
  const key = conversationsKey(getAnonymousId());
  const current = readKey(key);
  if (current.length > 0) return current;
  // One-time migration from the original un-namespaced key.
  const legacy = readKey(LEGACY_CONVERSATIONS_KEY);
  if (legacy.length > 0) {
    try {
      localStorage.setItem(key, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_CONVERSATIONS_KEY);
    } catch {
      // Ignore; app continues in-memory.
    }
    return legacy;
  }
  return [];
}

/** Persist this visitor's conversations. Never throws. */
export function saveConversations(conversations: Conversation[]): void {
  if (!isBrowser()) return;
  try {
    const sanitized = sanitizeConversations(conversations);
    localStorage.setItem(
      conversationsKey(getAnonymousId()),
      JSON.stringify(sanitized),
    );
  } catch {
    // Ignore write failures (private mode, quota). App keeps working in-memory.
  }
}

/**
 * Merge a remotely-changed list (another tab) into local state.
 * Newest `updatedAt` wins per conversation id; deletions propagate.
 */
export function mergeConversations(
  local: Conversation[],
  incoming: Conversation[],
): Conversation[] {
  const merged = new Map<string, Conversation>();
  for (const conversation of local) merged.set(conversation.id, conversation);
  for (const conversation of incoming) {
    const existing = merged.get(conversation.id);
    if (!existing || conversation.updatedAt >= existing.updatedAt) {
      merged.set(conversation.id, conversation);
    }
  }
  const incomingIds = new Set(incoming.map((c) => c.id));
  // A conversation missing from a newer full snapshot was deleted elsewhere.
  // Only honor deletions when the snapshot is plausibly complete: it must
  // contain at least one conversation (an empty first-write race otherwise
  // wipes state). Empty snapshots are ignored for deletions.
  const result: Conversation[] = [];
  for (const conversation of merged.values()) {
    if (!incomingIds.has(conversation.id) && incoming.length > 0) {
      const localVersion = local.find((c) => c.id === conversation.id);
      const incomingNewest = Math.max(
        ...incoming.map((c) => c.updatedAt),
        0,
      );
      if (localVersion && localVersion.updatedAt < incomingNewest) continue;
    }
    result.push(conversation);
  }
  return result
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_STORED_CONVERSATIONS);
}

/**
 * Subscribe to changes made by OTHER tabs/windows. Returns an unsubscribe
 * function. The callback receives the latest sanitized list.
 */
export function subscribeConversations(
  callback: (conversations: Conversation[]) => void,
): () => void {
  if (!isBrowser()) return () => {};
  const key = conversationsKey(getAnonymousId());
  const handler = (event: StorageEvent) => {
    if (event.key !== key) return;
    try {
      callback(
        sanitizeConversations(event.newValue ? JSON.parse(event.newValue) : []),
      );
    } catch {
      // Ignore malformed external writes.
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Derive a short chat title from the first question (no extra API call). */
export function titleFromQuestion(question: string): string {
  const singleLine = question.trim().replace(/\s+/g, " ");
  if (singleLine.length <= 42) return singleLine;
  return `${singleLine.slice(0, 42).trimEnd()}…`;
}
