import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getTaxonomyTree } from "@/lib/taxonomy/taxonomyDb";
import {
  ProjectWizard,
  type TaxonomyOption,
  type MaterialOption,
  type ProductOption,
  type MemberTitleOption,
} from "./ProjectWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your work | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /add/project — the nine-step publish wizard (Build Brief §2).
 *
 * The server half only loads reference data. Everything else — validation,
 * slug, taxonomy, geo, team, materials, rollback — stays in the existing
 * createProject action, which the wizard posts the same FormData to. That was
 * the constraint: restructure the surface, not the write path.
 */

async function getCategories(): Promise<TaxonomyOption[]> {
  const res = await getTaxonomyTree("project");
  const nodes = res.data ?? [];
  return nodes
    .filter((n) => !n.slug_path.includes("/"))
    .map((n) => ({ id: n.id, label: n.label, slugPath: n.slug_path }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function getMaterials(): Promise<MaterialOption[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.from("materials").select("id, name").order("name");
  if (error) {
    console.error("[add/project] materials failed:", error.message);
    return [];
  }
  return ((data ?? []) as { id: string; name: string }[]).map((m) => ({ id: m.id, label: m.name }));
}

async function getProducts(): Promise<ProductOption[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, title, cover_image_url, owner_profile_id")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("title");
  if (error) {
    console.error("[add/project] products failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as {
    id: string;
    title: string;
    cover_image_url: string | null;
    owner_profile_id: string | null;
  }[];
  const ownerIds = [
    ...new Set(rows.map((r) => r.owner_profile_id).filter((v): v is string => Boolean(v))),
  ];
  const brands = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await sup.from("profiles").select("id, display_name").in("id", ownerIds);
    for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) brands.set(p.id, p.display_name);
    }
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    brand: r.owner_profile_id ? brands.get(r.owner_profile_id) ?? null : null,
    cover: r.cover_image_url,
  }));
}

async function getMemberTitles(): Promise<MemberTitleOption[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("member_titles")
    .select("label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return ((data ?? []) as { label: string }[]).map((t) => ({ label: t.label }));
}

export default async function AddProjectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/add/project");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");
  // Readers do not publish. createProjectCanonical already refuses them, but
  // only after the wizard has been filled in and submitted — this turns a
  // dead-end at the last step into never opening the form at all.
  if (profile.role === "reader") redirect("/me/settings");

  const [categories, materials, products, memberTitles] = await Promise.all([
    getCategories(),
    getMaterials(),
    getProducts(),
    getMemberTitles(),
  ]);

  return (
    <ProjectWizard
      categories={categories}
      materials={materials}
      products={products}
      memberTitles={memberTitles}
    />
  );
}
