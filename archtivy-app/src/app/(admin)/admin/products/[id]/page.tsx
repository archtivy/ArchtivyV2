import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getListingUrl } from "@/lib/canonical";
import { duplicateProductAction } from "../actions";
import { approveListingFormActionVoid, updateProductAction } from "../../_actions/listings";
import { getProductListingBySlugOrId } from "@/lib/db/explore";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getMaterialsByProductIds, getProductMaterialOptions } from "@/lib/db/materials";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { AddProductForm, type ProductFormInitialData } from "@/app/(app)/add/product/AddProductForm";
import type { MemberTitleRow } from "@/app/(app)/add/project/TeamMembersField";

async function getProductColorOptions(productId: string): Promise<string[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("products").select("color_options").eq("id", productId).maybeSingle();
  const arr = (data as { color_options?: string[] | null } | null)?.color_options;
  return Array.isArray(arr) ? arr : [];
}

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

async function getActiveBrandMemberTitles(): Promise<MemberTitleRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("member_titles")
    .select("label, maps_to_role, sort_order")
    .eq("is_active", true)
    .eq("maps_to_role", "brand")
    .order("sort_order", { ascending: true });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[member_titles] brand fetch error:", error.message);
    }
    return [];
  }
  return (data ?? []) as MemberTitleRow[];
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const [productRow, teamResult, materialsMap, materialOptions, memberTitles, colorOptions] = await Promise.all([
    getProductListingBySlugOrId(id),
    getListingTeamMembersWithProfiles(id),
    getMaterialsByProductIds([id]),
    getProductMaterialOptions(),
    getActiveBrandMemberTitles(),
    getProductColorOptions(id),
  ]);

  if (!productRow || (productRow as { type?: string }).type !== "product") return notFound();

  const listing = productRow as {
    id: string;
    title: string | null;
    description: string | null;
    product_type: string | null;
    product_category: string | null;
    product_subcategory: string | null;
    dimensions: string | null;
    year: string | number | null;
    team_members: unknown;
  };

  const teamWithProfiles = teamResult.data ?? [];
  const materials = materialsMap[id] ?? [];
  const materialsList = materialOptions ?? [];
  const memberTitlesList = memberTitles;

  const initialData: ProductFormInitialData = {
    listingId: id,
    title: toText(listing.title),
    description: toText(listing.description),
    productType: toText(listing.product_type),
    productCategory: toText(listing.product_category),
    productSubcategory: toText(listing.product_subcategory),
    dimensions: toText(listing.dimensions),
    year: listing.year != null ? String(listing.year) : "",
    teamRows: teamWithProfiles.map((m) => ({
      name: (m.display_name ?? "").trim(),
      role: (m.title ?? "").trim(),
    })),
    materialIds: materials.map((m) => m.id),
    colorOptions: colorOptions ?? [],
  };

  const saved = toText(searchParams.saved) === "1";
  const errorMsg = toText(searchParams.error);
  const showError = Boolean(errorMsg);
  const showSuccess = saved && !showError;

  return (
    <AdminPage
      title={toText(listing.title) || "Product"}
      actions={
        <div className="flex items-center gap-2">
          {(productRow as { status?: string }).status === "PENDING" && (
            <form action={approveListingFormActionVoid}>
              <input type="hidden" name="_listingId" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Approve
              </button>
            </form>
          )}
          <Link
            href={getListingUrl({ id, type: "product" })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Preview
          </Link>
          <form action={duplicateProductAction}>
            <input type="hidden" name="_listingId" value={id} />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Duplicate
            </button>
          </form>
        </div>
      }
    >
      {showSuccess && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Changes saved. Updates are reflected on public pages.
        </div>
      )}
      {showError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Edit using the same form as user submission. Approve above if pending.
        </p>
      </div>
      <AddProductForm
        materials={materialsList}
        memberTitles={memberTitlesList}
        formMode="admin"
        initialData={initialData}
        updateAction={updateProductAction}
      />
    </AdminPage>
  );
}
