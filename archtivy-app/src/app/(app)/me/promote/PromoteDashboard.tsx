"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
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

interface ListingOption {
  id: string;
  title: string;
  type: "project" | "product";
  cover_image_url: string | null;
}

interface PromoteDashboardProps {
  listings: ListingOption[];
  campaigns: PromotionCampaign[];
}

const PLACEMENTS: PlacementType[] = ["homepage_feature", "map_spotlight"];
const DURATIONS: DurationDays[] = [7, 14, 30];

const DEMO_LISTING: ListingOption = {
  id: "demo-preview",
  title: "Example Project",
  type: "project",
  cover_image_url: null,
};

const DEMO_CAMPAIGNS: PromotionCampaign[] = [
  {
    id: "demo-campaign-1",
    user_id: "demo",
    profile_id: null,
    listing_id: "demo-preview",
    placement_type: "homepage_feature",
    duration_days: 14,
    price_cents: 8400,
    status: "active",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const R = 4; // border-radius token

// ─── Placement visual preview ────────────────────────────────────────────────

function HomepagePreview() {
  return (
    <div className="mt-3 overflow-hidden rounded border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50" style={{ borderRadius: R }}>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-300 dark:text-zinc-600">Homepage preview</p>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded bg-[#002abf]/10 dark:bg-[#002abf]/20" style={{ borderRadius: 2, aspectRatio: "4/3" }}>
          <div className="flex h-full items-center justify-center">
            <span className="text-[9px] font-medium text-[#002abf]/60">Your listing</span>
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="rounded bg-zinc-100 dark:bg-zinc-800" style={{ borderRadius: 2, aspectRatio: "4/3" }} />
        ))}
      </div>
    </div>
  );
}

