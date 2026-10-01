"use client";

import { LittlyWordmark } from "@/components/babycare/littly-wordmark";
import { cn } from "@/lib/utils";

/**
 * Startup splash: pacifier centered on the app background with a subtle
 * linear progress hint. Purely visual — never blocks app readiness.
 * No focusable elements, so focus is never trapped. Removed from the
 * tree entirely once the fade completes.
 */
export function Splash({ fading }: { fading: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading Littly"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-porcelain transition-opacity duration-300",
        fading && "pointer-events-none opacity-0",
      )}
    >
      <div
        aria-hidden="true"
        className="animate-rise-in flex flex-col items-center gap-5"
      >
        <img
          src="/logo/littly-icon.svg"
          alt=""
          aria-hidden="true"
          width={112}
          height={104}
          className="h-20 w-auto sm:h-24"
          draggable={false}
        />
        <LittlyWordmark
          className="text-3xl font-semibold tracking-tight"
        />
      </div>
      <div
        aria-hidden="true"
        className="h-[3px] w-36 overflow-hidden rounded-full bg-pine-800/10"
      >
        <div className="animate-splash-bar h-full w-1/3 rounded-full bg-pine-800/70" />
      </div>
      <span className="sr-only">Loading Littly…</span>
    </div>
  );
}
