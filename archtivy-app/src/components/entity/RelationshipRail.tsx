import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EntityCard, initialsOf } from "@/components/home/EntityCard";

/**
 * Relationship Rail — the persistent right-hand panel stack (Blueprint §21).
 *
 * Generic on purpose: Product Detail and Professional Profile reuse the same
 * panel primitives, so this lives in components/entity/ alongside Gallery.
 *
 * "Relationships are as valuable as entities" — this rail is the literal
 * interface expression of that, which is why it renders on every tab rather
 * than only on Overview.
 */

export function RailPanel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-cream p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-body text-[15px] text-ink">{title}</h2>
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {linkLabel}
            <ArrowRight strokeWidth={1.5} className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export interface RailProduct {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  category: string | null;
  brand: string | null;
}

/**
 * "Used in this project".
 *
 * Renders nothing at all when there are no tagged products — the common case
 * (45 of 50 projects). A blank panel would read as broken, and an "Add
 * products" CTA belongs to the Publish flow, not a public read page.
 */
export function UsedInProjectPanel({
  products,
  total,
  productsHref,
}: {
  products: RailProduct[];
  total: number;
  productsHref: string;
}) {
  if (total === 0) return null;

  return (
    <RailPanel
      title="Used in this project"
      href={total > products.length ? productsHref : undefined}
      linkLabel={total > products.length ? `View all ${total}` : undefined}
    >
      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={p.href} className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-stone">
                {p.cover && (
                  <Image src={p.cover} alt="" fill sizes="56px" className="object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-body text-[13px] text-ink">{p.title}</span>
                {p.brand && (
                  <span className="block truncate font-body text-[12px] text-muted">
                    {p.brand}
                  </span>
                )}
                {p.category && (
                  <span className="block truncate font-body text-[12px] text-muted">
                    {p.category}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </RailPanel>
  );
}

/** Project Details — every row omitted when its field is null. No "—" rows. */
export function DetailsPanel({ rows }: { rows: { label: string; value: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <RailPanel title="Project Details">
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 font-body text-[12px] text-muted">{r.label}</dt>
            <dd className="text-right font-body text-[13px] text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </RailPanel>
  );
}

export interface RelatedItem {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  architect: string | null;
  imageCount: number;
}

/**
 * Related Projects.
 *
 * `reason` is shown as the panel title so the basis is stated plainly — same
 * building type, or same architect. There is no similarity score and no AI
 * involvement, so nothing here is labelled as such (Blueprint §13).
 */
export function RelatedPanel({
  items,
  reason,
}: {
  items: RelatedItem[];
  reason: string;
}) {
  if (items.length === 0) return null;
  return (
    <RailPanel title={reason}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {items.map((r) => (
          <EntityCard
            key={r.id}
            href={r.href}
            title={r.title}
            subtitle={r.architect}
            imageUrl={r.cover}
            imageCount={r.imageCount}
            avatarInitials={initialsOf(r.architect)}
            sizes="(max-width: 1024px) 45vw, 12vw"
          />
        ))}
      </div>
    </RailPanel>
  );
}
