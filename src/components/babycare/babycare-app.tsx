"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  MessageCircleHeart,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { BabyCareHeader } from "@/components/babycare/babycare-header";
import { Sidebar } from "@/components/babycare/sidebar";
import { Composer } from "@/components/babycare/composer";
import {
  ChatMessageCard,
  TypingIndicator,
} from "@/components/babycare/chat-message";
import {
  GENERIC_ERROR_MESSAGE,
  MAX_QUESTION_LENGTH,
  SAFETY_NOTICE,
} from "@/lib/babycare/constants";
import {
  createId,
  loadConversations,
  mergeConversations,
  saveConversations,
  subscribeConversations,
  titleFromQuestion,
} from "@/lib/babycare/storage";
import type {
  ChatHistoryItem,
  ChatMessage,
  Conversation,
} from "@/types/babycare";

const SUGGESTED_QUESTIONS = [
  "How can I help my baby sleep better at night?",
  "How often should a newborn feed?",
  "What are signs my baby is ready for solid foods?",
  "How do I soothe a crying baby safely?",
];

interface ApiSuccess {
  answer: string;
}

interface ApiFailure {
  error: string;
}

/** Prior turns sent as model context (everything except the new question). */
function buildHistory(allMessages: ChatMessage[]): ChatHistoryItem[] {
  return allMessages
    .slice(-11, -1)
    .map((message) => ({ role: message.role, content: message.content }));
}

