import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Section header: title left, "View all →" right.
 *
 * Shared so every homepage section uses one type scale and one link treatment
 * rather than each re-deciding — consistency compounds trust (Blueprint §3.6).
 */
export function HomeSectionHeader({
  title,
  href,
  linkLabel,
  as: Heading = "h2",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <Heading className="font-display text-[24px] leading-[32px] tracking-tight text-ink sm:text-[28px]">
        {title}
      </Heading>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {linkLabel}
          <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
