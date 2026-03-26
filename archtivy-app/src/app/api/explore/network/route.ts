import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { batchResolveTaxonomySlugPaths } from "@/lib/taxonomy/resolve";

/**
 * GET /api/explore/network?listingId=<uuid>&type=project|product|brand|designer
 *
 * Returns network data for a selected pin on the explore map:
 * - project: Team members, used products, other projects by owner, collaboration pairs
 * - product: Projects using this product, brand's other products
 * - brand: Popular products by brand, related projects & designers
 * - designer: Designer's projects, related brands
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const pinType = searchParams.get("type") as "project" | "product" | "brand" | "designer" | null;

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

    // Enrich with taxonomy slug_paths
    const allProductIds2 = usedProducts.map((p) => p.id);
    const taxMap = allProductIds2.length > 0 ? await batchResolveTaxonomySlugPaths(allProductIds2) : new Map();
    for (const p of usedProducts) {
      (p as Record<string, unknown>).taxonomy_slug_path = taxMap.get(p.id) ?? null;
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

  if (pinType === "brand") {
    const profileId = listingId; // For brand pins, listingId is actually the profile ID

    // Fetch brand profile and all approved products in parallel
    const [brandProfRes, brandProductsRes] = await Promise.all([
      sup
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", profileId)
        .maybeSingle(),
      sup
        .from("listings")
        .select("id, slug, title, cover_image_url, category, views_count, created_at")
        .eq("owner_profile_id", profileId)
        .eq("type", "product")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .order("views_count", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

    if (!brandProfRes.data) {
      return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
    }

    const brandProfile = {
      displayName: brandProfRes.data.display_name,
      username: brandProfRes.data.username,
      avatarUrl: brandProfRes.data.avatar_url,
    };

    const allProducts = brandProductsRes.data ?? [];
    const totalProducts = allProducts.length;
    const allProductIds = allProducts.map((p) => p.id);

    // Get project usage counts for all brand products
    let productUsageCounts: Record<string, number> = {};
    let allRelatedProjectIds: string[] = [];
    if (allProductIds.length > 0) {
      const { data: linkRows } = await sup
        .from("project_product_links")
        .select("product_id, project_id")
        .in("product_id", allProductIds);

      if (linkRows) {
        for (const row of linkRows) {
          productUsageCounts[row.product_id] = (productUsageCounts[row.product_id] ?? 0) + 1;
        }
        const projectIdSet = new Set(linkRows.map((r) => r.project_id).filter(Boolean));
        allRelatedProjectIds = Array.from(projectIdSet);
      }
    }

    const usedInProjectsCount = allRelatedProjectIds.length;

    // Sort products by usage count DESC, then views DESC, then created_at DESC
    const sortedProducts = [...allProducts].sort((a, b) => {
      const usageA = productUsageCounts[a.id] ?? 0;
      const usageB = productUsageCounts[b.id] ?? 0;
      if (usageB !== usageA) return usageB - usageA;
      const viewsA = a.views_count ?? 0;
      const viewsB = b.views_count ?? 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const popularProducts = sortedProducts.slice(0, 8).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      coverUrl: p.cover_image_url,
      category: p.category,
      projectUsageCount: productUsageCounts[p.id] ?? 0,
    }));

    // Related project IDs (limit 20)
    const relatedProjectIds = allRelatedProjectIds.slice(0, 20);

    // Related designer IDs: owners of those projects
    let relatedDesignerIds: string[] = [];
    if (relatedProjectIds.length > 0) {
      const { data: projectRows } = await sup
        .from("listings")
        .select("owner_profile_id")
        .in("id", relatedProjectIds)
        .eq("type", "project")
        .eq("status", "APPROVED")
        .is("deleted_at", null);

      if (projectRows) {
        const designerSet = new Set(
          projectRows.map((r) => r.owner_profile_id).filter(Boolean) as string[]
        );
        relatedDesignerIds = Array.from(designerSet).slice(0, 10);
      }
    }

    // Enrich popular products with taxonomy slug_paths
    const popProductIds = popularProducts.map((p) => p.id);
    const popTaxMap = popProductIds.length > 0 ? await batchResolveTaxonomySlugPaths(popProductIds) : new Map();
    for (const p of popularProducts) {
      (p as Record<string, unknown>).taxonomy_slug_path = popTaxMap.get(p.id) ?? null;
    }

    return NextResponse.json({
      brandProfile,
      popularProducts,
      totalProducts,
      usedInProjectsCount,
      relatedProjectIds,
      relatedDesignerIds,
    });
  }

  if (pinType === "designer") {
    const profileId = listingId; // For designer pins, listingId is actually the profile ID

    // Fetch designer profile and their projects in parallel
    const [designerProfRes, projectsRes] = await Promise.all([
      sup
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", profileId)
        .maybeSingle(),
      sup
        .from("listings")
        .select("id, slug, title, cover_image_url, year, location_city")
        .eq("owner_profile_id", profileId)
        .eq("type", "project")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (!designerProfRes.data) {
      return NextResponse.json({ error: "Designer profile not found" }, { status: 404 });
    }

    const designerProfile = {
      displayName: designerProfRes.data.display_name,
      username: designerProfRes.data.username,
      avatarUrl: designerProfRes.data.avatar_url,
    };

    const projectRows = projectsRes.data ?? [];
    const designerProjects = projectRows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      coverUrl: p.cover_image_url,
      year: p.year,
      city: p.location_city,
    }));

    const relatedProjectIds = projectRows.map((p) => p.id);

    // Get total project count (may exceed the limit of 8)
    const { count: totalProjects } = await sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("owner_profile_id", profileId)
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null);

    // Get related brand IDs from products used in the designer's projects
    let relatedBrandIds: string[] = [];
    if (relatedProjectIds.length > 0) {
      const { data: productLinkRows } = await sup
        .from("project_product_links")
        .select("product_id")
        .in("project_id", relatedProjectIds);

      if (productLinkRows && productLinkRows.length > 0) {
        const productIds = [...new Set(productLinkRows.map((r) => r.product_id).filter(Boolean))];

        const { data: productRows } = await sup
          .from("listings")
          .select("owner_profile_id")
          .in("id", productIds)
          .eq("type", "product")
          .eq("status", "APPROVED")
          .is("deleted_at", null);

        if (productRows) {
          const brandSet = new Set(
            productRows.map((r) => r.owner_profile_id).filter(Boolean) as string[]
          );
          relatedBrandIds = Array.from(brandSet);
        }
      }
    }

    return NextResponse.json({
      designerProfile,
      designerProjects,
      totalProjects: totalProjects ?? projectRows.length,
      relatedBrandIds,
      relatedProjectIds,
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
