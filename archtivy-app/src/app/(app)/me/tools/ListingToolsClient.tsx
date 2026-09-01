"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import {
  getPrice,
  getDailyRate,
  formatCents,
  PLACEMENT_LABELS,
  DURATION_LABELS,
  POPULAR_DURATION,
  type PlacementType,
  type DurationDays,
} from "@/lib/promote/config";
import type { PromotionCampaign } from "@/lib/promote/campaigns";

/**
 * Listing Tools — the promotion flow, restyled onto the workspace.
 *
 * ── THIS IS THE EXISTING SYSTEM, NOT A NEW ONE ──────────────────────────────
 * Placements, durations and every price come from lib/promote/config; the
 * campaign list is real `promotion_campaigns` rows; checkout POSTs to the same
 * /api/promote/checkout that already existed. Nothing about billing moved to
 * the client: the route re-derives the price with getPrice() from the placement
 * and duration it validates against its own allow-lists, so a tampered request
 * body cannot buy a 30-day homepage feature for the price of nothing. This
 * component sends three identifiers and receives a Stripe URL.
 *
 * There is no second promotion architecture, no mock impression estimate and no
 * disabled "coming soon" CTA — those would sit beside a live paid flow and
 * compete with it. When the feature flag is off, the server renders the
 * unavailable state instead of this component.
 *
 * ── THE FLOW IS THE REFERENCE'S, THE PRODUCTS ARE ARCHTIVY'S ────────────────
 * Choose listing → choose promotion → duration → price → checkout, one visible
 * step at a time. The mockup's "goal", "audience", "budget slider" and
 * "estimated results" are not built: Archtivy sells two fixed placements at a
 * fixed daily rate, with no targeting and no impression forecasting behind it.
 * Drawing those controls would promise delivery we cannot perform.
 */

interface ListingOption {
  id: string;
  title: string;
  type: "project" | "product";
  cover_image_url: string | null;
}

const PLACEMENTS: PlacementType[] = ["homepage_feature", "map_spotlight"];
const DURATIONS: DurationDays[] = [7, 14, 30];

