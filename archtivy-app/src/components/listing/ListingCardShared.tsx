import Link from "next/link";
import Image from "next/image";
import { Box, CircleDashed, Users } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";

/**
 * The shared listing card. One component for every place a project or product
 * renders as a card.
 *
 * ── WHAT IT REPLACED ────────────────────────────────────────────────────────
 * Three families rendering the same idea differently: ProjectListingCard /
 * ProductListingCard behind four adapters (ProjectCard, ProductCard, and their
 * two Premium variants), plus EntityCard's listing usages. The adapters existed
 * because two data shapes were in play — raw ListingCardData rows and
 * normalised ProjectCanonical / ProductCanonical. That difference is now
 * handled by mapping to ListingCardModel at the call site, so the card itself
 * has ONE input and no branching on provenance.
 *
 * Not replaced, deliberately: DashboardListingCard (owner-facing, draft-aware,
 * points at the wizard rather than a public page), EntityCard's profile and
 * article usages (different entity types), and InspirationCard (renders
 * materials, which have no listing behind them at all).
 *
 * ── THE BADGE IS ABSENT, NOT EMPTY ──────────────────────────────────────────
 * "Used N products from M brands" / "Used in N projects by M studios" renders
 * only when N > 0. This is the common case, not a guard: measured when written,
 * 8 of 53 projects and 15 of 80 products have any product/project link at all.
 * A badge reading "Used 0 products" on 85% of a grid would be worse than no
 * badge, and the reference mockup's "9 products from 7 brands" is a mockup
 * figure — the real maximum today is 5 from 4.
 *
 * The owner half is dropped independently: with N products but no identifiable
 * brand behind any of them, the badge says "Used 3 products" and stops, rather
 * than claiming "from 0 brands".
 *
 * ── NO AVATAR STACK ─────────────────────────────────────────────────────────
 * The mockup's overlapping team photos are gone. Credited profiles are mostly
 * auto-created stubs from listing_team_members with no avatar_url, so the stack
 * would have rendered as a row of identical initials blocks. The credited count
 * carries the same information honestly: an icon and "N connections".
 */

export interface ListingCardModel {
  id: string;
  type: "project" | "product";
  title: string;
  href: string;
  imageUrl: string | null;
  /** "Hospitality" for a project, "Lighting" for a product. */
  categoryLabel?: string | null;
  /** Second half of the meta line: location for a project, sub-type for a product. */
  metaLabel?: string | null;
  /** Filter link for the meta label. Project cards only — products have no city. */
  metaHref?: string | null;
  /** "by X" — studio for a project, designer or brand for a product. */
  authorName?: string | null;
  authorHref?: string | null;
  /** "for Y" — products only, when the maker and the brand differ. */
  brandName?: string | null;
  brandHref?: string | null;
  /** Square logo chip at the right of the title row. */
  logoUrl?: string | null;
  /** Project cards only. Rendered after the author as "· 2025", linking to the year filter. */
  year?: number | string | null;
  yearHref?: string | null;
  /** Badge numbers. See getCardBadgeCounts. */
  relatedCount?: number;
  ownerCount?: number;
  /** Project cards only: profile-linked credits. */
  creditCount?: number;
  /** Whether this item is already on one of the viewer's boards. */
  initialSaved?: boolean;
}

function BadgeOverlay({ model }: { model: ListingCardModel }) {
  const related = model.relatedCount ?? 0;
  if (related <= 0) return null;

  const owners = model.ownerCount ?? 0;
  const isProject = model.type === "project";

  const line1 = isProject
    ? `Used ${related} ${related === 1 ? "product" : "products"}`
    : `Used in ${related} ${related === 1 ? "project" : "projects"}`;
  const line2 =
    owners > 0
      ? isProject
        ? `from ${owners} ${owners === 1 ? "brand" : "brands"}`
        : `by ${owners} ${owners === 1 ? "studio" : "studios"}`
      : null;

  const Icon = isProject ? Box : CircleDashed;

  return (
    // Deliberately lighter than the first pass. The badge sits ON the
    // photograph, so every pixel it takes is one the image loses; it should
    // read as an annotation, not a banner.
    <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2 rounded-md bg-ink/65 py-1.5 pl-1.5 pr-2.5 backdrop-blur-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-cream/15">
        <Icon strokeWidth={1.5} className="h-3.5 w-3.5 text-cream" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-body text-[12px] font-medium leading-[15px] text-cream">
          {line1}
        </span>
        {line2 && (
          <span className="block truncate font-body text-[11px] leading-[14px] text-cream/70">
            {line2}
          </span>
        )}
      </span>
    </div>
  );
}

