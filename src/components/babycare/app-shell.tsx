"use client";

import { useEffect, useState } from "react";
import { BabyCareApp } from "@/components/babycare/babycare-app";
import { Splash } from "@/components/babycare/splash";

/** Minimum splash visibility: long enough to avoid a flash, nothing more. */
const SPLASH_MIN_MS = 500;
/** Fade-out duration (must match the Splash transition). */
const SPLASH_FADE_MS = 300;

/**
 * Renders the app immediately with a transient splash overlay.
 * The splash is time-based only: it never waits for storage, network,
 * or Gemini, and it never reappears during chat interactions.
 */
export function AppShell() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), SPLASH_MIN_MS);
    const doneTimer = setTimeout(
      () => setPhase("done"),
      SPLASH_MIN_MS + SPLASH_FADE_MS,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <>
      {phase !== "done" && <Splash fading={phase === "fade"} />}
      <BabyCareApp />
    </>
  );
}
