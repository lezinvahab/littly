"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Quote,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import type { ChatMessage } from "@/types/babycare";
import { cn } from "@/lib/utils";
import { MiniMarkdown } from "@/components/babycare/markdown";
import { LittlyWordmark } from "@/components/babycare/littly-wordmark";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActionButton({
  label,
  title,
  onClick,
  onMouseDown,
  disabled,
  active,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pine-800 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "bg-mist text-pine-900"
          : "text-stone-400 hover:bg-stone-100 hover:text-stone-600",
      )}
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard unavailable (permissions); fall back to execCommand.
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <ActionButton
      label={copied ? "Copied" : "Copy response"}
      title={copied ? "Copied" : "Copy response"}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-3.5 text-pine-800" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy"}
    </ActionButton>
  );
}

interface ChatMessageCardProps {
  message: ChatMessage;
  /** True when this is the latest message in the conversation. */
  isLatest: boolean;
  /** Disable actions that call the API while a response is loading. */
  actionsDisabled: boolean;
  /** Insert (selected) text into the composer as a quote. */
  onQuote: (message: ChatMessage, selectedText: string | null) => void;
  /** Re-request the latest assistant response. */
  onRegenerate: () => void;
  onFeedback: (id: string, feedback: "up" | "down" | undefined) => void;
}

export function ChatMessageCard({
  message,
  isLatest,
  actionsDisabled,
  onQuote,
  onRegenerate,
  onFeedback,
}: ChatMessageCardProps) {
  const isUser = message.role === "user";
  const contentRef = useRef<HTMLDivElement>(null);
  // Remembers the last text selection inside this message. Clicking the
  // Quote button can collapse the live selection, so we keep a copy.
  const storedSelection = useRef<string | null>(null);

  function captureSelection() {
    const selection =
      typeof window !== "undefined" ? window.getSelection() : null;
    if (
      selection &&
      !selection.isCollapsed &&
      contentRef.current?.contains(selection.anchorNode)
    ) {
      const text = selection.toString().trim();
      storedSelection.current = text.length > 0 ? text.slice(0, 1000) : null;
    }
  }

  function handleQuote() {
    // Prefer the live selection, fall back to the stored one (button
    // clicks can collapse the live selection before onClick fires).
    let selected = storedSelection.current;
    const selection =
      typeof window !== "undefined" ? window.getSelection() : null;
    if (
      selection &&
      !selection.isCollapsed &&
      contentRef.current?.contains(selection.anchorNode)
    ) {
      const text = selection.toString().trim();
      if (text.length > 0) selected = text.slice(0, 1000);
    }
    storedSelection.current = null;
    onQuote(message, selected);
  }

  function handleFeedback(value: "up" | "down") {
    onFeedback(message.id, message.feedback === value ? undefined : value);
  }

  return (
    <article
      aria-label={isUser ? "Your question" : "Littly response"}
      className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <span
          aria-hidden="true"
          className="mt-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200/80 bg-white"
        >
          <img
            src="/logo/littly-icon.svg"
            alt=""
            width={26}
            height={24}
            className="h-6 w-auto"
            draggable={false}
          />
        </span>
      )}

      <div
        className={cn(
          "min-w-0 rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words",
          isUser
            ? "max-w-[85%] rounded-br-md bg-pine-800 text-white sm:max-w-[75%]"
            : "w-full rounded-bl-md border border-stone-200/80 bg-white text-stone-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
            {isUser ? "You" : <LittlyWordmark />}
          </p>
          <p
            className={cn(
              "text-[11px]",
              isUser ? "text-pine-100" : "text-stone-400",
            )}
          >
            {formatTime(message.createdAt)}
          </p>
        </div>
        <div
          ref={contentRef}
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MiniMarkdown text={message.content} />
          )}
        </div>
        {!isUser && (
          <div className="mt-2 flex items-center gap-0.5 border-t border-stone-100 pt-1.5">
            <CopyButton text={message.content} />
            <ActionButton
              label="Quote and reply"
              title="Quote this in your next question"
              onClick={handleQuote}
              onMouseDown={(event) => event.preventDefault()}
            >
              <Quote className="size-3.5" aria-hidden="true" />
              Quote
            </ActionButton>
            {isLatest && (
              <ActionButton
                label="Regenerate response"
                title="Get a fresh response"
                onClick={onRegenerate}
                disabled={actionsDisabled}
              >
                <RotateCw className="size-3.5" aria-hidden="true" />
                Retry
              </ActionButton>
            )}
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-stone-200" />
            <ActionButton
              label="Good response"
              title="Good response"
              onClick={() => handleFeedback("up")}
              active={message.feedback === "up"}
            >
              <ThumbsUp className="size-3.5" aria-hidden="true" />
            </ActionButton>
            <ActionButton
              label="Bad response"
              title="Bad response"
              onClick={() => handleFeedback("down")}
              active={message.feedback === "down"}
            >
              <ThumbsDown className="size-3.5" aria-hidden="true" />
            </ActionButton>
          </div>
        )}
      </div>

      {isUser && (
        <span
          aria-hidden="true"
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600"
        >
          <User className="size-4" strokeWidth={2} />
        </span>
      )}
    </article>
  );
}

export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Littly is thinking"
      className="flex items-center gap-3"
    >
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-stone-200/80 bg-white"
      >
        <img
          src="/logo/littly-icon.svg"
          alt=""
          width={26}
          height={24}
          className="h-6 w-auto"
          draggable={false}
        />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-stone-200/80 bg-white px-4 py-3.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            aria-hidden="true"
            className="size-2 animate-bounce rounded-full bg-pine-800/60"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
        <span className="sr-only">Getting a response…</span>
      </div>
    </div>
  );
}
