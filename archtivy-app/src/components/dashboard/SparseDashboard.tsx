import Link from "next/link";
import { ArrowRight, FileText, Layers, Users } from "lucide-react";
import { DashboardListingCard } from "@/components/dashboard/DashboardListingCard";
import type { DashboardData } from "@/lib/db/dashboard";

/**
 * The dashboard as it looks for an account with little or nothing published.
 *
 * ── THIS IS THE PRIMARY LAYOUT, NOT A FALLBACK ──────────────────────────────
 * Of 49 brands, 15 have any products at all; the median brand that has any has
 * four. So most accounts land here, and it cannot be the rich grid with smaller
 * numbers in it — a four-up stat rail reading 0 · 0 · 0 · 0 above an empty
 * shelf reads as a broken page rather than a new one.
 *
 * Instead: no stat rail (there is nothing to report), one clear next action,
 * and the few real listings shown at a size that suits a handful rather than a
 * catalogue. Stats appear once there is something to measure — the rich layout
 * takes over at three published listings.
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
      body: "Spec sheets and care guides are the reason a designer returns to a product page. Downloads are tracked so you can see which ones earn their place.",
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

  return (
    <div className="space-y-12">
      {/* ── Opening: states the position plainly, then the one action ────── */}
      <section>
        <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
          {displayName}
        </p>
        <h1 className="mt-2 max-w-[20ch] font-display text-[38px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[46px]">
          {hasAny ? "Your work so far." : `Publish your first ${noun}.`}
        </h1>
        <p className="mt-4 max-w-[52ch] font-body text-[16px] leading-[26px] text-muted">
          {hasAny
            ? `You have ${data.listings.length} ${data.listings.length === 1 ? noun : `${noun}s`} on Archtivy. Performance figures appear here once there are a few more to compare.`
            : `Nothing is published yet. A ${noun} page takes about ten minutes and is permanent — it keeps earning long after you have moved on.`}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
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

      {/* ── The few real listings, if any ─────────────────────────────────── */}
      {hasAny && (
        <section aria-label={`Your ${noun}s`}>
          <h2 className="mb-4 font-body text-[13px] uppercase tracking-[0.14em] text-muted">
            {data.drafts.length > 0 ? "Drafts and published" : "Published"}
          </h2>
          {/* Deliberately capped at three columns, not four: a two-item row in
              a four-column grid leaves half the shelf visibly empty. */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...data.drafts, ...data.published].map((l) => (
              <DashboardListingCard key={l.id} listing={l} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Soft prompts: what this place does, once you use it ───────────── */}
      <section aria-label="Getting started">
        <h2 className="mb-4 font-body text-[13px] uppercase tracking-[0.14em] text-muted">
          What happens next
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {prompts.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-2xl border border-hairline bg-white p-6"
            >
              <Icon strokeWidth={1.5} className="h-5 w-5 text-ink" aria-hidden />
              <h3 className="mt-4 font-body text-[15px] font-medium text-ink">
                {title}
              </h3>
              <p className="mt-2 font-body text-[13px] leading-[21px] text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