export function ListingCardShared({
  model,
  ratio = "4/3",
  priority = false,
  sizes = "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw",
}: {
  model: ListingCardModel;
  ratio?: "4/3" | "1/1";
  priority?: boolean;
  sizes?: string;
}) {
  const credits = model.creditCount ?? 0;
  const metaParts = [model.categoryLabel, model.metaLabel].filter(Boolean) as string[];

  return (
    <article className="group flex min-w-0 flex-col">
      <div className="relative w-full overflow-hidden rounded-lg bg-stone">
        <Link
          href={model.href}
          className={ratio === "1/1" ? "block aspect-square" : "block aspect-[4/3]"}
          aria-label={model.title}
        >
          {model.imageUrl ? (
            <Image
              src={model.imageUrl}
              alt=""
              fill
              sizes={sizes}
              priority={priority}
              className={[
                // Both types fill their frame. Products used object-contain with
                // padding, which left the stone tile visible around every
                // catalogue shot — a letterboxed image inside a card reads as a
                // loading state, not a design.
                //
                // The crop is biased UP rather than centred. A 4/3 window on an
                // architectural photograph, centred, reliably cuts the top off
                // the building — the part the photograph is usually about.
                // Pulling the focal point to 35% keeps roofline and sky and
                // gives up foreground, which is the cheaper half of the frame.
                "object-cover",
                model.type === "product" ? "object-center" : "object-[50%_35%]",
                "transition-transform duration-200 ease-out group-hover:scale-[1.02]",
                "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
              ].join(" ")}
            />
          ) : (
            <span className="absolute inset-0" aria-hidden />
          )}
        </Link>

        <BadgeOverlay model={model} />

        {/* Always visible, not hover-revealed. Saving is a primary action on a
            card, and a control that only exists once a mouse is over it is
            invisible to touch users at rest and absent from any screenshot —
            which is exactly how it read as "missing" twice during review. */}
        <SaveToggle
          listingId={model.id}
          entityType={model.type}
          entityTitle={model.title}
          initialSaved={model.initialSaved}
          alwaysVisible
          tone="dark"
        />
      </div>

      <div className="mt-3 min-w-0">
        {metaParts.length > 0 && (
          <p className="truncate font-body text-[12px] leading-[16px] text-muted">
            {model.metaHref && model.metaLabel ? (
              <>
                {model.categoryLabel && <>{model.categoryLabel} &middot; </>}
                <Link href={model.metaHref} className="hover:text-ink hover:underline">
                  {model.metaLabel}
                </Link>
              </>
            ) : (
              metaParts.join(" · ")
            )}
          </p>
        )}

        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[17px] leading-[24px] text-ink">
              <Link href={model.href} className="hover:underline">
                {model.title}
              </Link>
            </h3>

            {(model.authorName || model.brandName) && (
              <p className="mt-0.5 truncate font-body text-[13px] leading-[18px] text-muted">
                {model.authorName && (
                  <>
                    by{" "}
                    {model.authorHref ? (
                      <Link href={model.authorHref} className="text-ink hover:underline">
                        {model.authorName}
                      </Link>
                    ) : (
                      <span className="text-ink">{model.authorName}</span>
                    )}
                  </>
                )}
                {model.brandName && (
                  <>
                    {" "}
                    for{" "}
                    {model.brandHref ? (
                      <Link href={model.brandHref} className="text-ink hover:underline">
                        {model.brandName}
                      </Link>
                    ) : (
                      <span className="text-ink">{model.brandName}</span>
                    )}
                  </>
                )}
                {model.year && (
                  <>
                    {" · "}
                    {model.yearHref ? (
                      <Link href={model.yearHref} className="hover:text-ink hover:underline">
                        {model.year}
                      </Link>
                    ) : (
                      model.year
                    )}
                  </>
                )}
              </p>
            )}
          </div>

          {model.logoUrl && (
            <span className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-md border border-hairline bg-cream">
              <Image src={model.logoUrl} alt="" fill sizes="40px" className="object-contain p-1.5" />
            </span>
          )}
        </div>

        {/* Credited people. Project cards only, and only when someone is
            actually credited — the divider comes with the row rather than
            drawing a line under nothing. */}
        {model.type === "project" && credits > 0 && (
          <div className="mt-3 border-t border-hairline pt-3">
            {/* Same chip language as the image badge — rounded container, icon
                block, text — at a smaller weight. Previously this was bare text
                floating under a rule, which read as a caption that had lost its
                container rather than a deliberate element. One visual grammar
                for both counts, rather than a pill on the image and loose text
                beneath it. */}
            <span className="inline-flex items-center gap-1.5 rounded-md bg-stone py-1 pl-1 pr-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ink/[0.06]">
                <Users strokeWidth={1.5} className="h-3 w-3 text-muted" aria-hidden />
              </span>
              <span className="font-body text-[11px] leading-[14px] text-muted">
                {credits} {credits === 1 ? "connection" : "connections"}
              </span>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
