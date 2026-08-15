import Link from "next/link";
import Image from "next/image";
import { MapPin, Images } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";
import type { InspirationItem } from "@/lib/db/inspirations";

/**
 * Inspiration card — presentation only (spec §9).
 *
 * NOT EntityCard, and the reason is the Discovery Loop. EntityCard's whole
 * anatomy ends at a metadata line; this card has to carry a variable-length row
 * of OUTBOUND links to other entities, each of which is a real navigation
 * target. Adding a hops array to EntityCard would push link rendering into a
 * component used by five directory pages that never want it.
 *
 * HOPS ARE CONDITIONAL, PER CARD. A hop appears only if the relationship
 * exists for this item — no empty state, no disabled control, no "0 products".
 * With Project→Product confirmed on 5 of 50 projects, most project cards will
 * show a designer hop and nothing else, which is the honest rendering of the
 * current data (spec §9.6).
 *
 * The `matches` table's 524 embedding-derived suggestions are deliberately not
 * used here — see lib/db/inspirations.ts.
 */
export function InspirationCard({
  item,
  priority = false,
}: {
  item: InspirationItem;
  priority?: boolean;
}) {
  const chips = [
    item.categoryLabel,
    ...item.styleLabels.slice(0, 1),
    ...item.spaceLabels.slice(0, 1),
    item.year ? String(item.year) : null,
  ].filter((c): c is string => Boolean(c));

  return (
    <article className="group min-w-0">
      <div className="relative w-full overflow-hidden rounded-lg bg-stone">
        <Link href={item.href} className="block aspect-[4/3]">
          {item.cover ? (
            <Image
              src={item.cover}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              priority={priority}
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <span className="absolute inset-0" aria-hidden />
          )}
        </Link>

        {item.imageCount > 1 && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded bg-ink/70 px-2 py-1 font-body text-[11px] text-cream backdrop-blur-sm">
            <Images strokeWidth={1.5} className="h-3 w-3" aria-hidden />
            {item.imageCount}
          </span>
        )}

        {/* Materials are not listings, so there is nothing for the save action
            to write against — the control is omitted rather than shown broken. */}
        {item.entityType !== "material" && <SaveToggle listingId={item.id} />}
      </div>

      {item.locationText && (
        <p className="mt-3 flex items-center gap-1 font-body text-[12px] leading-[16px] text-muted">
          <MapPin strokeWidth={1.5} className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{item.locationText}</span>
        </p>
      )}

      <h3 className={item.locationText ? "mt-1" : "mt-3"}>
        <Link href={item.href} className="font-body text-[15px] leading-[22px] text-ink">
          {item.title}
        </Link>
      </h3>

      {item.attribution && (
        <p className="mt-1 font-body text-[13px] leading-[18px] text-muted">{item.attribution}</p>
      )}

      {chips.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded border border-hairline px-2 py-0.5 font-body text-[11px] leading-[16px] text-muted"
            >
              {c}
            </li>
          ))}
        </ul>
      )}

      {/* ── Discovery Loop ──────────────────────────────────────────────────
          Real outbound links only. Absent relationships produce no row at all. */}
      {item.hops.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-hairline pt-2.5">
          {item.hops.slice(0, 4).map((hop) => (
            <li key={`${hop.kind}-${hop.href}`} className="min-w-0">
              <Link
                href={hop.href}
                className="font-body text-[12px] text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
              >
                {hop.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
