"use client";

import { cn } from "@/lib/utils";

/**
 * The Littly text wordmark: "Litt" in deep green, "ly" in mint green.
 * Always rendered as real text (never part of an image) so the font
 * stays consistent and each half keeps its brand color.
 */
export function LittlyWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-brand", className)} aria-label="Littly">
      <span aria-hidden="true" className="text-littly-deep">
        Litt
      </span>
      <span aria-hidden="true" className="text-mint">
        ly
      </span>
    </span>
  );
}
