"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  createListing as dbCreateListing,
  deleteListing as dbDeleteListing,
  getListingById,
  updateListingCoverImage,
  upsertListingForProduct,
} from "@/lib/db/listings";
import { addImages } from "@/lib/db/listingImages";
import { addDocuments } from "@/lib/db/listingDocuments";
import { uploadGalleryImages } from "@/lib/storage/gallery";
import {
  uploadGalleryImagesForProject,
  uploadGalleryImagesForProduct,
} from "@/lib/storage/gallery";
import { uploadListingDocumentsServer } from "@/lib/storage/documents";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getProductCanonicalBySlug } from "@/lib/db/explore";
import {
  createProjectRow,
  createProductRow,
  addProjectImages,
  addProductImages,
  deleteProjectRow,
  deleteProductRow,
  getProductBySlug,
  getProductImages,
} from "@/lib/db/gallery";
import type { TeamMember, BrandUsed } from "@/lib/types/listings";
import type { ActionResult } from "./types";
import { setProjectMaterials, setProductMaterials } from "@/lib/db/materials";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processProductImages } from "@/lib/matches/pipeline";
import { computeAndUpsertAllMatches } from "@/lib/matches/engine";
import { persistListingTeamMembers } from "@/app/actions/createProject";

export type { ActionResult } from "./types";

const GALLERY_MIN_IMAGES = 3;
const PRODUCT_MIN_DESC_WORDS = 200;

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
        typeof x === "object" &&
        x !== null &&
        typeof (x as BrandUsed).name === "string"
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

