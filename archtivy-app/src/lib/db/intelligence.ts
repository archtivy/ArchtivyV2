/**
 * Architecture Network Intelligence — data layer.
 *
 * Calls all 7 Supabase RPCs in parallel with no cache.
 * Use only from force-dynamic pages (revalidate = 0).
 *
 * growth_pct from Postgres `numeric` may arrive as a string;
 * every numeric field is normalized via toN() before returning.
 */
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

// ─── Return types ─────────────────────────────────────────────────────────────

export interface GrowingCity {
  city: string;
  country: string | null;
  current_count: number;
  prev_count: number;
  growth_pct: number;
  is_new_entry: boolean;
}

export interface EmergingCountry {
  country: string;
  current_count: number;
  prev_count: number;
  growth_pct: number;
  is_new_entry: boolean;
}

export interface TrendingMaterial {
  material_id: string;
  material_name: string;
  current_count: number;
  prev_count: number;
  growth_pct: number;
  is_new_entry: boolean;
}

export interface ProductMomentum {
  product_id: string;
  product_title: string;
  product_slug: string | null;
  current_count: number;
  prev_count: number;
  growth_pct: number;
  is_new_entry: boolean;
}

export interface ActiveCategory {
  category: string;
  listing_type: string;
  current_count: number;
  prev_count: number;
  growth_pct: number;
  is_new_entry: boolean;
}

export interface ConnectedProfile {
  profile_id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
  connections_count: number;
  delta_30d: number;
}

export interface MarketSignal {
  signal_type: string;
  message: string;
  created_at: string;
  entity_id: string;
  entity_slug: string | null;
  entity_type: string;
}

export interface ExploreIntelligenceData {
  growingCities: GrowingCity[];
  emergingCountries: EmergingCountry[];
  trendingMaterials: TrendingMaterial[];
  productsMomentum: ProductMomentum[];
  activeCategories: ActiveCategory[];
  mostConnectedProfiles: ConnectedProfile[];
  liveSignals: MarketSignal[];
}

// ─── Normalisation helpers ────────────────────────────────────────────────────
// Postgres numeric and bigint can arrive as strings from the JS client.

function toN(v: unknown): number {
  if (v == null) return 0;
  const x = Number(v);
  return Number.isNaN(x) ? 0 : x;
}

function toS(v: unknown): string {
  return v != null ? String(v) : "";
}

function toNS(v: unknown): string | null {
  return v != null ? String(v) : null;
}

function toB(v: unknown): boolean {
  return Boolean(v);
}

// ─── Main fetch (no cache) ────────────────────────────────────────────────────

export async function getExploreIntelligence(): Promise<ExploreIntelligenceData> {
  const sup = getSupabaseServiceClient();

  const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
    sup.rpc("get_fastest_growing_cities_30d", { p_limit: 8 }),
    sup.rpc("get_emerging_countries_30d",     { p_limit: 8 }),
    sup.rpc("get_trending_materials_7d",      { p_limit: 8 }),
    sup.rpc("get_products_momentum_30d",      { p_limit: 8 }),
    sup.rpc("get_active_categories_30d",      { p_limit: 8 }),
    sup.rpc("get_most_connected_profiles",    { p_limit: 8 }),
    sup.rpc("get_live_market_signals",        { p_limit: 12 }),
  ]);

  if (r1.error) console.error("[intel] get_fastest_growing_cities_30d:", r1.error.message);
  if (r2.error) console.error("[intel] get_emerging_countries_30d:",     r2.error.message);
  if (r3.error) console.error("[intel] get_trending_materials_7d:",      r3.error.message);
  if (r4.error) console.error("[intel] get_products_momentum_30d:",      r4.error.message);
  if (r5.error) console.error("[intel] get_active_categories_30d:",      r5.error.message);
  if (r6.error) console.error("[intel] get_most_connected_profiles:",    r6.error.message);
  if (r7.error) console.error("[intel] get_live_market_signals:",        r7.error.message);

  const raw1 = (r1.data ?? []) as Record<string, unknown>[];
  const raw2 = (r2.data ?? []) as Record<string, unknown>[];
  const raw3 = (r3.data ?? []) as Record<string, unknown>[];
  const raw4 = (r4.data ?? []) as Record<string, unknown>[];
  const raw5 = (r5.data ?? []) as Record<string, unknown>[];
  const raw6 = (r6.data ?? []) as Record<string, unknown>[];
  const raw7 = (r7.data ?? []) as Record<string, unknown>[];

  return {
    growingCities: raw1.map((r) => ({
      city:          toS(r.city),
      country:       toNS(r.country),
      current_count: toN(r.current_count),
      prev_count:    toN(r.prev_count),
      growth_pct:    toN(r.growth_pct),
      is_new_entry:  toB(r.is_new_entry),
    })),

    emergingCountries: raw2.map((r) => ({
      country:       toS(r.country),
      current_count: toN(r.current_count),
      prev_count:    toN(r.prev_count),
      growth_pct:    toN(r.growth_pct),
      is_new_entry:  toB(r.is_new_entry),
    })),

    trendingMaterials: raw3.map((r) => ({
      material_id:   toS(r.material_id),
      material_name: toS(r.material_name),
      current_count: toN(r.current_count),
      prev_count:    toN(r.prev_count),
      growth_pct:    toN(r.growth_pct),
      is_new_entry:  toB(r.is_new_entry),
    })),

    productsMomentum: raw4.map((r) => ({
      product_id:    toS(r.product_id),
      product_title: toS(r.product_title),
      product_slug:  toNS(r.product_slug),
      current_count: toN(r.current_count),
      prev_count:    toN(r.prev_count),
      growth_pct:    toN(r.growth_pct),
      is_new_entry:  toB(r.is_new_entry),
    })),

    activeCategories: raw5.map((r) => ({
      category:      toS(r.category),
      listing_type:  toS(r.listing_type),
      current_count: toN(r.current_count),
      prev_count:    toN(r.prev_count),
      growth_pct:    toN(r.growth_pct),
      is_new_entry:  toB(r.is_new_entry),
    })),

    mostConnectedProfiles: raw6.map((r) => ({
      profile_id:        toS(r.profile_id),
      username:          toNS(r.username),
      display_name:      toNS(r.display_name),
      role:              toS(r.role),
      avatar_url:        toNS(r.avatar_url),
      connections_count: toN(r.connections_count),
      delta_30d:         toN(r.delta_30d),
    })),

    liveSignals: raw7.map((r) => ({
      signal_type: toS(r.signal_type),
      message:     toS(r.message),
      created_at:  toS(r.created_at),
      entity_id:   toS(r.entity_id),
      entity_slug: toNS(r.entity_slug),
      entity_type: toS(r.entity_type),
    })),
  };
}
