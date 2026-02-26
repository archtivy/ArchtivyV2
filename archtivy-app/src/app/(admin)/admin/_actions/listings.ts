"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { createAuditLog } from "@/lib/db/audit";
import { uploadGalleryImagesServer } from "@/lib/storage/gallery";
import { uploadListingDocumentsServer } from "@/lib/storage/documents";
import { persistListingDocuments } from "@/lib/db/listingDocumentsWrite";
import { addDocuments } from "@/lib/db/listingDocuments";
import { setProjectMaterials, setProductMaterials } from "@/lib/db/materials";
import type { TeamMember, BrandUsed } from "@/lib/types/listings";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistListingTeamMembers } from "@/app/actions/createProject";
import { processProjectImages, processProductImages } from "@/lib/matches/pipeline";
import { computeAndUpsertMatchesForProject, computeAndUpsertAllMatches } from "@/lib/matches/engine";

const MIN_GALLERY_IMAGES = 3;

function toNullableText(v: unknown): string | null {
  const s = v == null ? "" : String(v).trim();
  return s.length ? s : null;
}

/** Human-readable URL slug from title: lowercase, dash-separated, URL-safe (a-z0-9 and - only). */
function slugFromTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "project";
}

async function ensureUniqueSlug(supabase: SupabaseClient, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await supabase.from("listings").select("id").eq("slug", slug).limit(1).maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${++n}`;
  }
}

function getImageFiles(formData: FormData): File[] {
  const raw = formData.getAll("images");
  return raw.filter((f): f is File => f instanceof File && f.size > 0);
}

function getDocumentFiles(formData: FormData): File[] {
  const raw = formData.getAll("documents");
  return raw.filter((f): f is File => f instanceof File && f.size > 0);
}

function parseTeamMembers(value: FormDataEntryValue | null): TeamMember[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is TeamMember =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as TeamMember).name === "string" &&
        typeof (x as TeamMember).role === "string"
    );
  } catch {
    return [];
  }
}

function parseBrandsUsed(value: FormDataEntryValue | null): BrandUsed[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is BrandUsed =>
        typeof x === "object" && x !== null && typeof (x as BrandUsed).name === "string"
    );
  } catch {
    return [];
  }
}

function parseMaterialIds(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    return [];
  }
}

function parseColorOptions(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

type MentionedProductEntry = { brand_name_text: string; product_name_text: string };

function parseMentionedProducts(value: FormDataEntryValue | null): MentionedProductEntry[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is MentionedProductEntry =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as MentionedProductEntry).brand_name_text === "string" &&
        typeof (x as MentionedProductEntry).product_name_text === "string"
    );
  } catch {
    return [];
  }
}

export type AdminCreateResult = { error?: string };

export async function createAdminProjectFull(
  _prev: AdminCreateResult | null,
  formData: FormData
): Promise<AdminCreateResult> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { error: admin.error };

  const ownerProfileId = (formData.get("owner_profile_id") as string)?.trim();
  if (!ownerProfileId) return { error: "Owner profile is required." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const location = (formData.get("location") as string)?.trim() ?? null;
  const location_text = (formData.get("location_text") as string)?.trim() || location || null;
  const location_city = (formData.get("location_city") as string)?.trim() || null;
  const location_country = (formData.get("location_country") as string)?.trim() || null;
  const location_place_name = (formData.get("location_place_name") as string)?.trim() || null;
  const location_latRaw = formData.get("location_lat");
  const location_lngRaw = formData.get("location_lng");
  const location_lat =
    location_latRaw != null && String(location_latRaw).trim() !== ""
      ? Number(String(location_latRaw).trim())
      : null;
  const location_lng =
    location_lngRaw != null && String(location_lngRaw).trim() !== ""
      ? Number(String(location_lngRaw).trim())
      : null;
  const category = (formData.get("category") as string)?.trim() ?? null;
  const areaSqftRaw = formData.get("area_sqft");
  const area_sqft =
    areaSqftRaw !== null && areaSqftRaw !== ""
      ? Number(String(areaSqftRaw).trim())
      : null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const material_or_finish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const team_members = parseTeamMembers(formData.get("team_members"));
  const material_ids = parseMaterialIds(formData.get("project_material_ids"));
  const mentioned_products = parseMentionedProducts(formData.get("mentioned_products"));

  if (!title) return { error: "Title is required." };
  if (!description?.trim()) return { error: "Description is required." };
  if (!location?.trim()) return { error: "Project location is required." };
  if (!category?.trim()) return { error: "Project category is required." };
  if (!year?.trim()) return { error: "Year is required." };

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length < MIN_GALLERY_IMAGES) {
    return { error: `At least ${MIN_GALLERY_IMAGES} gallery images are required.` };
  }

  const supabase = getSupabaseServiceClient();
  const baseSlug = slugFromTitle(title || "project");
  const slug = await ensureUniqueSlug(supabase, baseSlug);
  if (!slug || !String(slug).trim()) {
    return { error: "Unable to generate a valid slug for the project." };
  }

  const areaSqftValue =
    area_sqft != null && !Number.isNaN(area_sqft) && area_sqft > 0 ? area_sqft : null;
  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      type: "project",
      listing_type: "project",
      status: "APPROVED",
      title,
      description: description || null,
      slug,
      category: category || null,
      year: year || null,
      area_sqft: areaSqftValue,
      location: location_text,
      location_text: location_text,
      location_city: location_city || null,
      location_country: location_country || null,
      location_place_id: null,
      location_lat: location_lat != null && !Number.isNaN(location_lat) ? location_lat : null,
      location_lng: location_lng != null && !Number.isNaN(location_lng) ? location_lng : null,
      material_or_finish: material_or_finish || null,
      team_members,
      brands_used: [],
      mentioned_products: mentioned_products.length > 0 ? mentioned_products : [],
      owner_clerk_user_id: null,
      owner_profile_id: ownerProfileId,
      cover_image_url: null,
    })
    .select("id")
    .maybeSingle();

  if (insertError) return { error: insertError.message };
  if (!listing?.id) return { error: "Failed to create project." };
  const listingId = listing.id as string;
  const { data: check } = await supabase.from("listings").select("type").eq("id", listingId).maybeSingle();
  if (!check?.type) return { error: "Listing created but type is missing (data integrity)." };

  if (team_members.length > 0) {
    try {
      await persistListingTeamMembers(supabase, listingId, team_members);
    } catch (err) {
      await supabase.from("listings").delete().eq("id", listingId);
      return {
        error: err instanceof Error ? err.message : "Failed to save team members.",
      };
    }
  }

  const uploadResult = await uploadGalleryImagesServer(listingId, imageFiles);
  if (uploadResult.error || !uploadResult.data?.length) {
    await supabase.from("listings").delete().eq("id", listingId);
    return { error: uploadResult.error ?? "Image upload failed." };
  }
  const imageUrls = uploadResult.data;
  const coverImageUrl = imageUrls[0];
  const imageRows = imageUrls.map((image_url, i) => ({
    listing_id: listingId,
    image_url,
    alt: null as string | null,
    sort_order: i,
  }));
  const { error: imagesInsertError } = await supabase.from("listing_images").insert(imageRows);
  if (imagesInsertError) {
    await supabase.from("listings").delete().eq("id", listingId);
    return { error: `Failed to save gallery: ${imagesInsertError.message}` };
  }
  await supabase.from("listings").update({ cover_image_url: coverImageUrl }).eq("id", listingId);

  try {
    const pipelineResult = await processProjectImages(listingId);
    console.log("[admin createProject] image_ai pipeline: image_ai rows upserted =", pipelineResult.processed, "errors =", pipelineResult.errors.length);
    if (pipelineResult.errors.length > 0) {
      console.warn("[admin createProject] image_ai pipeline errors:", pipelineResult.errors);
    }
    const { upserted, errors: matchErrors } = await computeAndUpsertMatchesForProject(listingId);
    console.log("[admin createProject] matches upserted =", upserted, "match errors =", matchErrors.length);
    if (matchErrors.length > 0) {
      console.warn("[admin createProject] matches upsert errors:", matchErrors);
    }
  } catch (e) {
    console.warn("[admin createProject] matches pipeline non-fatal:", e);
  }

  const docFiles = getDocumentFiles(formData);
  if (docFiles.length > 0) {
    const docUpload = await uploadListingDocumentsServer(listingId, docFiles);
    if (docUpload.error || !docUpload.data?.length) {
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Document upload failed: ${docUpload.error ?? "no files returned"}` };
    }
    const insert = await addDocuments(
      listingId,
      docUpload.data.map((d) => ({
        file_url: d.url,
        file_name: d.fileName,
        file_type: d.fileType,
        storage_path: d.storagePath,
      }))
    );
    if (insert.error) {
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Document DB insert failed: ${insert.error}` };
    }
  }

  if (material_ids.length >= 0) {
    const { error: materialErr } = await setProjectMaterials(listingId, material_ids);
    if (materialErr) return { error: `Failed to save materials: ${materialErr}` };
  }

  if (admin.ok) {
    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.create",
      entityType: "listing",
      entityId: listingId,
      metadata: { type: "project" },
    });
  }
  revalidatePath("/");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  redirect(`/admin/projects/${listingId}`);
}

export async function createAdminProductFull(
  _prev: AdminCreateResult | null,
  formData: FormData
): Promise<AdminCreateResult> {
  const docFiles = getDocumentFiles(formData);

  const admin = await ensureAdmin();
  if (!admin.ok) return { error: admin.error };

  const ownerProfileId = (formData.get("owner_profile_id") as string)?.trim();
  if (!ownerProfileId) return { error: "Owner profile is required." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const product_type = (formData.get("product_type") as string)?.trim() ?? null;
  const product_category = (formData.get("product_category") as string)?.trim() ?? null;
  const product_subcategory = (formData.get("product_subcategory") as string)?.trim() ?? null;
  const material_or_finish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const dimensions = (formData.get("dimensions") as string)?.trim() ?? null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const team_members = parseTeamMembers(formData.get("team_members"));
  const material_ids = parseMaterialIds(formData.get("product_material_ids"));
  const color_options = parseColorOptions(formData.get("color_options"));

  if (!title) return { error: "Product title is required." };
  if (!description?.trim()) return { error: "Product description is required." };
  if (!product_type?.trim()) return { error: "Product type is required." };
  if (!product_subcategory?.trim()) return { error: "Product subcategory is required." };

  const descWords = (description ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (descWords < 200) return { error: "Description must be at least 200 words." };

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length < MIN_GALLERY_IMAGES) {
    return { error: `At least ${MIN_GALLERY_IMAGES} gallery images are required.` };
  }

  const supabase = getSupabaseServiceClient();
  const baseSlug = slugFromTitle(title || "product");
  const slug = await ensureUniqueSlug(supabase, baseSlug);

  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      type: "product",
      listing_type: "product",
      status: "APPROVED",
      title,
      description: description || null,
      slug,
      product_type: product_type || null,
      product_category: product_category || null,
      product_subcategory: product_subcategory || null,
      material_or_finish: material_or_finish || null,
      dimensions: dimensions || null,
      year: year || null,
      team_members,
      location: null,
      category: null,
      area_sqft: null,
      brands_used: [],
      owner_clerk_user_id: null,
      owner_profile_id: ownerProfileId,
      cover_image_url: null,
    })
    .select("id")
    .maybeSingle();

  if (insertError) return { error: insertError.message };
  if (!listing?.id) return { error: "Failed to create product." };
  const listingId = listing.id as string;
  console.log("[product taxonomy]", { listingId, product_type: product_type, product_category: product_category, product_subcategory: product_subcategory });
  const { data: check } = await supabase.from("listings").select("type").eq("id", listingId).maybeSingle();
  if (!check?.type) return { error: "Listing created but type is missing (data integrity)." };

  const { error: productRowError } = await supabase.from("products").insert({
    id: listingId,
    slug,
    title,
    subtitle: description?.trim() || null,
    color_options: [],
  });
  if (productRowError) {
    await supabase.from("listings").delete().eq("id", listingId);
    return { error: `Failed to create product record: ${productRowError.message}` };
  }

  if (team_members.length > 0) {
    try {
      await persistListingTeamMembers(supabase, listingId, team_members);
    } catch (err) {
      await supabase.from("listings").delete().eq("id", listingId);
      return {
        error: err instanceof Error ? err.message : "Failed to save team members.",
      };
    }
  }

  const uploadResult = await uploadGalleryImagesServer(listingId, imageFiles);
  if (uploadResult.error || !uploadResult.data?.length) {
    await supabase.from("listings").delete().eq("id", listingId);
    return { error: uploadResult.error ?? "Image upload failed." };
  }
  const imageUrls = uploadResult.data;
  const coverImageUrl = imageUrls[0];
  const imageRows = imageUrls.map((image_url, i) => ({
    listing_id: listingId,
    image_url,
    alt: null as string | null,
    sort_order: i,
  }));
  const { error: imagesInsertError } = await supabase.from("listing_images").insert(imageRows);
  if (imagesInsertError) {
    await supabase.from("listings").delete().eq("id", listingId);
    return { error: `Failed to save gallery: ${imagesInsertError.message}` };
  }
  await supabase.from("listings").update({ cover_image_url: coverImageUrl }).eq("id", listingId);

  try {
    const pipelineResult = await processProductImages(listingId);
    console.log("[admin createProduct] image_ai pipeline: image_ai rows upserted =", pipelineResult.processed, "errors =", pipelineResult.errors.length);
    if (pipelineResult.errors.length > 0) {
      console.warn("[admin createProduct] image_ai pipeline errors:", pipelineResult.errors);
    }
    const matchResult = await computeAndUpsertAllMatches();
    console.log("[admin createProduct] matches recompute: projectsProcessed =", matchResult.projectsProcessed, "totalUpserted =", matchResult.totalUpserted);
    if (matchResult.errors.length > 0) {
      console.warn("[admin createProduct] matches recompute errors:", matchResult.errors);
    }
  } catch (e) {
    console.warn("[admin createProduct] matches pipeline non-fatal:", e);
  }

  if (docFiles.length > 0) {
    const docUpload = await uploadListingDocumentsServer(listingId, docFiles);
    if (docUpload.error || !docUpload.data?.length) {
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Document upload failed: ${docUpload.error ?? "no files returned"}` };
    }
    const filesToPersist = docUpload.data.map((d, i) => ({
      url: d.url,
      name: d.fileName,
      mime: d.fileType,
      storage_path: d.storagePath,
      size: docFiles[i]?.size,
    }));
    const err = await persistListingDocuments(listingId, filesToPersist);
    if (err.error) {
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Document save failed: ${err.error}` };
    }
  }

  if (material_ids.length >= 0) {
    const { error: materialErr } = await setProductMaterials(listingId, material_ids);
    if (materialErr) return { error: `Failed to save materials: ${materialErr}` };
  }

  if (admin.ok) {
    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.create",
      entityType: "listing",
      entityId: listingId,
      metadata: { type: "product" },
    });
  }
  revalidatePath("/");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  redirect(`/admin/products/${listingId}`);
}

export async function bulkUpdateListings(input: {
  ids: string[];
  patch: Partial<{
    title: string | null;
    description: string | null;
    location: string | null;
    category: string | null;
    year: string | null;
    product_type: string | null;
    material_or_finish: string | null;
    dimensions: string | null;
    cover_image_url: string | null;
    owner_profile_id: string | null;
  }>;
}) {
  const ids = Array.from(new Set(input.ids)).filter(Boolean);
  if (ids.length === 0) return { ok: false as const, error: "No ids provided" };

  const supabase = getSupabaseServiceClient();
  const patch = { ...input.patch } as Record<string, unknown>;
  if ("title" in patch) patch.title = toNullableText(patch.title);
  if ("description" in patch) patch.description = toNullableText(patch.description);
  if ("location" in patch) patch.location = toNullableText(patch.location);
  if ("category" in patch) patch.category = toNullableText(patch.category);
  if ("year" in patch) patch.year = toNullableText(patch.year);
  if ("product_type" in patch) patch.product_type = toNullableText(patch.product_type);
  if ("material_or_finish" in patch) patch.material_or_finish = toNullableText(patch.material_or_finish);
  if ("dimensions" in patch) patch.dimensions = toNullableText(patch.dimensions);
  if ("cover_image_url" in patch) patch.cover_image_url = toNullableText(patch.cover_image_url);
  if ("owner_profile_id" in patch) patch.owner_profile_id = input.patch.owner_profile_id ?? null;

  const { error } = await supabase.from("listings").update(patch).in("id", ids);
  if (error) return { ok: false as const, error: error.message };

  const admin = await ensureAdmin();
  if (admin.ok) {
    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.update",
      entityType: "listing",
      metadata: { count: ids.length, ids },
    });
  }
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/admin/listings");
  revalidatePath("/admin");
  revalidatePath("/projects");
  revalidatePath("/products");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  return { ok: true as const };
}

export async function duplicateListing(listingId: string) {
  const supabase = getSupabaseServiceClient();
  const { data: row, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!row) return { ok: false as const, error: "Listing not found" };

  const title = typeof row.title === "string" ? row.title : "Untitled";
  const newRow = {
    ...row,
    id: undefined,
    created_at: undefined,
    title: `${title} (Copy)`,
  } as Record<string, unknown>;
  // Ensure we do not send id/created_at. DB requires both type and listing_type (NOT NULL on type).
  delete newRow.id;
  delete newRow.created_at;
  newRow.type = newRow.type ?? newRow.listing_type;
  newRow.listing_type = newRow.listing_type ?? newRow.type;

  const { data: inserted, error: insertError } = await supabase
    .from("listings")
    .insert(newRow)
    .select("id, type")
    .maybeSingle();
  if (insertError) return { ok: false as const, error: insertError.message };
  if (!inserted) return { ok: false as const, error: "Insert did not return a row." };

  const insertedRow = inserted as unknown as { id?: string; type?: unknown; listing_type?: unknown };
  const type = (insertedRow?.type ?? insertedRow?.listing_type) as "project" | "product" | undefined;
  const id = insertedRow?.id as string | undefined;
  if (!id || !type) return { ok: false as const, error: "Insert did not return id/type" };

  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const, id, type };
}

export async function duplicateListingAndGo(listingId: string) {
  const res = await duplicateListing(listingId);
  if (!res.ok) return res;
  const base = res.type === "project" ? "/admin/projects" : "/admin/products";
  redirect(`${base}/${res.id}`);
}

export async function createListingAndGo(input: {
  type: "project" | "product";
  title: string;
  owner_profile_id: string;
}) {
  const ownerProfileId = (input.owner_profile_id ?? "").trim();
  if (!ownerProfileId) return { ok: false as const, error: "Owner profile is required." };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({
      type: input.type,
      listing_type: input.type,
      title: (input.title ?? "").trim() || (input.type === "project" ? "Untitled project" : "Untitled product"),
      description: null,
      location: null,
      category: null,
      area_sqft: null,
      year: null,
      product_type: null,
      feature_highlight: null,
      material_or_finish: null,
      dimensions: null,
      team_members: [],
      brands_used: [],
      cover_image_url: null,
      owner_clerk_user_id: null,
      owner_profile_id: ownerProfileId,
    })
    .select("id, type")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  const row = data as unknown as { id?: string; type?: unknown; listing_type?: unknown } | null;
  const id = row?.id as string | undefined;
  const type = (row?.type ?? row?.listing_type) as "project" | "product" | undefined;
  if (!id || !type) return { ok: false as const, error: "Insert did not return id/type" };

  const admin = await ensureAdmin();
  if (admin.ok) {
    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.create",
      entityType: "listing",
      entityId: id,
      metadata: { type },
    });
  }
  revalidatePath("/admin");
  redirect(type === "project" ? `/admin/projects/${id}` : `/admin/products/${id}`);
}

async function ensureAdmin(): Promise<{ ok: true; adminUserId: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Unauthorized" };
  const res = await getProfileByClerkIdForAdmin(userId);
  if (res.error || !res.data) return { ok: false, error: "Profile not found" };
  const profile = res.data as { is_admin?: boolean };
  if (!profile.is_admin) return { ok: false, error: "Forbidden" };
  return { ok: true, adminUserId: userId };
}

/**
 * Delete one listing and dependent rows (listing_images, project_product_links).
 * Does not delete project_material_links (FK to listings may cascade) or listing_documents (FK cascade).
 */
export async function deleteListing(listingId: string) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };

  const supabase = getSupabaseServiceClient();
  await supabase.from("listing_images").delete().eq("listing_id", listingId);
  await supabase.from("project_product_links").delete().or(`project_id.eq.${listingId},product_id.eq.${listingId}`);
  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) return { ok: false as const, error: error.message };

  await createAuditLog({
    adminUserId: admin.adminUserId,
    action: "listing.delete",
    entityType: "listing",
    entityId: listingId,
    metadata: {},
  });
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/projects");
  revalidatePath("/products");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  return { ok: true as const };
}

/**
 * Bulk delete listings with same cascade as deleteListing.
 */
export async function bulkDeleteListings(ids: string[]) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return { ok: false as const, error: "No ids provided" };

  const supabase = getSupabaseServiceClient();
  for (const id of uniqueIds) {
    await supabase.from("listing_images").delete().eq("listing_id", id);
    await supabase.from("project_product_links").delete().or(`project_id.eq.${id},product_id.eq.${id}`);
  }
  const { error } = await supabase.from("listings").delete().in("id", uniqueIds);
  if (error) return { ok: false as const, error: error.message };

  await createAuditLog({
    adminUserId: admin.adminUserId,
    action: "listing.bulk_delete",
    entityType: "listing",
    metadata: { count: uniqueIds.length, ids: uniqueIds },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/projects");
  revalidatePath("/products");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  return { ok: true as const };
}

/** Full update of a project listing using same form schema as create. Admin only. */
export async function updateProjectAction(
  _prev: AdminCreateResult | null,
  formData: FormData
): Promise<AdminCreateResult> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { error: admin.error };

  const listingId = (formData.get("_listingId") as string)?.trim();
  if (!listingId) return { error: "Missing listing id." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const location_text = (formData.get("location_text") as string)?.trim() || (formData.get("location") as string)?.trim() || null;
  const location_city = (formData.get("location_city") as string)?.trim() || null;
  const location_country = (formData.get("location_country") as string)?.trim() || null;
  const location_latRaw = formData.get("location_lat");
  const location_lngRaw = formData.get("location_lng");
  const location_lat = location_latRaw != null && String(location_latRaw).trim() !== "" ? Number(String(location_latRaw).trim()) : null;
  const location_lng = location_lngRaw != null && String(location_lngRaw).trim() !== "" ? Number(String(location_lngRaw).trim()) : null;
  const category = (formData.get("category") as string)?.trim() ?? null;
  const areaSqftRaw = formData.get("area_sqft");
  const area_sqft = areaSqftRaw !== null && areaSqftRaw !== "" ? Number(String(areaSqftRaw).trim()) : null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const material_or_finish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const team_members = parseTeamMembers(formData.get("team_members"));
  const material_ids = parseMaterialIds(formData.get("project_material_ids"));
  const mentioned_products = parseMentionedProducts(formData.get("mentioned_products"));

  if (!title) return { error: "Title is required." };
  if (!description?.trim()) return { error: "Description is required." };
  if (!location_text?.trim()) return { error: "Project location is required." };
  if (!category?.trim()) return { error: "Project category is required." };
  if (!year?.trim()) return { error: "Year is required." };

  const supabase = getSupabaseServiceClient();
  const { error: updateError } = await supabase
    .from("listings")
    .update({
      title,
      description: description || null,
      location: location_text,
      location_text,
      location_city: location_city || null,
      location_country: location_country || null,
      location_lat: location_lat != null && !Number.isNaN(location_lat) ? location_lat : null,
      location_lng: location_lng != null && !Number.isNaN(location_lng) ? location_lng : null,
      category: category || null,
      year: year || null,
      area_sqft: area_sqft != null && !Number.isNaN(area_sqft) && area_sqft > 0 ? area_sqft : null,
      material_or_finish: material_or_finish || null,
      team_members,
      brands_used: [],
      mentioned_products: mentioned_products.length > 0 ? mentioned_products : [],
    })
    .eq("id", listingId);

  if (updateError) return { error: updateError.message };

  try {
    await persistListingTeamMembers(supabase, listingId, team_members);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save team members." };
  }

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length >= MIN_GALLERY_IMAGES) {
    await supabase.from("listing_images").delete().eq("listing_id", listingId);
    const uploadResult = await uploadGalleryImagesServer(listingId, imageFiles);
    if (uploadResult.error || !uploadResult.data?.length) {
      return { error: uploadResult.error ?? "Image upload failed." };
    }
    const imageRows = uploadResult.data.map((image_url, i) => ({
      listing_id: listingId,
      image_url,
      alt: null as string | null,
      sort_order: i,
    }));
    const { error: imgErr } = await supabase.from("listing_images").insert(imageRows);
    if (imgErr) return { error: `Failed to save gallery: ${imgErr.message}` };
    const coverImageUrl = uploadResult.data[0];
    await supabase.from("listings").update({ cover_image_url: coverImageUrl }).eq("id", listingId);
    try {
      await processProjectImages(listingId);
      await computeAndUpsertMatchesForProject(listingId);
    } catch {
      // non-fatal
    }
  }

  const docFiles = getDocumentFiles(formData);
  if (docFiles.length > 0) {
    const docUpload = await uploadListingDocumentsServer(listingId, docFiles);
    if (docUpload.data?.length) {
      await addDocuments(
        listingId,
        docUpload.data.map((d) => ({
          file_url: d.url,
          file_name: d.fileName,
          file_type: d.fileType,
          storage_path: d.storagePath,
        }))
      );
    }
  }

  if (material_ids.length >= 0) {
    const { error: materialErr } = await setProjectMaterials(listingId, material_ids);
    if (materialErr) return { error: `Failed to save materials: ${materialErr}` };
  }

  if (admin.ok) {
    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.update",
      entityType: "listing",
      entityId: listingId,
      metadata: { type: "project" },
    });
  }
  revalidatePath("/admin/projects");
  revalidatePath("/admin/projects/[id]");
  revalidatePath("/projects");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/explore/projects");
  revalidatePath("/u/[username]", "page");
  redirect(`/admin/projects/${listingId}?saved=1`);
}

/** Full update of a product listing using same form schema as create. Admin only. */
export async function updateProductAction(
  _prev: AdminCreateResult | null,
  formData: FormData
): Promise<AdminCreateResult> {
  const admin = await ensureAdmin();
  if (!admin.ok) return { error: admin.error };

  const listingId = (formData.get("_listingId") as string)?.trim();
  if (!listingId) return { error: "Missing listing id." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const product_type = (formData.get("product_type") as string)?.trim() ?? null;
  const product_category = (formData.get("product_category") as string)?.trim() ?? null;
  const product_subcategory = (formData.get("product_subcategory") as string)?.trim() ?? null;
  const material_or_finish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const dimensions = (formData.get("dimensions") as string)?.trim() ?? null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const team_members = parseTeamMembers(formData.get("team_members"));
  const material_ids = parseMaterialIds(formData.get("product_material_ids"));
  const color_options = parseColorOptions(formData.get("color_options"));

  if (!title) return { error: "Product title is required." };
  if (!description?.trim()) return { error: "Description is required." };
  if (!product_type?.trim()) return { error: "Product type is required." };
  if (!product_subcategory?.trim()) return { error: "Product subcategory is required." };

  console.log("[product taxonomy]", { listingId, product_type, product_category, product_subcategory });
  const supabase = getSupabaseServiceClient();
  const { error: updateError } = await supabase
    .from("listings")
    .update({
      title,
      description: description || null,
      product_type: product_type || null,
      product_category: product_category || null,
      product_subcategory: product_subcategory || null,
      material_or_finish: material_or_finish || null,
      dimensions: dimensions || null,
      year: year || null,
      team_members,
    })
    .eq("id", listingId);

  if (updateError) return { error: updateError.message };

  await supabase
    .from("products")
    .update({
      color_options,
      color: color_options.length > 0 ? color_options[0] : null,
    })
    .eq("id", listingId);

  try {
    await persistListingTeamMembers(supabase, listingId, team_members);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save team members." };
  }

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length >= MIN_GALLERY_IMAGES) {
    await supabase.from("listing_images").delete().eq("listing_id", listingId);
    const uploadResult = await uploadGalleryImagesServer(listingId, imageFiles);
    if (uploadResult.error || !uploadResult.data?.length) {
      return { error: uploadResult.error ?? "Image upload failed." };
    }
    const imageRows = uploadResult.data.map((image_url, i) => ({
      listing_id: listingId,
      image_url,
      alt: null as string | null,
      sort_order: i,
    }));
    const { error: imgErr } = await supabase.from("listing_images").insert(imageRows);
    if (imgErr) return { error: `Failed to save gallery: ${imgErr.message}` };
    await supabase.from("listings").update({ cover_image_url: uploadResult.data[0] }).eq("id", listingId);
    try {
      await processProductImages(listingId);
      await computeAndUpsertAllMatches();
    } catch {
      // non-fatal
    }
  }

  const docFiles = getDocumentFiles(formData);
  if (docFiles.length > 0) {
    const docUpload = await uploadListingDocumentsServer(listingId, docFiles);
    if (docUpload.data?.length) {
      const filesToPersist = docUpload.data.map((d, i) => ({
        url: d.url,
        name: d.fileName,
        mime: d.fileType,
        storage_path: d.storagePath,
        size: docFiles[i]?.size,
      }));
      const err = await persistListingDocuments(listingId, filesToPersist);
      if (err.error) return { error: `Document save failed: ${err.error}` };
    }
  }

  if (material_ids.length >= 0) {
    const { error: materialErr } = await setProductMaterials(listingId, material_ids);
    if (materialErr) return { error: `Failed to save materials: ${materialErr}` };
  }

  if (admin.ok) {
    await createAuditLog({
      adminUserId: admin.adminUserId,
      action: "listing.update",
      entityType: "listing",
      entityId: listingId,
      metadata: { type: "product" },
    });
  }
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/[id]");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/explore/products");
  revalidatePath("/u/[username]", "page");
  redirect(`/admin/products/${listingId}?saved=1`);
}

/** Admin-only: approve a pending listing (set status = APPROVED). */
export async function approveListingAction(listingId: string) {
  const admin = await ensureAdmin();
  if (!admin.ok) return { ok: false as const, error: admin.error };
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("listings").update({ status: "APPROVED" }).eq("id", listingId);
  if (error) return { ok: false as const, error: error.message };
  await createAuditLog({
    adminUserId: admin.adminUserId,
    action: "listing.approve",
    entityType: "listing",
    entityId: listingId,
    metadata: {},
  });
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/projects");
  revalidatePath("/products");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  return { ok: true as const };
}

/** Form action: approve listing by _listingId from form data. */
export async function approveListingFormAction(formData: FormData) {
  const listingId = formData.get("_listingId");
  if (typeof listingId !== "string" || !listingId.trim()) return { ok: false as const, error: "Missing listing id" };
  return approveListingAction(listingId.trim());
}

/** Void-returning form action for use with <form action={…}> (React expects void | Promise<void>). */
export async function approveListingFormActionVoid(formData: FormData): Promise<void> {
  await approveListingFormAction(formData);
}

/** Admin-only: delete a single project listing by id. Use from Admin Projects list. */
export async function deleteAdminProjectAction(listingId: string) {
  return deleteListing(listingId);
}
/** Admin-only: delete a single product listing by id. Use from Admin Products list. */
export async function deleteAdminProductAction(listingId: string) {
  return deleteListing(listingId);
}