export async function createProject(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to create a project." };
  }
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) {
    return { error: "Complete onboarding first." };
  }
  if (profile.role !== "designer") {
    return { error: "Only designers can create projects." };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const location = (formData.get("location") as string)?.trim() ?? null;
  const category = (formData.get("category") as string)?.trim() ?? null;
  const areaSqftRaw = formData.get("area_sqft");
  const areaSqft =
    areaSqftRaw !== null && areaSqftRaw !== ""
      ? Number(String(areaSqftRaw).trim())
      : null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const teamMembers = parseTeamMembers(formData.get("team_members"));
  const brandsUsed = parseBrandsUsed(formData.get("brands_used"));

  if (!title) return { error: "Project title is required." };
  if (!description?.trim()) return { error: "Project description is required." };
  if (!location?.trim()) return { error: "Project location is required." };
  if (!category?.trim()) return { error: "Project category is required." };
  if (!year?.trim()) return { error: "Year is required." };

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length < GALLERY_MIN_IMAGES) {
    return {
      error: `At least ${GALLERY_MIN_IMAGES} gallery images are required.`,
    };
  }

  const createResult = await dbCreateListing({
    type: "project",
    title,
    description: description.trim(),
    owner_clerk_user_id: userId,
    location: location.trim() || null,
    category: category.trim() || null,
    area_sqft: areaSqft != null && !Number.isNaN(areaSqft) && areaSqft > 0 ? areaSqft : null,
    year: year.trim() || null,
    team_members: teamMembers,
    brands_used: brandsUsed,
  });
  if (createResult.error) return { error: createResult.error };
  const listingId = createResult.data!.id;

  const uploadResult = await uploadGalleryImages(listingId, imageFiles);
  if (uploadResult.error || !uploadResult.data?.length) {
    await dbDeleteListing(listingId);
    return {
      error: uploadResult.error
        ? `Image upload failed: ${uploadResult.error}`
        : "Image upload failed",
    };
  }
  const uploadedUrls = uploadResult.data;
  const coverUrl = uploadedUrls[0];

  const coverUpdate = await updateListingCoverImage(listingId, coverUrl);
  if (coverUpdate.error) {
    await dbDeleteListing(listingId);
    return { error: coverUpdate.error };
  }

  const addResult = await addImages(listingId, uploadedUrls);
  if (addResult.error) {
    await dbDeleteListing(listingId);
    return { error: `Failed to save image records: ${addResult.error}` };
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

  revalidatePath("/explore/projects");
  revalidatePath("/me/listings");
  revalidatePath("/");
  return { id: listingId };
}

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to create a product." };
  }
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) {
    return { error: "Complete onboarding first." };
  }
  if (profile.role !== "brand") {
    return { error: "Only brands can create products." };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const productType = (formData.get("product_type") as string)?.trim() ?? null;
  const productCategory = (formData.get("product_category") as string)?.trim() ?? null;
  const productSubcategory = (formData.get("product_subcategory") as string)?.trim() ?? null;
  const featureHighlight = (formData.get("feature_highlight") as string)?.trim() ?? null;
  const materialOrFinish = (formData.get("material_or_finish") as string)?.trim() ?? null;
  const dimensions = (formData.get("dimensions") as string)?.trim() ?? null;
  const year = (formData.get("year") as string)?.trim() ?? null;
  const teamMembers = parseTeamMembers(formData.get("team_members"));
  const docFiles = getDocumentFiles(formData);

  if (!title) return { error: "Product title is required." };
  if (!description?.trim()) return { error: "Product description is required." };
  if (!productType?.trim()) return { error: "Product type is required." };
  if (!productSubcategory?.trim()) {
    return { error: "Product subcategory is required. Please select a subcategory (or \"Other / Not specified\" if none fit)." };
  }

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length < GALLERY_MIN_IMAGES) {
    return {
      error: `At least ${GALLERY_MIN_IMAGES} gallery images are required.`,
    };
  }

  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
  const supabase = getSupabaseServiceClient();
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await supabase.from("listings").select("id").eq("slug", slug).limit(1).maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${++n}`;
  }

  const createResult = await dbCreateListing({
    type: "product",
    title,
    description: description.trim(),
    owner_clerk_user_id: userId,
    slug,
    product_type: productType.trim() || null,
    product_category: productCategory || null,
    product_subcategory: productSubcategory.trim() || null,
    feature_highlight: featureHighlight || null,
    material_or_finish: materialOrFinish || null,
    dimensions: dimensions || null,
    year: year || null,
    team_members: teamMembers,
  });
  if (createResult.error) return { error: createResult.error };
  const listingId = createResult.data!.id;
  const resolvedSlug = slug;

  if (teamMembers.length > 0) {
    try {
      const supabase = getSupabaseServiceClient();
      await persistListingTeamMembers(supabase, listingId, teamMembers);
    } catch (err) {
      await dbDeleteListing(listingId);
      return {
        error: err instanceof Error ? err.message : "Failed to save team members.",
      };
    }
  }

  const uploadResult = await uploadGalleryImages(listingId, imageFiles);
  if (uploadResult.error || !uploadResult.data?.length) {
    await dbDeleteListing(listingId);
    return {
      error: uploadResult.error
        ? `Image upload failed: ${uploadResult.error}`
        : "Image upload failed",
    };
  }
  const uploadedUrls = uploadResult.data;
  const coverUrl = uploadedUrls[0];

  const coverUpdate = await updateListingCoverImage(listingId, coverUrl);
  if (coverUpdate.error) {
    await dbDeleteListing(listingId);
    return { error: coverUpdate.error };
  }

  const addResult = await addImages(listingId, uploadedUrls);
  if (addResult.error) {
    await dbDeleteListing(listingId);
    return { error: `Failed to save image records: ${addResult.error}` };
  }

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

  revalidatePath("/explore/products");
  revalidatePath("/");
  revalidatePath("/me/listings");
  return { slug: resolvedSlug };
}

export async function deleteListing(listingId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to delete a listing." };
  }
  const { data: listing, error: fetchError } = await getListingById(listingId);
  if (fetchError || !listing) {
    return { error: "Listing not found." };
  }
  if (listing.owner_clerk_user_id !== userId) {
    return { error: "You can only delete your own listings." };
  }
  const { error: deleteError } = await dbDeleteListing(listingId);
  if (deleteError) {
    return { error: deleteError };
  }
  revalidatePath("/me/listings");
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  revalidatePath("/");
  return {};
}

/** Create project in projects table and redirect to /projects/[slug]. */
export async function createProjectCanonical(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to create a project." };
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) return { error: "Complete onboarding first." };
  if (profile.role !== "designer") return { error: "Only designers can create projects." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  if (!title) return { error: "Project title is required." };
  if (!description?.trim()) return { error: "Project description is required." };

  const imageFiles = getImageFiles(formData);
  if (imageFiles.length < GALLERY_MIN_IMAGES) {
    return { error: `At least ${GALLERY_MIN_IMAGES} gallery images are required.` };
  }

  const row = await createProjectRow({ title, description });
  if (!row) return { error: "Failed to create project." };
  const { id: projectId, slug } = row;

  const uploadResult = await uploadGalleryImagesForProject(projectId, imageFiles);
  if (uploadResult.error || !uploadResult.data?.length) {
    await deleteProjectRow(projectId);
    return { error: uploadResult.error ?? "Image upload failed." };
  }
  const urls = uploadResult.data.map((src) => ({ src, alt: title }));
  const addErr = await addProjectImages(projectId, urls);
  if (addErr.error) {
    await deleteProjectRow(projectId);
    return { error: addErr.error };
  }

  revalidatePath("/");
  revalidatePath("/explore/projects");
  return { slug };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Create product in products table and redirect to /products/[slug]. */
export async function createProductCanonical(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to create a product." };
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) return { error: "Complete onboarding first." };
  if (profile.role !== "brand") return { error: "Only brands can create products." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  const subtitle = description?.trim() || null;
  const isDraft = formData.get("draft") === "1";
  const materialIds = parseMaterialIds(formData.get("product_material_ids"));

  if (!title) return { error: "Product title is required." };

  if (!isDraft) {
    if (!description?.trim()) return { error: "Product description is required." };
    const words = countWords(description);
    if (words < PRODUCT_MIN_DESC_WORDS) {
      return { error: `Description must be at least ${PRODUCT_MIN_DESC_WORDS} words (currently ${words}).` };
    }
  }

  const imageFiles = getImageFiles(formData);
  if (!isDraft && imageFiles.length < GALLERY_MIN_IMAGES) {
    return { error: `At least ${GALLERY_MIN_IMAGES} gallery images are required.` };
  }

  const row = await createProductRow({ title, subtitle: subtitle || null });
  if (!row) return { error: "Failed to create product." };
  const { id: productId, slug } = row;

  const listingPayload = {
    slug,
    title,
    description: description ?? null,
    owner_clerk_user_id: userId,
    owner_profile_id: profile.id ?? null,
  };
  const listingErr = await upsertListingForProduct(productId, listingPayload);
  if (listingErr.error) {
    await deleteProductRow(productId);
    return { error: `Failed to create listing: ${listingErr.error}` };
  }

  if (imageFiles.length > 0) {
    const uploadResult = await uploadGalleryImagesForProduct(productId, imageFiles);
    if (uploadResult.error || !uploadResult.data?.length) {
      await dbDeleteListing(productId);
      await deleteProductRow(productId);
      return { error: uploadResult.error ?? "Image upload failed." };
    }
    const urls = uploadResult.data.map((src) => ({ src, alt: title }));
    const addErr = await addProductImages(productId, urls);
    if (addErr.error) {
      await dbDeleteListing(productId);
      await deleteProductRow(productId);
      return { error: addErr.error };
    }
    const addListingImagesErr = await addImages(productId, uploadResult.data);
    if (addListingImagesErr.error) {
      await dbDeleteListing(productId);
      await deleteProductRow(productId);
      return { error: addListingImagesErr.error ?? "Failed to save gallery." };
    }
    const coverErr = await updateListingCoverImage(productId, uploadResult.data[0]);
    if (coverErr.error) {
      await dbDeleteListing(productId);
      await deleteProductRow(productId);
      return { error: coverErr.error ?? "Failed to set cover image." };
    }

    try {
      const pipelineResult = await processProductImages(productId);
      console.log("[createProduct] image_ai pipeline result: listing_images processed, image_ai rows upserted =", pipelineResult.processed, "errors =", pipelineResult.errors.length, pipelineResult.errors.length ? pipelineResult.errors : "");
      if (pipelineResult.errors.length > 0) {
        console.warn("[createProduct] image_ai pipeline errors:", pipelineResult.errors);
      }
      const matchResult = await computeAndUpsertAllMatches();
      console.log("[createProduct] matches recompute: projectsProcessed =", matchResult.projectsProcessed, "totalUpserted =", matchResult.totalUpserted, "match errors =", matchResult.errors.length);
      if (matchResult.errors.length > 0) {
        console.warn("[createProduct] matches recompute errors:", matchResult.errors);
      }
    } catch (e) {
      console.warn("[createProduct] matches pipeline non-fatal:", e);
    }
  }

  if (materialIds.length >= 0) {
    const { error: matErr } = await setProductMaterials(productId, materialIds);
    if (matErr) {
      return { error: `Failed to save materials: ${matErr}` };
    }
  }

  const docFiles = getDocumentFiles(formData);
  console.log("[DOCS] docFiles", docFiles.length);
  if (docFiles.length > 0) {
    const docUpload = await uploadListingDocumentsServer(productId, docFiles);
    console.log("[DOCS] upload", { ok: !docUpload.error, count: docUpload.data?.length, error: docUpload.error });
    if (docUpload.error || !docUpload.data?.length) {
      await dbDeleteListing(productId);
      await deleteProductRow(productId);
      return { error: `Document upload failed: ${docUpload.error ?? "no files returned"}` };
    }
    const insert = await addDocuments(
      productId,
      docUpload.data.map((d) => ({
        file_name: d.fileName,
        file_url: d.url,
        file_type: d.fileType,
        storage_path: d.storagePath,
      }))
    );
    console.log("[DOCS] insert", { ok: !insert.error, inserted: insert.data });
    if (insert.error) {
      await dbDeleteListing(productId);
      await deleteProductRow(productId);
      return { error: `Document DB insert failed: ${insert.error}` };
    }
  }

  revalidatePath("/");
  revalidatePath("/explore/products");
  revalidatePath(`/products/${slug}`);
  return { slug };
}

/**
 * Fetch product for the /products/[slug] page. Runs safety backfill in this server action only:
 * if a product exists in public.products but no listing exists, creates the listing row (and syncs
 * images) then refetches. Do not run backfill on page render (RSC); only via this action.
 * Returns product or null (caller should notFound() when null).
 */
export async function getProductForProductPage(slug: string) {
  let product = await getProductCanonicalBySlug(slug);
  if (!product) {
    await ensureListingForProductBySlug(slug);
    product = await getProductCanonicalBySlug(slug);
  }
  return product;
}

/**
 * Safety backfill: if a product exists in products but no listing exists, create the listing row
 * (and sync images to listing_images). Call only from server actions (e.g. getProductForProductPage).
 * Idempotent: if listing already exists, no-op.
 */
export async function ensureListingForProductBySlug(slug: string): Promise<void> {
  const productRow = await getProductBySlug(slug);
  if (!productRow) return;
  const productId = productRow.id;
  const existing = await getListingById(productId);
  if (existing.data) return;
  await upsertListingForProduct(productId, {
    slug: productRow.slug,
    title: productRow.title,
    description: productRow.subtitle ?? null,
    owner_clerk_user_id: null,
    owner_profile_id: null,
  });
  const images = await getProductImages(productId);
  if (images.length > 0) {
    const urls = images.map((img) => img.src);
    await addImages(productId, urls);
    await updateListingCoverImage(productId, urls[0]);
  }
}
