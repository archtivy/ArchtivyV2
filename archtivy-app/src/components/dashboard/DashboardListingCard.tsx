import Image from "next/image";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { editHrefForStep } from "@/lib/publish/listingCompleteness";
import { getListingUrl } from "@/lib/canonical";
import type { DashboardListing } from "@/lib/db/dashboard";

/**
 * A listing card on the dashboard grid.
 *
 * ── A DRAFT SAYS WHAT IS MISSING, NOT JUST THAT IT IS A DRAFT ───────────────
 * The mockup's static "Draft" chip tells the author nothing they did not
 * already know. This uses the same SEO checklist the wizard shows live, names
 * the count, and links the first missing field straight to the wizard step that
 * fixes it — so the badge is a route into the work rather than a label on it.
 *
 * A draft whose checklist is fully satisfied says "Ready to publish" instead:
 * at that point the missing thing is the decision, not a field.
 */
export function DashboardListingCard({ listing }: { listing: DashboardListing }) {
  const isDraft = listing.status === "DRAFT";
  const c = listing.completeness;
  const firstMissing = c?.missing[0] ?? null;
  const editHref = editHrefForStep(listing.id, firstMissing?.step ?? null);

  // A draft has no public page, so its whole card points at the wizard.
  const primaryHref = isDraft
    ? editHref
    : getListingUrl({
        id: listing.id,
        type: listing.type,
        slug: listing.slug ?? undefined,
      });

  return (
    <li className="group relative overflow-hidden rounded-2xl border border-hairline bg-white transition-colors hover:border-ink/20">
      <Link href={primaryHref} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone/40">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-body text-[12px] text-muted">
              No image yet
            </span>
          )}
        </div>
      </Link>

      {/* Row actions, revealed on hover but always reachable by keyboard —
          opacity, not conditional rendering, so tab order never changes. */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Link
          href={editHref}
          aria-label={`Edit ${listing.title}`}
          className="rounded-lg bg-white/95 p-1.5 text-ink shadow-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink/25"
        >
          <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href="/me/listings"
          aria-label={`Manage ${listing.title}`}
          className="rounded-lg bg-white/95 p-1.5 text-ink shadow-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-ink/25"
        >
          <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <div className="p-4">
        <Link href={primaryHref} className="block">
          <h3 className="truncate font-body text-[14px] font-medium text-ink">
            {listing.title}
          </h3>
        </Link>

        <div className="mt-2">
          {isDraft ? (
            c && c.missingCount > 0 ? (
              <Link
                href={editHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-body text-[11px] font-medium text-amber-900 transition-colors hover:bg-amber-100"
              >
                {c.missingCount} {c.missingCount === 1 ? "field" : "fields"} missing
                {firstMissing && (
                  <span className="font-normal text-amber-800/80">
                    · {shortLabel(firstMissing.label)}
                  </span>
                )}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 font-body text-[11px] font-medium text-emerald-800">
                Ready to publish
              </span>
            )
          ) : (
            <span className="font-body text-[11px] text-muted">
              {listing.views} {listing.views === 1 ? "view" : "views"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The checklist labels are written for a full-width panel ("Meta description is
 * 120–160 characters"). On a card they need to survive one line, so the
 * quantified tail is dropped and the subject kept.
 */
function shortLabel(label: string): string {
  return label
    .replace(/ is \d+–\d+ characters$/, "")
    .replace(/ is at least \d+ words$/, "")
    .replace(/^At least \d+ /, "")
    .replace(/ is present and specific$/, "")
    .toLowerCase();
}
