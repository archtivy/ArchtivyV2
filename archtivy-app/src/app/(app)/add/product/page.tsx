import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getTaxonomyTree } from "@/lib/taxonomy/taxonomyDb";
import {
  ProductWizard,
  type ProductTaxonomyOption,
  type ProductMaterialOption,
} from "./ProductWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a product | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /add/product — the product publish wizard.
 *
 * Server half loads reference data only; the write path stays in
 * createProductCanonical (create_product_with_sidecar RPC), unchanged.
 */

async function getCategories(): Promise<ProductTaxonomyOption[]> {
  const res = await getTaxonomyTree("product");
  return (res.data ?? [])
    .filter((n) => !n.slug_path.includes("/"))
    .map((n) => ({ id: n.id, label: n.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function getMaterials(): Promise<ProductMaterialOption[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.from("materials").select("id, name").order("name");
  if (error) {
    console.error("[add/product] materials failed:", error.message);
    return [];
  }
  return ((data ?? []) as { id: string; name: string }[]).map((m) => ({ id: m.id, label: m.name }));
}

export default async function AddProductPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/add/product");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data as {
    username?: string;
    display_name?: string | null;
    role?: string | null;
  } | null;
  if (!profile?.username) redirect("/onboarding");
  // Readers do not publish. Until now nothing on this route tested the role,
  // and createProductCanonical did not either — so a reader could reach this
  // wizard directly and publish a live product.
  if (profile.role === "reader") redirect("/me/settings");

  const [categories, materials] = await Promise.all([getCategories(), getMaterials()]);

  return (
    <ProductWizard
      categories={categories}
      materials={materials}
      // The brand is the submitting profile — there is nothing to choose, so it
      // is shown as confirmed context rather than asked for.
      brandName={profile.display_name?.trim() || profile.username || null}
    />
  );
}
