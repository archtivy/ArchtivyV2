"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A placeholder that types and deletes example queries.
 *
 * ── WHY THE PLACEHOLDER AND NOT THE VALUE ───────────────────────────────────
 * This only ever returns a string for the `placeholder` attribute. It never
 * touches the input's value, so it is structurally incapable of interfering
 * with what someone has typed — the browser hides the placeholder the moment
 * the field is non-empty, and the search logic never sees any of this.
 *
 * That matters more than it sounds: the obvious implementation of an animated
 * search field writes into the value and clears it on focus, which races with
 * a fast typist and can eat their first keystroke.
 *
 * ── WHAT IT IS FOR ──────────────────────────────────────────────────────────
 * The examples are the point. "Search projects" tells a visitor nothing they
 * had not assumed; "residential projects in Los Angeles" tells them the
 * platform understands typology, category and place together, which is the
 * one thing about Archtivy that is hard to convey in a static string.
 */

/** Concrete, plausible, and each demonstrates a different axis of discovery. */
export const SEARCH_EXAMPLES = [
  "residential projects in Los Angeles",
  "surface brands in Germany",
  "lighting products for restaurants",
  "architecture studios in Tokyo",
  "timber houses in Norway",
  "Italian furniture brands",
  "hospitality projects in Mexico City",
  "stone suppliers in Portugal",
] as const;

/** Deliberately unhurried — a header that types at speed reads as a gimmick. */
const TYPE_MS = 58;
const DELETE_MS = 26;
const HOLD_AFTER_TYPING_MS = 1900;
const GAP_BEFORE_NEXT_MS = 420;

export interface AnimatedPlaceholderOptions {
  /** The stable lead-in. The examples are appended after it. */
  prefix?: string;
  /** Pass false while the field is focused or non-empty. */
  active: boolean;
  examples?: readonly string[];
}

export function useAnimatedPlaceholder({
  prefix = "Search",
  active,
  examples = SEARCH_EXAMPLES,
}: AnimatedPlaceholderOptions): string {
  /*
   * The resting string, and the whole placeholder under reduced motion. It is
   * also the server-rendered value, so the field never hydrates from empty.
   */
  const staticText = `${prefix}…`;

  const [typed, setTyped] = useState("");
  const [reduced, setReduced] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced || !active || examples.length === 0) {
      setTyped("");
      return;
    }

    let cancelled = false;
    let phraseIndex = Math.floor(Math.random() * examples.length);
    let charIndex = 0;
    let deleting = false;

    const schedule = (fn: () => void, ms: number) => {
      timer.current = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const step = () => {
      const phrase = examples[phraseIndex % examples.length];

      if (!deleting) {
        charIndex += 1;
        setTyped(phrase.slice(0, charIndex));
        if (charIndex >= phrase.length) {
          deleting = true;
          schedule(step, HOLD_AFTER_TYPING_MS);
          return;
        }
        schedule(step, TYPE_MS);
        return;
      }

      charIndex -= 1;
      setTyped(phrase.slice(0, Math.max(0, charIndex)));
      if (charIndex <= 0) {
        deleting = false;
        phraseIndex += 1;
        schedule(step, GAP_BEFORE_NEXT_MS);
        return;
      }
      schedule(step, DELETE_MS);
    };

    schedule(step, GAP_BEFORE_NEXT_MS);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, reduced, examples]);

  if (reduced || !active) return staticText;
  return typed ? `${prefix} ${typed}` : staticText;
}