export function ListingToolsClient({
  listings,
  campaigns,
}: {
  listings: ListingOption[];
  campaigns: PromotionCampaign[];
}) {
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("success") === "true";
  const showCancelled = searchParams.get("cancelled") === "true";

  // Deep link from a listing's ••• menu: /me/tools?listing=<id>. Validated
  // against the owner's OWN eligible listings, so a pasted id for someone
  // else's work selects nothing rather than preselecting it.
  const requested = searchParams.get("listing");
  const preselected = listings.some((l) => l.id === requested) ? requested : null;

  const [tab, setTab] = useState<"promote" | "campaigns">("promote");
  const [selectedListing, setSelectedListing] = useState<string>(preselected ?? "");
  const [placement, setPlacement] = useState<PlacementType>("homepage_feature");
  const [duration, setDuration] = useState<DurationDays>(POPULAR_DURATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = getPrice(placement, duration);
  const selected = listings.find((l) => l.id === selectedListing) ?? null;

  async function handleCheckout() {
    if (!selectedListing) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/promote/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing, placement, duration }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
      else {
        setError("Checkout could not be started");
        setLoading(false);
      }
    } catch {
      setError("Failed to start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">
        Listing Tools
      </h1>
      <p className="mt-2 font-body text-[15px] text-muted">
        Get your work in front of more architects, designers, and brands.
      </p>

      {showSuccess && (
        <Banner tone="ok">
          Payment received. Your promotion goes live as soon as it is confirmed — it will appear
          under Campaigns.
        </Banner>
      )}
      {showCancelled && <Banner tone="muted">Checkout cancelled. Nothing was charged.</Banner>}

      <div className="mt-6 flex gap-5 border-b border-hairline">
        {(
          [
            ["promote", "Promotions"],
            ["campaigns", `Campaigns${campaigns.length > 0 ? ` (${campaigns.length})` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "true" : undefined}
            className={[
              "-mb-px border-b-2 pb-2.5 font-body text-[14px] transition-colors",
              tab === key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "promote" ? (
        listings.length === 0 ? (
          <EmptyState
            title="Nothing to promote yet"
            body="Publish a project or product first — promotions send people to a live listing."
            action={{ href: "/me/listings", label: "Go to your listings" }}
          />
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-6">
              <Step n={1} title="Choose a listing">
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {listings.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedListing(l.id)}
                        aria-pressed={selectedListing === l.id}
                        className={[
                          "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                          selectedListing === l.id
                            ? "border-ink bg-stone/25"
                            : "border-hairline hover:border-ink/25",
                        ].join(" ")}
                      >
                        <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded bg-stone/40">
                          {l.cover_image_url && (
                            <Image
                              src={l.cover_image_url}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                              unoptimized
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-body text-[13px] text-ink">
                            {l.title}
                          </span>
                          <span className="block font-body text-[11px] uppercase tracking-[0.1em] text-muted">
                            {l.type}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Step>

              <Step n={2} title="Choose a promotion">
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {PLACEMENTS.map((p) => {
                    const label = PLACEMENT_LABELS[p];
                    return (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={() => setPlacement(p)}
                          aria-pressed={placement === p}
                          className={[
                            "h-full w-full rounded-lg border p-4 text-left transition-colors",
                            placement === p
                              ? "border-ink bg-stone/25"
                              : "border-hairline hover:border-ink/25",
                          ].join(" ")}
                        >
                          <span className="block font-body text-[14px] text-ink">{label.title}</span>
                          <span className="mt-1 block font-body text-[12px] leading-[17px] text-muted">
                            {label.description}
                          </span>
                          <span className="mt-2.5 block font-body text-[12px] text-ink">
                            {getDailyRate(p)} / day
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Step>

              <Step n={3} title="Choose a duration">
                <div className="flex flex-wrap gap-2.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      aria-pressed={duration === d}
                      className={[
                        "rounded-lg border px-4 py-2.5 font-body text-[13px] transition-colors",
                        duration === d
                          ? "border-ink bg-stone/25 text-ink"
                          : "border-hairline text-muted hover:border-ink/25 hover:text-ink",
                      ].join(" ")}
                    >
                      {DURATION_LABELS[d]}
                      {d === POPULAR_DURATION && (
                        <span className="ml-2 font-body text-[11px] text-muted">Most chosen</span>
                      )}
                    </button>
                  ))}
                </div>
              </Step>
            </div>

            {/* ── SUMMARY ────────────────────────────────────────────────
                The price shown is getPrice(placement, duration) — the exact
                function the checkout route calls again server-side before
                creating the Stripe session. One pricing definition. */}
            <aside className="rounded-xl border border-hairline bg-white p-5 lg:sticky lg:top-[92px]">
              <h2 className="font-display text-[17px] leading-none tracking-tight text-ink">
                Summary
              </h2>
              <dl className="mt-4 space-y-2.5 border-b border-hairline pb-4">
                <SummaryRow label="Listing" value={selected?.title ?? "Not selected"} />
                <SummaryRow label="Promotion" value={PLACEMENT_LABELS[placement].title} />
                <SummaryRow label="Duration" value={DURATION_LABELS[duration]} />
                <SummaryRow label="Daily rate" value={`${getDailyRate(placement)} / day`} />
              </dl>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-body text-[13px] text-muted">Total</span>
                <span className="font-display text-[24px] leading-none tracking-tight text-ink">
                  {formatCents(price)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!selectedListing || loading}
                className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 font-body text-[13px] text-cream transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" aria-hidden />}
                {loading ? "Redirecting to checkout…" : "Continue to payment"}
              </button>
              {!selectedListing && (
                <p className="mt-2 text-center font-body text-[12px] text-muted">
                  Choose a listing to continue.
                </p>
              )}
              {error && (
                <p role="alert" className="mt-2 text-center font-body text-[12px] text-red-600">
                  {error}
                </p>
              )}
              <p className="mt-3 text-center font-body text-[11px] leading-[16px] text-muted">
                Secure payment through Stripe. Your promotion starts once payment is confirmed.
              </p>
            </aside>
          </div>
        )
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          body="Your active and past promotions will appear here."
        />
      ) : (
        <ul className="mt-6 space-y-2.5">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-hairline bg-white px-4 py-3.5"
            >
              <span className="min-w-0 flex-1 font-body text-[14px] text-ink">
                {PLACEMENT_LABELS[c.placement_type]?.title ?? c.placement_type}
              </span>
              <span className="font-body text-[13px] text-muted">
                {DURATION_LABELS[c.duration_days as DurationDays] ?? `${c.duration_days} days`}
              </span>
              <span className="font-body text-[13px] text-muted">{formatCents(c.price_cents)}</span>
              <CampaignStatus status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The four statuses `promotion_campaigns.status` actually holds. */
function CampaignStatus({ status }: { status: PromotionCampaign["status"] }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "bg-amber-50 text-amber-700"
        : "bg-stone/50 text-muted";
  return (
    <span className={`rounded px-2 py-0.5 font-body text-[11px] capitalize ${tone}`}>{status}</span>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline bg-white p-5">
      <h2 className="flex items-center gap-2.5 font-display text-[17px] leading-none tracking-tight text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone/40 font-body text-[12px] text-ink">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 font-body text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-body text-[13px] text-ink">{value}</dd>
    </div>
  );
}

function Banner({ tone, children }: { tone: "ok" | "muted"; children: React.ReactNode }) {
  return (
    <div
      className={[
        "mt-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 font-body text-[13px]",
        tone === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-hairline bg-stone/25 text-muted",
      ].join(" ")}
    >
      {tone === "ok" && <Check strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mt-6 rounded-xl border border-hairline bg-white px-6 py-16 text-center">
      <p className="font-display text-[20px] leading-none tracking-tight text-ink">{title}</p>
      <p className="mx-auto mt-2.5 max-w-[380px] font-body text-[14px] leading-[20px] text-muted">
        {body}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-ink px-5 font-body text-[13px] text-cream transition-colors hover:bg-ink/90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