function MapPreview() {
  return (
    <div className="mt-3 overflow-hidden rounded border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50" style={{ borderRadius: R }}>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-300 dark:text-zinc-600">Map preview</p>
      <div className="relative h-20 rounded bg-[#e8e8e8] dark:bg-zinc-800" style={{ borderRadius: 2 }}>
        {/* Faint grid lines */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Normal pins */}
        <div className="absolute left-[20%] top-[30%] h-2 w-2 rounded-full bg-zinc-400/50" />
        <div className="absolute left-[60%] top-[55%] h-2 w-2 rounded-full bg-zinc-400/50" />
        <div className="absolute left-[75%] top-[25%] h-2 w-2 rounded-full bg-zinc-400/50" />
        {/* Highlighted pin */}
        <div className="absolute left-[42%] top-[40%] -translate-x-1/2 -translate-y-1/2">
          <div className="h-5 w-5 rounded-full border-2 border-[#002abf] bg-[#002abf]/20" />
          <div className="absolute inset-0 animate-ping rounded-full bg-[#002abf]/10" />
        </div>
        <span className="absolute bottom-1.5 left-2 text-[9px] font-medium text-[#002abf]/60">Your pin</span>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function PromoteDashboard({ listings, campaigns }: PromoteDashboardProps) {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const showSuccess = searchParams.get("success") === "true";
  const showCancelled = searchParams.get("cancelled") === "true";

  const effectiveListings = isDemo ? [DEMO_LISTING] : listings;
  const effectiveCampaigns = isDemo ? DEMO_CAMPAIGNS : campaigns;

  const [selectedListing, setSelectedListing] = useState<string>(isDemo ? DEMO_LISTING.id : "");
  const [placement, setPlacement] = useState<PlacementType>("homepage_feature");
  const [duration, setDuration] = useState<DurationDays>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCheckout, setDemoCheckout] = useState(false);

  const price = getPrice(placement, duration);
  const selectedListingData = effectiveListings.find((l) => l.id === selectedListing);
  const placementLabel = PLACEMENT_LABELS[placement];

  async function handleCheckout() {
    if (!selectedListing) return;
    if (isDemo) { setDemoCheckout(true); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/promote/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: selectedListing, placement, duration }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); setLoading(false); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Failed to start checkout");
      setLoading(false);
    }
  }

  const activeCampaigns = effectiveCampaigns.filter((c) => c.status === "active");
  const pastCampaigns = effectiveCampaigns.filter((c) => c.status !== "active" && c.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
          Feature Your Listing
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Increase visibility and get discovered by designers, brands, and architecture professionals across Archtivy.
        </p>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" style={{ borderRadius: R }}>
          <strong>Demo preview</strong> — Using a mock listing. No real data will be created or charged.
        </div>
      )}

      {/* Demo checkout simulation */}
      {demoCheckout && (
        <div className="mb-6 rounded border border-zinc-200 bg-white px-5 py-6 dark:border-zinc-800 dark:bg-zinc-900" style={{ borderRadius: R }}>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Simulated checkout</p>
          <div className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p><span className="text-zinc-400">Listing:</span> {selectedListingData?.title}</p>
            <p><span className="text-zinc-400">Placement:</span> {placementLabel.title}</p>
            <p><span className="text-zinc-400">Duration:</span> {DURATION_LABELS[duration]}</p>
            <p><span className="text-zinc-400">Amount:</span> {formatCents(price)} USD</p>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setDemoCheckout(false)} className="rounded border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800" style={{ borderRadius: R }}>
              Back
            </button>
            <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" style={{ borderRadius: R }}>
              In production, this redirects to Stripe Checkout
            </div>
          </div>
        </div>
      )}

      {/* Success / Cancel */}
      {showSuccess && (
        <div className="mb-6 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" style={{ borderRadius: R }}>
          Payment successful. Your campaign will be activated shortly.
        </div>
      )}
      {showCancelled && (
        <div className="mb-6 rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400" style={{ borderRadius: R }}>
          Checkout was cancelled. No charge was made.
        </div>
      )}

      {/* Active campaigns */}
      {activeCampaigns.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Active campaigns</h2>
          <div className="space-y-2">
            {activeCampaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900" style={{ borderRadius: R }}>
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {PLACEMENT_LABELS[c.placement_type as PlacementType]?.title ?? c.placement_type}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{c.duration_days} days</span>
                </div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                  {c.ends_at ? `Ends ${new Date(c.ends_at).toLocaleDateString()}` : "Active"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Campaign builder ─────────────────────────────────────────────── */}
      {effectiveListings.length === 0 ? (
        <div className="rounded border border-zinc-200 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900" style={{ borderRadius: R }}>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You don&apos;t have any listings yet. Create a project or product first.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Step 1: Select listing */}
          <section>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              1. Select listing
            </h2>
            <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">Choose the project or product you want to feature.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {effectiveListings.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedListing(l.id)}
                  className={`flex items-center gap-3 rounded border px-3 py-2.5 text-left transition ${
                    selectedListing === l.id
                      ? "border-[#002abf] bg-[#002abf]/5 dark:border-[#002abf] dark:bg-[#002abf]/10"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                  style={{ borderRadius: R }}
                >
                  <span className="relative h-10 w-14 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800" style={{ borderRadius: 3 }}>
                    {l.cover_image_url ? (
                      <Image src={l.cover_image_url} alt="" fill className="object-cover" sizes="56px" unoptimized />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                        {l.type === "project" ? "P" : "Pr"}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{l.title}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {l.type === "project" ? "Project" : "Product"}
                      {isDemo && l.id === "demo-preview" && <span className="ml-1 text-amber-500">demo</span>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Listing preview card (shown when selected) */}
          {selectedListingData && (
            <div className="rounded border border-zinc-100 bg-zinc-50/60 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/60" style={{ borderRadius: R }}>
              <div className="flex items-center gap-4">
                <span className="relative h-16 w-24 shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-700" style={{ borderRadius: 3 }}>
                  {selectedListingData.cover_image_url ? (
                    <Image src={selectedListingData.cover_image_url} alt="" fill className="object-cover" sizes="96px" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">No image</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{selectedListingData.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {selectedListingData.type === "project" ? "Project" : "Product"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                This is how your listing will appear when featured.
              </p>
            </div>
          )}

          {/* Step 2: Choose placement */}
          <section>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              2. Choose placement
            </h2>
            <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">Where should your listing be featured?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLACEMENTS.map((p) => {
                const label = PLACEMENT_LABELS[p];
                const isSelected = placement === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPlacement(p)}
                    className={`rounded border text-left transition ${
                      isSelected
                        ? "border-[#002abf] bg-[#002abf]/5 dark:border-[#002abf] dark:bg-[#002abf]/10"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    }`}
                    style={{ borderRadius: R }}
                  >
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label.title}</p>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{getDailyRate(p)}<span className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> / day</span></p>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label.description}</p>
                      <ul className="mt-2 space-y-1">
                        {label.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                            <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Visual preview */}
                    <div className="px-2 pb-2">
                      {p === "homepage_feature" ? <HomepagePreview /> : <MapPreview />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 3: Choose duration */}
          <section>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              3. Choose duration
            </h2>
            <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">How long should your listing be featured?</p>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`relative flex-1 rounded border px-3 py-2.5 text-center transition ${
                    duration === d
                      ? "border-[#002abf] bg-[#002abf]/5 text-[#002abf] dark:border-[#002abf] dark:bg-[#002abf]/10"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
                  }`}
                  style={{ borderRadius: R }}
                >
                  {d === POPULAR_DURATION && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-2 py-0.5 text-[9px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Most popular</span>
                  )}
                  <span className="text-sm font-medium">{DURATION_LABELS[d]}</span>
                  <span className="mt-0.5 block text-xs opacity-60">{formatCents(getPrice(placement, d))}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Estimated visibility */}
          <div className="rounded border border-zinc-100 bg-zinc-50/60 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/60" style={{ borderRadius: R }}>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Up to <span className="font-medium text-zinc-900 dark:text-zinc-100">3x greater visibility</span> across the platform.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Placed in high-visibility discovery areas across Archtivy.
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              {["Featured on the homepage", "Highlighted on the map", "Shown in category discovery"].map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              Best for new listings that need initial visibility
            </p>
          </div>

          {/* Summary + Checkout */}
          <section className="rounded border border-zinc-200 bg-white px-5 py-5 dark:border-zinc-800 dark:bg-zinc-900" style={{ borderRadius: R }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {selectedListingData ? selectedListingData.title : "Select a listing"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  {placementLabel.title} &middot; {getDailyRate(placement)} / day &middot; {DURATION_LABELS[duration]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCents(price)}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Total</p>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={!selectedListing || loading}
              className="mt-4 w-full rounded bg-[#002abf] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#001d8a] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: R }}
            >
              {loading ? "Redirecting to checkout..." : isDemo ? "Preview checkout (demo)" : "Continue to payment"}
            </button>
            <p className="mt-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
              Secure payment via Stripe &middot; Your feature starts after payment is confirmed &middot; You can extend anytime
            </p>
          </section>
        </div>
      )}

      {/* Past campaigns */}
      {pastCampaigns.length > 0 && (
        <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Past campaigns</h2>
          <div className="space-y-1.5">
            {pastCampaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">
                <span>
                  {PLACEMENT_LABELS[c.placement_type as PlacementType]?.title ?? c.placement_type}
                  {" "}&middot; {c.duration_days}d &middot; {formatCents(c.price_cents)}
                </span>
                <span className="capitalize">{c.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
