import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "link";

interface ButtonBaseProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

interface ButtonAsButton extends ButtonBaseProps {
  as?: "button";
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  href?: never;
}

interface ButtonAsLink extends ButtonBaseProps {
  as: "link";
  href: string;
  type?: never;
  onClick?: never;
}

type ButtonProps = (ButtonAsButton | ButtonAsLink) & {
  variant?: ButtonVariant;
};

/*
 * ── ACCENT MIGRATION, FIRST STEP ────────────────────────────────────────────
 * Jet Black (#0B0B0B) is the confirmed brand primary. Neither blue that this
 * file used was correct: archtivy.primary is #173DED and the wider codebase is
 * dominated by a hardcoded #002abf (511 occurrences across 114 files).
 *
 * This component only. It is the shared primitive, so changing the FILL here
 * moves most primary buttons at once while staying reviewable in one file. No
 * global find-and-replace.
 *
 * FILLS are migrated. FOCUS RINGS are deliberately NOT, pending sign-off on
 * the contrast numbers — they still point at archtivy-primary below. Note the
 * `ring-offset-2` on every variant: the ring never touches the button fill, so
 * its adjacent colour is the offset (white on light), which is what makes a
 * near-black ring viable at all.
 *
 * The `link` variant keeps its blue text on purpose. A link rendered in Jet
 * Black sits at 1.09:1 against ink body text — visually identical — so it
 * would lose its affordance entirely. Link colour is a separate decision.
 *
 * Dark-mode treatment is out of scope and bundled into the dark-mode colour
 * decision; the dark: classes here are untouched.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "inline-block rounded-[20px] bg-archtivy-jet px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none focus:ring-offset-white dark:focus:ring-offset-zinc-950",
  secondary:
    "inline-block rounded-[20px] border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950",
  link:
    "rounded-[20px] text-archtivy-primary hover:opacity-90 hover:underline focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:focus:ring-offset-zinc-950",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base = variantClasses[variant];

  if (rest.as === "link" && "href" in rest) {
    const { href } = rest;
    return (
      <Link
        href={href}
        className={`${base} ${className}`.trim()}
        aria-disabled={disabled}
      >
        {children}
      </Link>
    );
  }

  const { type = "button", onClick } = rest as ButtonAsButton;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
