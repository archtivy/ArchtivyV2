"use client";

import * as React from "react";

export interface ExpandableDescriptionProps {
  /** Full description text (plain or with newlines) */
  text: string;
  /** Optional id for the section (accessibility) */
  id?: string;
  /** Optional heading above the description */
  heading?: string;
  /** Character count for "first paragraph" (default 400). Expand shows rest. */
  firstParagraphMaxLength?: number;
  className?: string;
}

/**
 * Shows first paragraph only; "See more" toggles full description with smooth expansion.
 */
export function ExpandableDescription({
  text,
  id = "description",
  heading,
  firstParagraphMaxLength = 400,
  className = "",
}: ExpandableDescriptionProps) {
  const trimmed = text?.trim();
  const [expanded, setExpanded] = React.useState(false);

  if (!trimmed) return null;

  const firstNewline = trimmed.indexOf("\n");
  const firstChunk =
    firstNewline >= 0
      ? trimmed.slice(0, firstNewline).trim()
      : trimmed.length <= firstParagraphMaxLength
        ? trimmed
        : trimmed.slice(0, firstParagraphMaxLength).trim();
  const hasMore = trimmed.length > firstChunk.length;

  return (
    <section
      id={id}
      className={`space-y-3 ${className}`.trim()}
      aria-labelledby={heading ? `${id}-heading` : undefined}
    >
      {heading && (
        <h2
          id={`${id}-heading`}
          className="font-serif text-lg font-normal text-zinc-900 dark:text-zinc-100"
        >
          {heading}
        </h2>
      )}
      <div
        className="max-w-[65ch] whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400"
        style={{ lineHeight: 1.7 }}
      >
        {expanded ? trimmed : firstChunk}
        {hasMore && !expanded && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-medium text-[#002abf] hover:underline focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded dark:text-[#002abf]"
            >
              See more
            </button>
          </>
        )}
        {hasMore && expanded && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-medium text-[#002abf] hover:underline focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded dark:text-[#002abf]"
            >
              See less
            </button>
          </>
        )}
      </div>
    </section>
  );
}
