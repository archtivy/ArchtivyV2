/**
 * The Connect section's chain: Project → Designer → Product → Brand → also used in.
 *
 * ── NO CURATION, BY DESIGN ──────────────────────────────────────────────────
 * There is no featured flag, no settings table and no admin picker. The section
 * selects itself from the graph, so it can never point at something an editor
 * forgot to update, and it starts working the moment the data supports it.
 *
 * ── THE ELIGIBILITY BAR, AND WHY IT IS ≥3 ───────────────────────────────────
 * A chain is only worth rendering if every hop exists. The last hop — "also used
 * in" — is the scarce one: it needs a SECOND project sharing one of the same
 * products. Eligibility is therefore:
 *
 *   · live, APPROVED project with an owner profile   (the Designer hop)
 *   · at least THREE linked live products            (the Product/Brand hops)
 *   · at least one sibling project sharing a product (the "also used in" hop)
 *
 * Measured when written: 8 projects have any product link, 4 clear ≥3 products,
 * and 2 clear all three conditions — istanbul-house-2 (5 products, 2 siblings)
 * and fr-house (3, 2). A ≥2 bar would have admitted a third project, but that
 * third was a manual test row; the threshold is set on what makes a chain worth
 * looking at, not on which rows happen to exist this week, so it stays correct
 * whenever that row is cleaned up.
 *
 * ── ROTATION IS BY DAY, NOT BY random() ─────────────────────────────────────
 * `order by random()` would re-roll on every render — different output for two
 * users a second apart, a different answer between a server render and a
 * hydration pass, and no cache reuse. Indexing by day number keeps it stable
 * within a day, identical for everyone, cacheable for the full hour, and still
 * moving. With a pool of 2 that is a two-day cycle; it lengthens on its own as
 * more projects qualify.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";

export interface ConnectChainEntity {
  id: string;
  title: string;
  slug: string | null;
  imageUrl: string | null;
  subtitle: string | null;
}

export interface ConnectChain {
  project: ConnectChainEntity;
  designer: (ConnectChainEntity & { username: string | null }) | null;
  product: ConnectChainEntity;
  brand: (ConnectChainEntity & { username: string | null }) | null;
  /** Other live projects specifying the same product. */
  alsoUsedIn: ConnectChainEntity[];
  alsoUsedInCount: number;
}

const MIN_PRODUCTS = 3;

/** Days since epoch — the rotation index. Stable for a UTC day. */
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

async function fetchConnectChain(): Promise<ConnectChain | null> {
  try {
    const sup = getSupabaseServiceClient();

    const [listingsRes, linksRes] = await Promise.all([
      sup
        .from("listings")
        .select("id, type, slug, title, cover_image_url, location_text, owner_profile_id")
        .eq("status", "APPROVED")
        .is("deleted_at", null),
      sup.from("project_product_links").select("project_id, product_id"),
    ]);
    if (listingsRes.error || linksRes.error) {
      console.error(
        "[connectShowcase] query failed:",
        listingsRes.error?.message ?? linksRes.error?.message
      );
      return null;
    }

    type Row = {
      id: string;
      type: string;
      slug: string | null;
      title: string | null;
      cover_image_url: string | null;
      location_text: string | null;
      owner_profile_id: string | null;
    };
    const byId = new Map<string, Row>(((listingsRes.data ?? []) as Row[]).map((r) => [r.id, r]));

    // Only edges where both ends are live, so the chain cannot render a link to
    // something that 404s.
    const links = ((linksRes.data ?? []) as { project_id: string; product_id: string }[]).filter(
      (r) => byId.get(r.project_id)?.type === "project" && byId.get(r.product_id)?.type === "product"
    );

    const productsByProject = new Map<string, Set<string>>();
    const projectsByProduct = new Map<string, Set<string>>();
    const addTo = (map: Map<string, Set<string>>, key: string, value: string) => {
      const existing = map.get(key);
      if (existing) existing.add(value);
      else map.set(key, new Set([value]));
    };
    for (const { project_id, product_id } of links) {
      addTo(productsByProject, project_id, product_id);
      addTo(projectsByProduct, product_id, project_id);
    }

    // Eligible = enough products, an owner to name as the Designer, and at least
    // one product that another project also specifies.
    const eligible = [...productsByProject.entries()]
      .filter(([projectId, productIds]) => {
        if (productIds.size < MIN_PRODUCTS) return false;
        if (!byId.get(projectId)?.owner_profile_id) return false;
        return [...productIds].some((pid) => (projectsByProduct.get(pid)?.size ?? 0) > 1);
      })
      // Stable ordering before the rotation index is applied, so the cycle is
      // reproducible rather than dependent on map iteration order.
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));

    if (eligible.length === 0) return null;

    const [projectId, productIds] = eligible[dayIndex() % eligible.length];
    const projectRow = byId.get(projectId)!;

    // Feature the product with the richest onward hop — the most other projects
    // specifying it. That is the whole point of the last step.
    const featuredProductId = [...productIds]
      .filter((pid) => (projectsByProduct.get(pid)?.size ?? 0) > 1)
      .sort(
        (a, b) =>
          (projectsByProduct.get(b)?.size ?? 0) - (projectsByProduct.get(a)?.size ?? 0) ||
          a.localeCompare(b)
      )[0];
    const productRow = byId.get(featuredProductId)!;

    const siblingIds = [...(projectsByProduct.get(featuredProductId) ?? [])].filter(
      (id) => id !== projectId
    );

    const ownerIds = [projectRow.owner_profile_id, productRow.owner_profile_id].filter(
      (v): v is string => Boolean(v)
    );
    const { data: profileRows } = ownerIds.length
      ? await sup
          .from("profiles")
          .select("id, display_name, username, avatar_url, location_city, location_country")
          .in("id", ownerIds)
      : { data: [] };

    type Profile = {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      location_city: string | null;
      location_country: string | null;
    };
    const profiles = new Map<string, Profile>(
      ((profileRows ?? []) as Profile[]).map((p) => [p.id, p])
    );

    const asProfileEntity = (id: string | null) => {
      const p = id ? profiles.get(id) : undefined;
      if (!p) return null;
      const place = [p.location_city, p.location_country].filter(Boolean).join(", ");
      return {
        id: p.id,
        title: p.display_name ?? p.username ?? "Unnamed",
        slug: p.username,
        username: p.username,
        imageUrl: p.avatar_url,
        subtitle: place || null,
      };
    };

    const asListingEntity = (r: Row, subtitle: string | null): ConnectChainEntity => ({
      id: r.id,
      title: r.title ?? "Untitled",
      slug: r.slug,
      imageUrl: r.cover_image_url,
      subtitle,
    });

    return {
      project: asListingEntity(projectRow, projectRow.location_text),
      designer: asProfileEntity(projectRow.owner_profile_id),
      product: asListingEntity(
        productRow,
        profiles.get(productRow.owner_profile_id ?? "")?.display_name
          ? `by ${profiles.get(productRow.owner_profile_id!)!.display_name}`
          : null
      ),
      brand: asProfileEntity(productRow.owner_profile_id),
      // Cap the thumbnails; the count carries the rest.
      alsoUsedIn: siblingIds
        .slice(0, 4)
        .map((id) => byId.get(id))
        .filter((r): r is Row => Boolean(r))
        .map((r) => asListingEntity(r, r.location_text)),
      alsoUsedInCount: siblingIds.length,
    };
  } catch (err) {
    console.error("[connectShowcase] unexpected failure:", err);
    return null;
  }
}

export const getConnectChain = unstable_cache(fetchConnectChain, ["home:connect-chain:v1"], {
  tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles],
  revalidate: 3600,
});
