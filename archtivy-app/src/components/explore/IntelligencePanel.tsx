/**
 * IntelligencePanel — server component.
 *
 * Renders role-specific intelligence sections.
 *   designer → materials, momentum, categories, profiles
 *   brand    → cities, countries, momentum, profiles
 *   visitor  → cities, materials, live-signals summary, profiles
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { MetricRow } from "./MetricRow";
import type {
  ExploreIntelligenceData,
  GrowingCity,
  EmergingCountry,
  TrendingMaterial,
  ProductMomentum,
  ActiveCategory,
  ConnectedProfile,
  MarketSignal,
} from "@/lib/db/intelligence";

export type PanelRole = "designer" | "brand" | "visitor";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[4px] border border-zinc-100 bg-white p-4 sm:p-5">
      <h2
        className="mb-3 font-serif text-[13px] font-semibold text-zinc-900"
        style={{ letterSpacing: "-0.01em" }}
      >
        <span
          className="mr-2 text-[9px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "#002abf" }}
        >
          ●
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptySection() {
  return (
    <p className="px-3 py-4 text-[12px] text-zinc-400">
      No data yet — check back as the network grows.
    </p>
  );
}

// ─── City section ─────────────────────────────────────────────────────────────

function CitySection({ cities }: { cities: GrowingCity[] }) {
  if (cities.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {cities.map((c, i) => (
        <MetricRow
          key={`${c.city}-${i}`}
          rank={i + 1}
          name={c.city}
          subtext={c.country ?? undefined}
          count={c.current_count}
          countLabel="new"
          growthPct={c.is_new_entry ? undefined : c.growth_pct}
          isNewEntry={c.is_new_entry}
        />
      ))}
    </div>
  );
}

// ─── Country section ──────────────────────────────────────────────────────────

function CountrySection({ countries }: { countries: EmergingCountry[] }) {
  if (countries.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {countries.map((c, i) => (
        <MetricRow
          key={`${c.country}-${i}`}
          rank={i + 1}
          name={c.country}
          count={c.current_count}
          countLabel="new"
          growthPct={c.is_new_entry ? undefined : c.growth_pct}
          isNewEntry={c.is_new_entry}
        />
      ))}
    </div>
  );
}

// ─── Materials section ────────────────────────────────────────────────────────

function MaterialsSection({ materials }: { materials: TrendingMaterial[] }) {
  if (materials.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {materials.map((m, i) => (
        <MetricRow
          key={m.material_id}
          rank={i + 1}
          name={m.material_name}
          count={m.current_count}
          countLabel="uses"
          growthPct={m.is_new_entry ? undefined : m.growth_pct}
          isNewEntry={m.is_new_entry}
        />
      ))}
    </div>
  );
}

// ─── Products momentum section ────────────────────────────────────────────────

function MomentumSection({ products }: { products: ProductMomentum[] }) {
  if (products.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {products.map((p, i) => (
        <MetricRow
          key={p.product_id}
          rank={i + 1}
          name={p.product_title}
          count={p.current_count}
          countLabel="uses"
          growthPct={p.is_new_entry ? undefined : p.growth_pct}
          isNewEntry={p.is_new_entry}
          href={p.product_slug ? `/products/${p.product_slug}` : undefined}
        />
      ))}
    </div>
  );
}

// ─── Categories section ───────────────────────────────────────────────────────

function CategoriesSection({ categories }: { categories: ActiveCategory[] }) {
  if (categories.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {categories.map((c, i) => (
        <MetricRow
          key={`${c.category}-${c.listing_type}`}
          rank={i + 1}
          name={c.category}
          subtext={c.listing_type === "project" ? "Projects" : "Products"}
          count={c.current_count}
          countLabel="new"
          growthPct={c.is_new_entry ? undefined : c.growth_pct}
          isNewEntry={c.is_new_entry}
        />
      ))}
    </div>
  );
}

// ─── Profiles section ─────────────────────────────────────────────────────────

function ProfilesSection({ profiles }: { profiles: ConnectedProfile[] }) {
  if (profiles.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {profiles.map((p, i) => {
        const name = p.display_name ?? p.username ?? "Profile";
        const href = p.username ? `/u/${p.username}` : `/u/id/${p.profile_id}`;
        const initials = name.slice(0, 2).toUpperCase();

        return (
          <Link
            key={p.profile_id}
            href={href}
            className="group flex items-center gap-3 rounded-[4px] border border-transparent px-3 py-2 transition-colors hover:border-zinc-100 hover:bg-zinc-50/80"
          >
            {/* Rank */}
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-zinc-300">
              {i + 1}
            </span>

            {/* Avatar */}
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-500">
                  {initials}
                </span>
              )}
            </div>

            {/* Name + role */}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-zinc-800 group-hover:text-zinc-900">
                {name}
              </span>
              <span className="text-[11px] capitalize text-zinc-400">{p.role}</span>
            </div>

            {/* Connections count + 30d delta */}
            <div className="shrink-0 text-right">
              <span className="block text-[13px] font-semibold tabular-nums text-zinc-700">
                {p.connections_count.toLocaleString()}
              </span>
              {p.delta_30d > 0 && (
                <span className="text-[10px] tabular-nums text-emerald-600">
                  +{p.delta_30d} 30d
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Live signals summary (visitor only) ─────────────────────────────────────

const SIGNAL_COLOR: Record<string, string> = {
  new_project:  "text-blue-600",
  new_product:  "text-emerald-600",
  product_used: "text-amber-600",
  new_brand:    "text-violet-600",
  new_designer: "text-teal-600",
};

function SignalsSummary({ signals }: { signals: MarketSignal[] }) {
  if (signals.length === 0) return <EmptySection />;
  return (
    <div className="space-y-0.5">
      {signals.slice(0, 5).map((sig, i) => (
        <div
          key={`${sig.entity_id}-${i}`}
          className="flex items-start gap-2.5 rounded-[4px] border border-transparent px-3 py-2"
        >
          <span className="mt-0.5 w-5 shrink-0 text-right text-[11px] tabular-nums text-zinc-300">
            {i + 1}
          </span>
          <span
            className={
              "mt-0.5 shrink-0 text-[9px] font-semibold uppercase tracking-wider " +
              (SIGNAL_COLOR[sig.signal_type] ?? "text-zinc-500")
            }
          >
            {sig.signal_type.replace(/_/g, " ")}
          </span>
          <span className="min-w-0 truncate text-[12px] text-zinc-600">
            {sig.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Role-specific section layouts ───────────────────────────────────────────

function renderSections(
  data: ExploreIntelligenceData,
  role: PanelRole
): ReactNode {
  switch (role) {
    case "designer":
      return (
        <>
          <Section title="Trending Materials (7d)">
            <MaterialsSection materials={data.trendingMaterials} />
          </Section>
          <Section title="Products Gaining Momentum (30d)">
            <MomentumSection products={data.productsMomentum} />
          </Section>
          <Section title="Active Categories (30d)">
            <CategoriesSection categories={data.activeCategories} />
          </Section>
          <Section title="Most Connected Professionals">
            <ProfilesSection profiles={data.mostConnectedProfiles} />
          </Section>
        </>
      );

    case "brand":
      return (
        <>
          <Section title="Fastest Growing Cities (30d)">
            <CitySection cities={data.growingCities} />
          </Section>
          <Section title="Emerging Countries (30d)">
            <CountrySection countries={data.emergingCountries} />
          </Section>
          <Section title="Products Gaining Momentum (30d)">
            <MomentumSection products={data.productsMomentum} />
          </Section>
          <Section title="Most Connected Professionals">
            <ProfilesSection profiles={data.mostConnectedProfiles} />
          </Section>
        </>
      );

    default: // visitor
      return (
        <>
          <Section title="Fastest Growing Cities (30d)">
            <CitySection cities={data.growingCities} />
          </Section>
          <Section title="Trending Materials (7d)">
            <MaterialsSection materials={data.trendingMaterials} />
          </Section>
          <Section title="Live Signals">
            <SignalsSummary signals={data.liveSignals} />
          </Section>
          <Section title="Most Connected Professionals">
            <ProfilesSection profiles={data.mostConnectedProfiles} />
          </Section>
        </>
      );
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface IntelligencePanelProps {
  data: ExploreIntelligenceData;
  role: PanelRole;
}

export function IntelligencePanel({ data, role }: IntelligencePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {renderSections(data, role)}
    </div>
  );
}
