"use client";

import { useId, useRef } from "react";
import { ArrowUp } from "lucide-react";
import {
  BABY_AGE_OPTIONS,
  MAX_QUESTION_LENGTH,
  QUESTION_PLACEHOLDER,
} from "@/lib/babycare/constants";

interface ComposerProps {
  value: string;
  babyAge: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onSubmit: () => void;
  /** Lets the parent focus the input (e.g. after quoting a message). */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function Composer({
  value,
  babyAge,
  isLoading,
  onChange,
  onAgeChange,
  onSubmit,
  inputRef,
}: ComposerProps) {
  const inputId = useId();
  const ageId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  }

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask Littly"
      className="rounded-3xl border border-stone-200 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition focus-within:border-pine-800/50 sm:p-3"
    >
      <label htmlFor={inputId} className="sr-only">
        Type your question
      </label>
      <textarea
        ref={(element) => {
          textareaRef.current = element;
          if (inputRef) inputRef.current = element;
        }}
        id={inputId}
        value={value}
        rows={1}
        maxLength={MAX_QUESTION_LENGTH}
        placeholder={QUESTION_PLACEHOLDER}
        disabled={isLoading}
        onChange={(event) => {
          onChange(event.target.value);
          autoResize();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="max-h-44 min-h-11 w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[15px] leading-relaxed text-stone-900 outline-none placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="flex items-center justify-between gap-2 px-1.5 pt-1.5 pb-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor={ageId} className="sr-only">
            Baby&apos;s age (optional)
          </label>
          <select
            id={ageId}
            value={babyAge}
            disabled={isLoading}
            onChange={(event) => onAgeChange(event.target.value)}
            aria-label="Baby's age (optional)"
            className="h-9 max-w-36 truncate rounded-full border border-stone-200 bg-stone-50 px-3 text-[13px] font-medium text-stone-600 transition hover:border-stone-300 focus:border-pine-800 focus:outline-2 focus:outline-offset-1 focus:outline-pine-800 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-44"
          >
            <option value="">Age: anytime</option>
            {BABY_AGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send question"
          title="Send (Enter)"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pine-800 text-white shadow-[0_4px_14px_rgba(15,77,58,0.35)] transition hover:bg-pine-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
