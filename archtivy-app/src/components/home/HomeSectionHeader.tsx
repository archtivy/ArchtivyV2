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
  subtitle,
  href,
  linkLabel,
  as: Heading = "h2",
}: {
  title: string;
  /** One muted line under the title. Omitted entirely when absent. */
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  as?: "h2" | "h3";
}) {
  return (
    /* Alignment is conditional, and deliberately so. With a subtitle the left
       side is two lines, and items-end would drop the "View all" link down
       beside the SUBTITLE rather than the heading — so those headers align to
       the top and the link gets a small optical nudge instead.

       Without a subtitle it stays items-end, exactly as before. DiscoverSection
       is the other consumer with a link, and switching it unconditionally would
       have moved that link ~10px up on a section this task is not meant to
       touch. */
    <div
      className={`mb-6 flex justify-between gap-4 ${
        subtitle ? "items-start" : "items-end"
      }`}
    >
      <div className="min-w-0">
      <Heading className="font-display text-[24px] leading-[32px] tracking-tight text-ink sm:text-[28px]">
        {title}
      </Heading>
      {subtitle && (
        <p className="mt-2 font-body text-[14px] leading-[22px] text-muted">{subtitle}</p>
      )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className={`inline-flex shrink-0 items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline ${
            subtitle ? "mt-1.5" : ""
          }`}
        >
          {linkLabel}
          <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
