"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free renderer for the simple Markdown Gemini returns
 * (headings, bold, italic, inline code, bullet/numbered lists, paragraphs).
 * Builds React elements from plain text — no innerHTML, so no XSS risk.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // bold (**..**), italic (*..*), inline code (`..`)
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`${keyPrefix}-${key++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={`${keyPrefix}-${key++}`}
          className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.85em] text-stone-700"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={`${keyPrefix}-${key++}`}>{token.slice(1, -1)}</em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`${keyPrefix}-${key++}`}>{text.slice(lastIndex)}</Fragment>,
    );
  }
  return parts;
}

export function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];

  let listItems: { ordered: boolean; items: string[] } | null = null;
  let blockKey = 0;

  function flushList() {
    if (!listItems) return;
    const { ordered, items } = listItems;
    listItems = null;
    if (ordered) {
      blocks.push(
        <ol
          key={`b-${blockKey++}`}
          className="grid list-decimal gap-1.5 pl-5"
        >
          {items.map((item, i) => (
            <li key={i} className="pl-1">
              {renderInline(item, `ol-${blockKey}-${i}`)}
            </li>
          ))}
        </ol>,
      );
    } else {
      blocks.push(
        <ul key={`b-${blockKey++}`} className="grid list-disc gap-1.5 pl-5">
          {items.map((item, i) => (
            <li key={i} className="pl-1 marker:text-pine-800">
              {renderInline(item, `ul-${blockKey}-${i}`)}
            </li>
          ))}
        </ul>,
      );
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const className =
        level === 1
          ? "text-base font-semibold"
          : "text-[15px] font-semibold";
      blocks.push(
        <p key={`b-${blockKey++}`} className={className}>
          {renderInline(content, `h-${blockKey}`)}
        </p>,
      );
      continue;
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      if (!listItems || listItems.ordered) {
        flushList();
        listItems = { ordered: false, items: [] };
      }
      listItems.items.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (orderedMatch) {
      if (!listItems || !listItems.ordered) {
        flushList();
        listItems = { ordered: true, items: [] };
      }
      listItems.items.push(orderedMatch[1]);
      continue;
    }

    flushList();
    blocks.push(
      <p key={`b-${blockKey++}`}>
        {renderInline(line, `p-${blockKey}`)}
      </p>,
    );
  }
  flushList();

  return <div className="grid gap-2.5">{blocks}</div>;
}