export function BabyCareApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [babyAge, setBabyAge] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [failedPayload, setFailedPayload] = useState<{
    conversationId: string;
    question: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottom = useRef(true);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ?? null;
  const messages = activeConversation?.messages ?? [];

  // Load saved chats on first client render. LocalStorage is client-only,
  // so this intentionally hydrates after mount (server renders empty).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations(loadConversations());
  }, []);

  // Persist chats whenever they change.
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Sync changes made in other tabs/windows of this browser.
  // The storage event only fires for external writes, so this cannot loop.
  useEffect(() => {
    return subscribeConversations((incoming) => {
      setConversations((previous) => mergeConversations(previous, incoming));
    });
  }, []);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distanceFromBottom < 120;
    setShowScrollDown(distanceFromBottom >= 300);
  }

  useEffect(() => {
    if (stickToBottom.current) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    // Scroll when a new message arrives or loading state changes.
  }, [messages.length, isLoading]);

  function scrollToBottom() {
    stickToBottom.current = true;
    setShowScrollDown(false);
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }

  /**
   * Instantly reposition after switching conversations (no animation,
   * so opening a chat never visibly jumps). Runs after render.
   */
  function jumpTo(position: "top" | "bottom") {
    stickToBottom.current = position === "bottom";
    setShowScrollDown(false);
    requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (!element) return;
      element.scrollTo({
        top: position === "bottom" ? element.scrollHeight : 0,
        behavior: "auto",
      });
    });
  }

  /**
   * Ask Gemini and append the answer to the conversation.
   * Callers set loading state and clear errors before invoking.
   */
  const requestAnswer = useCallback(
    async (
      targetId: string,
      question: string,
      age: string | undefined,
      history: ChatHistoryItem[],
    ) => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            babyAge: age ?? "",
            history,
          }),
        });

        const data = (await response.json()) as ApiSuccess | ApiFailure;

        if (!response.ok) {
          const message =
            "error" in data && typeof data.error === "string" && data.error
              ? data.error
              : GENERIC_ERROR_MESSAGE;
          throw new Error(message);
        }

        if (!("answer" in data) || !data.answer) {
          throw new Error(GENERIC_ERROR_MESSAGE);
        }

        const assistantMessage: ChatMessage = {
          id: createId(),
          role: "assistant",
          content: data.answer,
          createdAt: Date.now(),
        };
        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === targetId
              ? {
                  ...conversation,
                  messages: [...conversation.messages, assistantMessage],
                  updatedAt: Date.now(),
                }
              : conversation,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : GENERIC_ERROR_MESSAGE;
        setRequestError(message);
        setFailedPayload({ conversationId: targetId, question });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const sendQuestion = useCallback(
    async (options: {
      conversationId: string | null;
      question: string;
      age: string;
    }) => {
      const trimmed = options.question.trim();
      if (trimmed.length === 0 || isLoading) return;
      if (trimmed.length > MAX_QUESTION_LENGTH) return;

      setRequestError(null);
      setFailedPayload(null);
      setIsLoading(true);

      const ageLabel = options.age.trim() === "" ? undefined : options.age.trim();
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      // Resolve (or create) the conversation using current state.
      // If the id is unknown (e.g. deleted in another tab), start fresh
      // instead of dropping the message.
      let conversationId = options.conversationId;
      let priorMessages: ChatMessage[] = [];
      let conversationAge = ageLabel;

      const existing = conversationId
        ? conversations.find(
            (conversation) => conversation.id === conversationId,
          )
        : undefined;

      if (conversationId && existing) {
        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [...conversation.messages, userMessage],
                  updatedAt: Date.now(),
                }
              : conversation,
          ),
        );
        priorMessages = existing.messages;
        conversationAge = existing.babyAge ?? ageLabel;
      } else {
        conversationId = createId();
        const fresh: Conversation = {
          id: conversationId,
          title: titleFromQuestion(trimmed),
          babyAge: ageLabel,
          messages: [userMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations((previous) => [fresh, ...previous]);
        setActiveId(conversationId);
      }

      setInput("");
      stickToBottom.current = true;

      const history = buildHistory([...priorMessages, userMessage]);

      await requestAnswer(conversationId, trimmed, conversationAge, history);
    },
    [conversations, isLoading, requestAnswer],
  );

  function handleSubmit() {
    if (isLoading) return;
    const trimmed = input.trim();
    if (trimmed.length === 0) return;
    // First message in a fresh chat adopts the currently selected age.
    void sendQuestion({ conversationId: activeId, question: trimmed, age: babyAge });
  }

  function handleRetry() {
    if (isLoading || !failedPayload) return;
    // The failed question is already in the chat — just re-request the answer.
    const conversation = conversations.find(
      (item) => item.id === failedPayload.conversationId,
    );
    if (!conversation) return;
    setRequestError(null);
    setFailedPayload(null);
    setIsLoading(true);
    stickToBottom.current = true;
    void requestAnswer(
      conversation.id,
      failedPayload.question,
      conversation.babyAge,
      buildHistory(conversation.messages),
    );
  }

  /** Drop the latest assistant message and get a fresh response. */
  function handleRegenerate() {
    if (isLoading || !activeConversation) return;
    const current = activeConversation.messages;
    if (current.length === 0 || current[current.length - 1].role !== "assistant") {
      return;
    }
    const trimmedMessages = current.slice(0, -1);
    const lastUser = [...trimmedMessages]
      .reverse()
      .find((message) => message.role === "user");
    if (!lastUser) return;
    const targetId = activeConversation.id;
    const age = activeConversation.babyAge;
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === targetId
          ? { ...conversation, messages: trimmedMessages, updatedAt: Date.now() }
          : conversation,
      ),
    );
    setRequestError(null);
    setFailedPayload(null);
    setIsLoading(true);
    stickToBottom.current = true;
    void requestAnswer(targetId, lastUser.content, age, buildHistory(trimmedMessages));
  }

  /** Insert a quote into the composer and focus it for a follow-up. */
  function handleQuote(message: ChatMessage, selectedText: string | null) {
    if (isLoading) return;
    const source = (selectedText ?? message.content).trim().slice(0, 1000);
    if (source.length === 0) return;
    const quoted = source
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    setInput((previous) =>
      previous.trim().length > 0
        ? `${previous.trimEnd()}\n\n${quoted}\n\n`
        : `${quoted}\n\n`,
    );
    stickToBottom.current = true;
    requestAnimationFrame(() => composerInputRef.current?.focus());
    scrollToBottom();
  }

  function handleFeedback(id: string, feedback: "up" | "down" | undefined) {
    if (!activeConversation) return;
    const targetId = activeConversation.id;
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === targetId
          ? {
              ...conversation,
              messages: conversation.messages.map((message) =>
                message.id === id ? { ...message, feedback } : message,
              ),
              updatedAt: Date.now(),
            }
          : conversation,
      ),
    );
  }

  function handleNewChat() {
    if (isLoading) return;
    setActiveId(null);
    setInput("");
    setBabyAge("");
    setRequestError(null);
    setFailedPayload(null);
    setSidebarOpen(false);
    jumpTo("top");
  }

  function handleSelect(id: string) {
    if (isLoading) return;
    const selected = conversations.find(
      (conversation) => conversation.id === id,
    );
    setActiveId(id);
    setBabyAge(selected?.babyAge ?? "");
    setInput("");
    setRequestError(null);
    setFailedPayload(null);
    setSidebarOpen(false);
    jumpTo(selected && selected.messages.length > 0 ? "bottom" : "top");
  }

  function handleDelete(id: string) {
    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== id),
    );
    if (activeId === id) {
      setActiveId(null);
      setInput("");
      setRequestError(null);
      setFailedPayload(null);
      jumpTo("top");
    }
  }

  function handleSuggestionClick(suggestion: string) {
    if (isLoading) return;
    void sendQuestion({ conversationId: activeId, question: suggestion, age: babyAge });
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-dvh bg-porcelain text-stone-900">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        openOnMobile={sidebarOpen}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BabyCareHeader
          title={activeConversation?.title ?? "New chat"}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
        />

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6">
            {!hasMessages && !isLoading && (
              <section
                aria-label="Welcome"
                className="flex min-h-[32vh] flex-col items-center justify-center text-center sm:min-h-[50vh]"
              >
                <img
                  src="/logo/littly-icon.svg"
                  alt="Littly"
                  width={86}
                  height={80}
                  className="h-14 w-auto sm:h-20"
                  draggable={false}
                />
                <div className="mt-4 flex items-center gap-3 sm:mt-5" aria-hidden="true">
                  <span className="h-px w-8 bg-brass-600/50 sm:w-12" />
                  <ShieldCheck
                    className="size-4 text-brass-600"
                    aria-hidden="true"
                  />
                  <span className="h-px w-8 bg-brass-600/50 sm:w-12" />
                </div>
                <p className="mt-3 font-brand text-[12px] font-semibold tracking-[0.24em] text-pine-800 uppercase sm:mt-4">
                  For the Littles
                </p>
                <h1 className="mt-3 font-display text-[28px] leading-tight font-medium tracking-tight text-balance text-pine-950 sm:mt-4 sm:text-[3.4rem] sm:leading-[1.05]">
                  Questions about your <em>little one?</em>
                </h1>
                <p className="mx-auto mt-4 hidden max-w-xl text-[15px] leading-relaxed text-pretty text-stone-600 sm:block">
                  Thoughtful, age-aware guidance on sleep, feeding,
                  development, crying, and baby safety — whenever you need
                  it.
                </p>
                <ul className="mt-5 grid w-full max-w-xl gap-2 text-left sm:mt-7 sm:grid-cols-2">
                  {SUGGESTED_QUESTIONS.map((suggestion, index) => (
                    <li
                      key={suggestion}
                      className={index === 3 ? "hidden sm:block" : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex h-full w-full items-start gap-2.5 rounded-xl border border-stone-200/80 bg-white px-3.5 py-2.5 text-left text-sm leading-snug text-stone-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-brass-600/40 hover:text-pine-950 hover:shadow-[0_10px_24px_rgba(10,58,45,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-800 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3.5"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-mist text-pine-900 sm:size-8">
                          <MessageCircleHeart
                            className="size-4"
                            aria-hidden="true"
                          />
                        </span>
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {hasMessages && (
              <ol aria-label="Conversation" aria-live="polite" className="grid gap-5">
                {messages.map((message, index) => (
                  <li key={message.id}>
                    <ChatMessageCard
                      message={message}
                      isLatest={index === messages.length - 1}
                      actionsDisabled={isLoading}
                      onQuote={handleQuote}
                      onRegenerate={handleRegenerate}
                      onFeedback={handleFeedback}
                    />
                  </li>
                ))}
              </ol>
            )}

            {isLoading && (
              <div className="mt-5">
                <TypingIndicator />
              </div>
            )}

            {requestError && !isLoading && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
              >
                <AlertCircle
                  className="mt-0.5 size-5 shrink-0 text-red-700"
                  aria-hidden="true"
                />
                <div className="grid gap-2">
                  <p className="text-sm leading-relaxed font-medium text-red-900">
                    {requestError}
                  </p>
                  {failedPayload && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll-to-bottom */}
        {showScrollDown && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className="absolute bottom-32 left-1/2 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-lg transition hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-pine-800"
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
        )}

        {/* Fixed composer */}
        <div className="relative border-t border-stone-200/70 bg-porcelain">
          <div className="mx-auto w-full max-w-3xl px-3 pt-3 pb-2 sm:px-4">
            <Composer
              value={input}
              babyAge={activeConversation ? (activeConversation.babyAge ?? "") : babyAge}
              isLoading={isLoading}
              onChange={setInput}
              inputRef={composerInputRef}
              onAgeChange={(value) => {
                if (activeConversation) {
                  // Changing age mid-chat updates that chat going forward.
                  const nextAge = value === "" ? undefined : value;
                  setConversations((previous) =>
                    previous.map((conversation) =>
                      conversation.id === activeConversation.id
                        ? {
                            ...conversation,
                            babyAge: nextAge,
                            updatedAt: Date.now(),
                          }
                        : conversation,
                    ),
                  );
                } else {
                  setBabyAge(value);
                }
              }}
              onSubmit={handleSubmit}
            />
            <p className="flex items-center justify-center gap-1.5 px-2 pt-2 pb-1 text-center text-[11px] leading-relaxed text-stone-400">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              {SAFETY_NOTICE}
            </p>
            <p className="pb-1 text-center text-[10px] text-stone-300 sm:text-[11px] sm:text-stone-400">
              Made by{" "}
              <a
                href="https://lezins-portfolio.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 transition hover:text-pine-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pine-800 sm:font-medium sm:text-stone-500 sm:underline sm:decoration-stone-300 sm:underline-offset-2"
              >
                lezinvahab
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
