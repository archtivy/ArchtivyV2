import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * GET /api/explore/network?listingId=<uuid>&type=project|product
 *
 * Returns network data for a selected pin on the explore map:
 * - Team members (with usernames + avatar URLs)
 * - Products used in the project (or projects using the product)
 * - Other projects by the same architect
 * - Collaboration pairs
 * - Owner profile info
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const pinType = searchParams.get("type") as "project" | "product" | null;

  if (!listingId || !pinType) {
    return NextResponse.json({ error: "listingId and type are required" }, { status: 400 });
  }

  const sup = getSupabaseServiceClient();

  if (pinType === "project") {
    // Fetch team members, used products, owner info, other projects by owner in parallel
    const [teamRes, productsRes, listingRes] = await Promise.all([
      sup
        .from("listing_team_members")
        .select("profile_id, display_name, title, sort_order, profiles(username, avatar_url)")
        .eq("listing_id", listingId)
        .order("sort_order", { ascending: true })
        .limit(20),
      sup
        .from("project_product_links")
        .select("product_id")
        .eq("project_id", listingId)
        .limit(20),
      sup
        .from("listings")
        .select("owner_profile_id, brand_profile_id")
        .eq("id", listingId)
        .maybeSingle(),
    ]);

    // Process team members
    type TeamRow = {
      profile_id: string;
      display_name: string | null;
      title: string | null;
      profiles: { username: string | null; avatar_url: string | null } | { username: string | null; avatar_url: string | null }[] | null;
    };
    const teamRows = (teamRes.data ?? []) as unknown as TeamRow[];
    const teamMembers = teamRows.map((r) => {
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        profileId: r.profile_id,
        displayName: r.display_name,
        title: r.title,
        username: prof?.username ?? null,
        avatarUrl: prof?.avatar_url ?? null,
      };
    });

    // Fetch product details
    const productIds = (productsRes.data ?? []).map((r) => r.product_id).filter(Boolean);
    let usedProducts: { id: string; slug: string | null; title: string; coverUrl: string | null; brandName: string | null }[] = [];
    if (productIds.length > 0) {
      const { data: productRows } = await sup
        .from("listings")
        .select("id, slug, title, cover_image_url, profiles!listings_owner_profile_id_fkey(display_name)")
        .in("id", productIds)
        .eq("type", "product")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .limit(10);

      usedProducts = (productRows ?? []).map((p) => {
        const brand = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { display_name: string | null } | null;
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          coverUrl: p.cover_image_url,
          brandName: brand?.display_name ?? null,
        };
      });
    }

    // Fetch other projects by same architect
    const ownerProfileId = (listingRes.data as { owner_profile_id: string | null } | null)?.owner_profile_id ?? null;
    let architectProjects: { id: string; slug: string | null; title: string; coverUrl: string | null; year: string | null; city: string | null }[] = [];
    if (ownerProfileId) {
      const { data: archRows } = await sup
        .from("listings")
        .select("id, slug, title, cover_image_url, year, location_city")
        .eq("owner_profile_id", ownerProfileId)
        .eq("type", "project")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .neq("id", listingId)
        .order("created_at", { ascending: false })
        .limit(6);

      architectProjects = (archRows ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        coverUrl: p.cover_image_url,
        year: p.year,
        city: p.location_city,
      }));
    }

    // Collaboration pairs: find team members who co-appear on multiple projects
    const teamProfileIds = teamMembers.map((m) => m.profileId);
    let collaborationPairs: { nameA: string; nameB: string; count: number }[] = [];
    if (teamProfileIds.length >= 2) {
      const { data: collabRows } = await sup
        .from("listing_team_members")
        .select("profile_id, listing_id, display_name")
        .in("profile_id", teamProfileIds);

      if (collabRows) {
        type CRow = { profile_id: string; listing_id: string; display_name: string | null };
        const rows = collabRows as CRow[];
        const byListing: Record<string, CRow[]> = {};
        for (const r of rows) (byListing[r.listing_id] ||= []).push(r);

        const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
        const pairCounts: Record<string, { a: string; b: string; nameA: string; nameB: string; count: number }> = {};
        for (const members of Object.values(byListing)) {
          for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
              const key = pairKey(members[i].profile_id, members[j].profile_id);
              if (!pairCounts[key]) {
                pairCounts[key] = {
                  a: members[i].profile_id,
                  b: members[j].profile_id,
                  nameA: members[i].display_name ?? "Unknown",
                  nameB: members[j].display_name ?? "Unknown",
                  count: 0,
                };
              }
              pairCounts[key].count++;
            }
          }
        }
        collaborationPairs = Object.values(pairCounts)
          .filter((p) => p.count >= 2)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((p) => ({ nameA: p.nameA, nameB: p.nameB, count: p.count }));
      }
    }

    // Owner profile info
    let ownerProfile: { displayName: string | null; username: string | null; avatarUrl: string | null } | null = null;
    if (ownerProfileId) {
      const { data: ownerRow } = await sup
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", ownerProfileId)
        .maybeSingle();
      if (ownerRow) {
        ownerProfile = {
          displayName: ownerRow.display_name,
          username: ownerRow.username,
          avatarUrl: ownerRow.avatar_url,
        };
      }
    }

    return NextResponse.json({
      teamMembers,
      usedProducts,
      architectProjects,
      collaborationPairs,
      ownerProfile,
      ownerProfileId,
    });
  }

  if (pinType === "product") {
    // Fetch projects using this product + brand's other products
    const [projectLinksRes, listingRes] = await Promise.all([
      sup
        .from("project_product_links")
        .select("project_id")
        .eq("product_id", listingId)
        .limit(10),
      sup
        .from("listings")
        .select("brand_profile_id, owner_profile_id")
        .eq("id", listingId)
        .maybeSingle(),
    ]);

    const projectIds = (projectLinksRes.data ?? []).map((r) => r.project_id).filter(Boolean);
    let usedInProjects: { id: string; slug: string | null; title: string; coverUrl: string | null; ownerName: string | null }[] = [];
    if (projectIds.length > 0) {
      const { data: projRows } = await sup
        .from("listings")
        .select("id, slug, title, cover_image_url, profiles!listings_owner_profile_id_fkey(display_name)")
        .in("id", projectIds)
        .eq("type", "project")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .limit(8);

      usedInProjects = (projRows ?? []).map((p) => {
        const owner = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { display_name: string | null } | null;
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          coverUrl: p.cover_image_url,
          ownerName: owner?.display_name ?? null,
        };
      });
    }

    // Brand's other products
    const brandProfileId = (listingRes.data as { brand_profile_id: string | null } | null)?.brand_profile_id ?? null;
    let brandProducts: { id: string; slug: string | null; title: string; coverUrl: string | null }[] = [];
    let brandProfile: { displayName: string | null; username: string | null; avatarUrl: string | null } | null = null;
    if (brandProfileId) {
      const [brandProdsRes, brandProfRes] = await Promise.all([
        sup
          .from("listings")
          .select("id, slug, title, cover_image_url")
          .eq("brand_profile_id", brandProfileId)
          .eq("type", "product")
          .eq("status", "APPROVED")
          .is("deleted_at", null)
          .neq("id", listingId)
          .order("created_at", { ascending: false })
          .limit(6),
        sup
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", brandProfileId)
          .maybeSingle(),
      ]);

      brandProducts = (brandProdsRes.data ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        coverUrl: p.cover_image_url,
      }));

      if (brandProfRes.data) {
        brandProfile = {
          displayName: brandProfRes.data.display_name,
          username: brandProfRes.data.username,
          avatarUrl: brandProfRes.data.avatar_url,
        };
      }
    }

    return NextResponse.json({
      usedInProjects,
      brandProducts,
      brandProfile,
      brandProfileId,
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
