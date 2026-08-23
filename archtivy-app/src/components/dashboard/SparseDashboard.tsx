import Link from "next/link";
import { ArrowRight, FileText, Layers, Users } from "lucide-react";
import { DashboardListingCard } from "@/components/dashboard/DashboardListingCard";
import type { DashboardData } from "@/lib/db/dashboard";

/**
 * The dashboard as it looks for an account with little or nothing published.
 *
 * ── THIS IS THE PRIMARY LAYOUT, NOT A FALLBACK ──────────────────────────────
 * Of 34 accounts owning any listing, 14 fall below the rich threshold, and a
 * further 170 designer/brand accounts own nothing at all — so 184 of 204
 * publisher accounts land here. It cannot be the rich grid with smaller numbers
 * in it: a four-up stat rail reading 0 · 0 · 0 · 0 above an empty shelf reads
 * as a broken page rather than a new one.
 *
 * ── WHY THE TOP IS TWO COLUMNS ──────────────────────────────────────────────
 * The first version stacked everything in one left-aligned column. Prose wants
 * a ~52ch measure, so on a 1440px container that left two-fifths of the page
 * empty down its whole length — the page looked cramped and off-balance rather
 * than full-width.
 *
 * The measure is right and stays; what changed is that the width is now spent.
 * The intro keeps its reading width in a 7-column well, and "what happens next"
 * moves up beside it into the remaining 5 — content that was already on the
 * page, promoted to fill the space it was leaving blank. Everything below runs
 * the full width.
 */

const PROMPTS: Record<
  "designer" | "brand",
  { icon: typeof Layers; title: string; body: string }[]
> = {
  brand: [
    {
      icon: Layers,
      title: "Publish a product",
      body: "Products are how specifiers find you. Each one gets its own page, its own URL and its own place in the material filters.",
    },
    {
      icon: FileText,
      title: "Attach technical documents",
      body: "Spec sheets and care guides are the reason a designer returns to a product page. Downloads are tracked, so you can see which ones earn their place.",
    },
    {
      icon: Users,
      title: "Get specified",
      body: "When a designer credits your product on a project, it shows up here — and on the project page, permanently.",
    },
  ],
  designer: [
    {
      icon: Layers,
      title: "Publish a project",
      body: "A project page is the record: images, location, the team who built it and the products you specified.",
    },
    {
      icon: Users,
      title: "Credit your team",
      body: "Crediting collaborators links their profile to the work, and the credit appears on their page as well as yours.",
    },
    {
      icon: FileText,
      title: "Specify products",
      body: "Linking the products you used connects your project to every brand page it touches, and back again.",
    },
  ],
};

export function SparseDashboard({
  data,
  displayName,
}: {
  data: DashboardData;
  displayName: string;
}) {
  const isBrand = data.role === "brand";
  const addHref = isBrand ? "/add/product" : "/add/project";
  const noun = isBrand ? "product" : "project";
  const hasAny = data.listings.length > 0;
  const prompts = PROMPTS[data.role];
  const ordered = [...data.drafts, ...data.published];

  return (
    <div className="space-y-14">
      {/* ── Top: intro and next steps, side by side ───────────────────────── */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <section className="lg:col-span-7">
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            {displayName}
          </p>
          <h1 className="mt-3 font-display text-[40px] leading-[1.03] tracking-[-0.02em] text-ink sm:text-[52px]">
            {hasAny ? "Your work so far." : `Publish your first ${noun}.`}
          </h1>
          <p className="mt-5 max-w-[52ch] font-body text-[17px] leading-[28px] text-muted">
            {hasAny
              ? `You have ${data.listings.length} ${data.listings.length === 1 ? noun : `${noun}s`} on Archtivy. Performance figures appear here once there are a few more to compare.`
              : `Nothing is published yet. A ${noun} page takes about ten minutes and is permanent — it keeps earning long after you have moved on.`}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={addHref}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-[15px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none"
            >
              Add a {noun}
              <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
            </Link>
            {hasAny && (
              <Link
                href="/me/listings"
                className="rounded-full border border-ink/25 px-5 py-3 font-body text-[15px] text-ink transition-colors hover:bg-stone/50"
              >
                Manage listings
              </Link>
            )}
          </div>
        </section>

        {/* Fills the right side from the first screenful. A bordered panel
            rather than free-floating cards, so it reads as one companion block
            to the intro instead of three competing objects. */}
        <section aria-label="Getting started" className="lg:col-span-5">
          <div className="h-full rounded-2xl border border-hairline bg-white p-7">
            <h2 className="font-body text-[13px] uppercase tracking-[0.14em] text-muted">
              What happens next
            </h2>
            <ul className="mt-5 space-y-6">
              {prompts.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <Icon
                    strokeWidth={1.5}
                    className="mt-0.5 h-5 w-5 shrink-0 text-ink"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="font-body text-[15px] font-medium text-ink">{title}</h3>
                    <p className="mt-1.5 font-body text-[13px] leading-[21px] text-muted">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ── The few real listings, full width ─────────────────────────────── */}
      {hasAny && (
        <section aria-label={`Your ${noun}s`}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-hairline pt-6">
            <h2 className="font-body text-[13px] uppercase tracking-[0.14em] text-muted">
              {data.drafts.length > 0 ? "Drafts and published" : "Published"}
            </h2>
            <Link
              href="/me/listings"
              className="font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Manage all
            </Link>
          </div>
          {/* Four across at the widest, matching the rich grid — with one or
              two items the cards stay a sensible size instead of stretching to
              a third of the page each, which is what made two listings look
              like a half-finished row. */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ordered.map((l) => (
              <DashboardListingCard key={l.id} listing={l} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
