"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions/types";
import { createProductCanonical } from "@/app/actions/listings";
import { createAdminProductFull } from "@/app/(admin)/admin/_actions/listings";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AddListingLayout } from "@/components/add/AddListingLayout";
import { GalleryUploadCard } from "@/components/add/GalleryUploadCard";
import { ListingPreviewCard } from "@/components/add/ListingPreviewCard";
import { DocumentsUploadCard } from "@/components/add/DocumentsUploadCard";
import { SubmissionProgressBar } from "@/components/add/SubmissionProgressBar";
import {
  PRODUCT_TAXONOMY,
  getCategoriesForType,
  getSubcategoriesForCategory,
} from "@/lib/taxonomy/productTaxonomy";
import {
  PRODUCT_STAGE_VALUES,
  PRODUCT_STAGE_LABELS,
  PRODUCT_COLLAB_VALUES,
  PRODUCT_COLLAB_LABELS,
  PRODUCT_LOOKING_FOR_OPTIONS,
} from "@/lib/lifecycle";

/** Minimal node shape the form needs from the DB taxonomy tree. */
export interface TaxonomyNodeForForm {
  id: string;
  parent_id: string | null;
  depth: number;
  label: string;
  legacy_product_type: string | null;
  legacy_product_category: string | null;
  legacy_product_subcategory: string | null;
}
import type { MemberTitleRow } from "../project/TeamMembersField";
import { TeamMembersField } from "../project/TeamMembersField";
import {
  AdvancedFiltersSection,
  type MaterialNodeForForm,
  type FacetForForm,
} from "@/components/add/AdvancedFiltersSection";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const textareaClass =
  "w-full min-h-[120px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const sectionClass =
  "space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50";
const sectionTitleClass =
  "text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-1";

const MIN_DESC_WORDS = 200;
const PRODUCT_REQUIRED_COUNT = 5;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type OwnerProfileOption = { id: string; display_name: string | null; username: string | null };

export interface ProductFormInitialData {
  listingId: string;
  title: string;
  description: string;
  productType: string;
  productCategory: string;
  productSubcategory: string;
  /** DB taxonomy node ID (new system). Used to pre-select the taxonomy hierarchy. */
  taxonomyNodeId?: string | null;
  dimensions: string;
  year: string;
  teamRows: Array<{ name: string; role: string }>;
  /** Number of images already saved in the DB. Passed to GalleryUploadCard. */
  existingImageCount?: number;
  /** Pre-selected material taxonomy node IDs (for edit mode). */
  materialNodeIds?: string[];
  /** Pre-selected facet value IDs (for edit mode). */
  facetValueIds?: string[];
  // Lifecycle
  productStage?: string;
  productCollaborationStatus?: string;
  productLookingFor?: string[];
}

/** Resolve initial family/category/subcategory node IDs from initialData + nodes. */
function resolveInitialIds(
  nodes: TaxonomyNodeForForm[],
  init?: ProductFormInitialData
): { familyId: string; categoryId: string; subcategoryId: string } {
  const empty = { familyId: "", categoryId: "", subcategoryId: "" };
  if (!init || !nodes.length) return empty;

  // Helper: given a node, trace up parent chain to set all three IDs
  const traceUp = (node: TaxonomyNodeForForm) => {
    if (node.depth === 2) {
      const parent = nodes.find((n) => n.id === node.parent_id);
      const grandparent = parent ? nodes.find((n) => n.id === parent.parent_id) : null;
      return { familyId: grandparent?.id ?? "", categoryId: parent?.id ?? "", subcategoryId: node.id };
    }
    if (node.depth === 1) {
      const parent = nodes.find((n) => n.id === node.parent_id);
      return { familyId: parent?.id ?? "", categoryId: node.id, subcategoryId: "" };
    }
    return { familyId: node.id, categoryId: "", subcategoryId: "" };
  };

  // 1. Try by taxonomyNodeId
  if (init.taxonomyNodeId) {
    const node = nodes.find((n) => n.id === init.taxonomyNodeId);
    if (node) return traceUp(node);
  }

  // 2. Fall back to matching by legacy slugs
  if (init.productSubcategory) {
    const node = nodes.find(
      (n) =>
        n.legacy_product_type === init.productType &&
        n.legacy_product_category === init.productCategory &&
        n.legacy_product_subcategory === init.productSubcategory
    );
    if (node) return traceUp(node);
  }
  if (init.productCategory) {
    const node = nodes.find(
      (n) =>
        n.legacy_product_type === init.productType &&
        n.legacy_product_category === init.productCategory &&
        !n.legacy_product_subcategory &&
        n.depth === 1
    );
    if (node) return traceUp(node);
  }
  if (init.productType) {
    const node = nodes.find(
      (n) => n.legacy_product_type === init.productType && n.depth === 0
    );
    if (node) return { familyId: node.id, categoryId: "", subcategoryId: "" };
  }
  return empty;
}

export function AddProductForm({
  memberTitles,
  formMode = "user",
  ownerProfileOptions = [],
  initialData,
  updateAction,
  taxonomyNodes = [],
  materialNodes,
  facets,
}: {
  memberTitles: MemberTitleRow[];
  formMode?: "user" | "admin";
  ownerProfileOptions?: OwnerProfileOption[];
  initialData?: ProductFormInitialData;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** DB-backed taxonomy nodes. When provided, replaces the static PRODUCT_TAXONOMY. */
  taxonomyNodes?: TaxonomyNodeForForm[];
  /** Material taxonomy nodes for AdvancedFiltersSection. */
  materialNodes?: MaterialNodeForForm[];
  /** Facets with values for AdvancedFiltersSection. */
  facets?: FacetForForm[];
}) {
  const useDbTaxonomy = taxonomyNodes.length > 0;
  const router = useRouter();
  const action = updateAction ?? (formMode === "admin" ? createAdminProductFull : createProductCanonical);
  const [state, formAction] = useFormState(action, null as ActionResult);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  // ── Legacy state (used when taxonomyNodes is empty) ──
  const [productType, setProductType] = useState(initialData?.productType ?? "");
  const [productCategory, setProductCategory] = useState(initialData?.productCategory ?? "");
  const [productSubcategory, setProductSubcategory] = useState(initialData?.productSubcategory ?? "");
  // ── DB taxonomy state (used when taxonomyNodes is provided) ──
  const [initIds] = useState(() => resolveInitialIds(taxonomyNodes, initialData));
  const [familyNodeId, setFamilyNodeId] = useState(initIds.familyId);
  const [categoryNodeId, setCategoryNodeId] = useState(initIds.categoryId);
  const [subcategoryNodeId, setSubcategoryNodeId] = useState(initIds.subcategoryId);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [teamRows, setTeamRows] = useState<Array<{ name: string; role: string }>>(() => {
    const t = initialData?.teamRows;
    return t && t.length > 0 ? t : [{ name: "", role: "" }];
  });
  const [teamMembersJson, setTeamMembersJson] = useState("[]");
  const [dimensions, setDimensions] = useState(initialData?.dimensions ?? "");
  const [year, setYear] = useState(initialData?.year ?? "");
  const [materialNodeIds, setMaterialNodeIds] = useState<string[]>(initialData?.materialNodeIds ?? []);
  const [materialNodeIdsJson, setMaterialNodeIdsJson] = useState(() => JSON.stringify(initialData?.materialNodeIds ?? []));
  const [facetValueIds, setFacetValueIds] = useState<string[]>(initialData?.facetValueIds ?? []);
  const [facetValueIdsJson, setFacetValueIdsJson] = useState(() => JSON.stringify(initialData?.facetValueIds ?? []));
  const [productStage, setProductStage] = useState(initialData?.productStage ?? "");
  const [productCollabStatus, setProductCollabStatus] = useState(initialData?.productCollaborationStatus ?? "");
  const [productLookingFor, setProductLookingFor] = useState<string[]>(initialData?.productLookingFor ?? []);
  const [productLookingForJson, setProductLookingForJson] = useState(() => JSON.stringify(initialData?.productLookingFor ?? []));

  useEffect(() => {
    if (formMode === "admin" || updateAction) return;
    const result = state as ActionResult;
    if (result?.error) return;
    const target = result?.slug ?? result?.id;
    if (target) router.replace(`/products/${target}`);
  }, [formMode, updateAction, state, router]);

  useEffect(() => {
    setTeamMembersJson(
      JSON.stringify(teamRows.filter((r) => r.name.trim() || r.role.trim()))
    );
  }, [teamRows]);

  useEffect(() => {
    setMaterialNodeIdsJson(JSON.stringify(materialNodeIds));
  }, [materialNodeIds]);
  useEffect(() => {
    setFacetValueIdsJson(JSON.stringify(facetValueIds));
  }, [facetValueIds]);
  useEffect(() => {
    setProductLookingForJson(JSON.stringify(productLookingFor));
  }, [productLookingFor]);

  const wordCount = useMemo(() => countWords(description), [description]);
  const descValid = wordCount >= MIN_DESC_WORDS;
  const galleryCount = imageFiles.length;
  const [primaryImagePreviewUrl, setPrimaryImagePreviewUrl] = useState<string | null>(null);
  const [categoryFadedIn, setCategoryFadedIn] = useState(false);
  const [subcategoryFadedIn, setSubcategoryFadedIn] = useState(false);
  const hasFamily = useDbTaxonomy ? familyNodeId !== "" : productType !== "";
  const hasCategory = useDbTaxonomy ? categoryNodeId !== "" : productCategory !== "";
  useEffect(() => {
    if (!hasFamily) {
      setCategoryFadedIn(false);
      return;
    }
    const raf = requestAnimationFrame(() => setCategoryFadedIn(true));
    return () => cancelAnimationFrame(raf);
  }, [hasFamily]);
  useEffect(() => {
    if (!hasCategory) {
      setSubcategoryFadedIn(false);
      return;
    }
    const raf = requestAnimationFrame(() => setSubcategoryFadedIn(true));
    return () => cancelAnimationFrame(raf);
  }, [hasCategory]);
  useEffect(() => {
    if (imageFiles.length === 0) {
      setPrimaryImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(imageFiles[0]);
    setPrimaryImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [imageFiles]);
  // ── DB taxonomy derived lists ──
  const dbFamilies = useMemo(
    () => taxonomyNodes.filter((n) => n.depth === 0),
    [taxonomyNodes]
  );
  const dbCategories = useMemo(
    () => (familyNodeId ? taxonomyNodes.filter((n) => n.depth === 1 && n.parent_id === familyNodeId) : []),
    [taxonomyNodes, familyNodeId]
  );
  const dbSubcategories = useMemo(
    () => (categoryNodeId ? taxonomyNodes.filter((n) => n.depth === 2 && n.parent_id === categoryNodeId) : []),
    [taxonomyNodes, categoryNodeId]
  );
  /** The deepest selected DB node — provides taxonomy_node_id + legacy field values. */
  const selectedNode = useMemo(() => {
    if (!useDbTaxonomy) return null;
    if (subcategoryNodeId) return taxonomyNodes.find((n) => n.id === subcategoryNodeId) ?? null;
    if (categoryNodeId) return taxonomyNodes.find((n) => n.id === categoryNodeId) ?? null;
    if (familyNodeId) return taxonomyNodes.find((n) => n.id === familyNodeId) ?? null;
    return null;
  }, [useDbTaxonomy, taxonomyNodes, familyNodeId, categoryNodeId, subcategoryNodeId]);

  // ── Legacy taxonomy derived lists (fallback) ──
  const categories = useMemo(
    () => (productType ? getCategoriesForType(productType) : []),
    [productType]
  );
  const subcategories = useMemo(
    () =>
      productType && productCategory
        ? getSubcategoriesForCategory(productType, productCategory)
        : [],
    [productType, productCategory]
  );

  // ── Validation (works for both modes) ──
  const hasSubcategory = useDbTaxonomy ? subcategoryNodeId !== "" : productSubcategory.trim() !== "";
  const hasType = useDbTaxonomy ? familyNodeId !== "" : productType.trim() !== "";
  const hasCategoryVal = useDbTaxonomy ? categoryNodeId !== "" : productCategory.trim() !== "";
  const canPublish =
    title.trim() !== "" && descValid && hasType && hasSubcategory;
  const canSave = title.trim() !== "" && hasType && hasSubcategory;

  const productProgressPercent = useMemo(() => {
    const done = [
      title.trim() !== "",
      hasType,
      hasCategoryVal,
      hasSubcategory,
      descValid,
    ].filter(Boolean).length;
    return Math.round((done / PRODUCT_REQUIRED_COUNT) * 100);
  }, [title, hasType, hasCategoryVal, hasSubcategory, descValid]);

  const addTeamRow = () => setTeamRows((r) => [...r, { name: "", role: "" }]);
  const updateTeamRow = (i: number, field: "name" | "role", value: string) => {
    setTeamRows((r) =>
      r.map((row, j) => (j === i ? { ...row, [field]: value } : row))
    );
  };
  const removeTeamRow = (i: number) => {
    setTeamRows((r) => {
      if (r.length <= 1) return [{ name: "", role: "" }];
      return r.filter((_, j) => j !== i);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    const form = formRef.current ?? e.currentTarget;
    const formData = new FormData(form);
    formData.delete("images");
    formData.delete("documents");
    imageFiles.forEach((f) => formData.append("images", f));
    documentFiles.forEach((f) => formData.append("documents", f));
    try {
      const result = await action(null, formData);
      if (result?.error) {
        setSubmitError(result.error);
      } else if (formMode !== "admin" && result && "slug" in result && result.slug) {
        router.push(`/products/${result.slug}`);
      }
    } catch (err) {
      const isRedirect =
        err instanceof Error && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
      if (isRedirect) throw err;
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    }
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-8"
    >
      <SubmissionProgressBar percent={productProgressPercent} className="mb-6" />
      <input type="hidden" name="team_members" value={teamMembersJson} />
      <input type="hidden" name="draft" value="0" id="product-draft-value" />
      <input type="hidden" name="product_material_ids" value="[]" />
      <input type="hidden" name="taxonomy_material_ids" value={materialNodeIdsJson} />
      <input type="hidden" name="facet_value_ids" value={facetValueIdsJson} />
      <input type="hidden" name="product_looking_for" value={productLookingForJson} />
      {/* Taxonomy: send node ID + legacy slugs derived from the selected node */}
      {useDbTaxonomy && (
        <>
          <input type="hidden" name="taxonomy_node_id" value={selectedNode?.id ?? ""} />
          <input type="hidden" name="product_type" value={selectedNode?.legacy_product_type ?? ""} />
          <input type="hidden" name="product_category" value={selectedNode?.legacy_product_category ?? ""} />
          <input type="hidden" name="product_subcategory" value={selectedNode?.legacy_product_subcategory ?? ""} />
        </>
      )}
      {initialData?.listingId && (
        <input type="hidden" name="_listingId" value={initialData.listingId} />
      )}

      {formMode === "admin" && ownerProfileOptions.length > 0 && !initialData && (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Owner</h2>
          <div>
            <label htmlFor="owner_profile_id" className={labelClass}>
              Owner profile <span className="text-archtivy-primary">*</span>
            </label>
            <select
              id="owner_profile_id"
              name="owner_profile_id"
              required
              className={inputClass}
            >
              <option value="">Select profile</option>
              {ownerProfileOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name?.trim() || p.username || p.id}
                  {p.username ? ` (@${p.username})` : ""}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      <AddListingLayout
        sidebar={
          <>
            {!initialData && (
              <GalleryUploadCard
                files={imageFiles}
                onChange={setImageFiles}
                minCount={0}
                inputName=""
              />
            )}
            <ListingPreviewCard
              title={title}
              imageUrl={primaryImagePreviewUrl}
            />
            <DocumentsUploadCard
              id="documents"
              files={documentFiles}
              onChange={setDocumentFiles}
            />
          </>
        }
        mobileActions={
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="secondary"
              className="flex-1"
              disabled={!canSave}
              onClick={() => {
                const el = document.getElementById("product-draft-value") as HTMLInputElement | null;
                if (el) el.value = "1";
              }}
            >
              Save draft
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={!canPublish}
              onClick={() => {
                const el = document.getElementById("product-draft-value") as HTMLInputElement | null;
                if (el) el.value = "0";
              }}
            >
              Publish
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
        {/* Section: Basics (title + Type → Category → Subcategory, same as tagging workstation) */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Basics</h2>
          <div>
            <label htmlFor="title" className={labelClass}>
              Product title <span className="text-archtivy-primary">*</span>
            </label>
            <input
              id="title"
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Product name"
            />
          </div>
          {useDbTaxonomy ? (
            <>
              {/* ── DB-backed taxonomy: Family → Category → Subcategory ── */}
              <div>
                <label htmlFor="taxonomy_family" className={labelClass}>
                  Product family <span className="text-archtivy-primary">*</span>
                </label>
                <select
                  id="taxonomy_family"
                  value={familyNodeId}
                  onChange={(e) => {
                    setFamilyNodeId(e.target.value);
                    setCategoryNodeId("");
                    setSubcategoryNodeId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Select family</option>
                  {dbFamilies.map((n) => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </div>

              {hasFamily && (
                <div className={`transition-opacity duration-200 ease-out ${categoryFadedIn ? "opacity-100" : "opacity-0"}`}>
                  <label htmlFor="taxonomy_category" className={labelClass}>
                    Product category <span className="text-archtivy-primary">*</span>
                  </label>
                  <select
                    id="taxonomy_category"
                    value={categoryNodeId}
                    onChange={(e) => {
                      setCategoryNodeId(e.target.value);
                      setSubcategoryNodeId("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select category</option>
                    {dbCategories.map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {hasCategory && (
                <div className={`transition-opacity duration-200 ease-out ${subcategoryFadedIn ? "opacity-100" : "opacity-0"}`}>
                  <label htmlFor="taxonomy_subcategory" className={labelClass}>
                    Product subcategory <span className="text-archtivy-primary">*</span>
                  </label>
                  <select
                    id="taxonomy_subcategory"
                    value={subcategoryNodeId}
                    onChange={(e) => setSubcategoryNodeId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select subcategory</option>
                    {dbSubcategories.map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                  {hasSubcategory && (
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      Required to save or publish. Use &quot;Other / Not specified&quot; only if none fit.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── Legacy static taxonomy fallback ── */}
              <div>
                <label htmlFor="product_type" className={labelClass}>
                  Product type <span className="text-archtivy-primary">*</span>
                </label>
                <select
                  id="product_type"
                  name="product_type"
                  required
                  value={productType}
                  onChange={(e) => {
                    setProductType(e.target.value);
                    setProductCategory("");
                    setProductSubcategory("");
                  }}
                  className={inputClass}
                >
                  <option value="">Select type</option>
                  {PRODUCT_TAXONOMY.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {productType && (
                <div className={`transition-opacity duration-200 ease-out ${categoryFadedIn ? "opacity-100" : "opacity-0"}`}>
                  <label htmlFor="product_category" className={labelClass}>
                    Product category <span className="text-archtivy-primary">*</span>
                  </label>
                  <select
                    id="product_category"
                    name="product_category"
                    required
                    value={productCategory}
                    onChange={(e) => {
                      setProductCategory(e.target.value);
                      setProductSubcategory("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {productCategory && (
                <div className={`transition-opacity duration-200 ease-out ${subcategoryFadedIn ? "opacity-100" : "opacity-0"}`}>
                  <label htmlFor="product_subcategory" className={labelClass}>
                    Product subcategory <span className="text-archtivy-primary">*</span>
                  </label>
                  <select
                    id="product_subcategory"
                    name="product_subcategory"
                    required
                    value={productSubcategory}
                    onChange={(e) => setProductSubcategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select subcategory</option>
                    {subcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  {hasSubcategory && (
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                      Required to save or publish. Use &quot;Other / Not specified&quot; only if none fit.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Section: Details */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Details</h2>
          <div>
            <label htmlFor="description" className={labelClass}>
              Description <span className="text-archtivy-primary">*</span> (min {MIN_DESC_WORDS} words)
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              required={!canPublish}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaClass}
              placeholder="Describe the product, materials, and use."
            />
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400" role="status" aria-live="polite">
              {wordCount} words
              {!descValid && wordCount > 0 && (
                <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                  — Use at least {MIN_DESC_WORDS} words to publish
                </span>
              )}
            </p>
          </div>
          <div>
            <label htmlFor="dimensions" className={labelClass}>
              Dimensions (optional)
            </label>
            <input
              id="dimensions"
              type="text"
              name="dimensions"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              className={inputClass}
              placeholder="e.g. 120 × 60 × 75 cm"
            />
          </div>
          <div>
            <label htmlFor="year" className={labelClass}>
              Year (optional)
            </label>
            <input
              id="year"
              type="text"
              name="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
              placeholder="e.g. 2024"
            />
          </div>
        </section>

        {/* Section: Advanced Filters (material taxonomy + facets) */}
        <AdvancedFiltersSection
          materialNodes={materialNodes ?? []}
          selectedMaterialNodeIds={materialNodeIds}
          onMaterialNodeIdsChange={setMaterialNodeIds}
          facets={facets ?? []}
          selectedFacetValueIds={facetValueIds}
          onFacetValueIdsChange={setFacetValueIds}
        />

        {/* Section: Product Stage & Collaboration */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Stage &amp; Collaboration</h2>
          <div>
            <label htmlFor="product_stage" className={labelClass}>
              Product stage
            </label>
            <select
              id="product_stage"
              name="product_stage"
              value={productStage}
              onChange={(e) => setProductStage(e.target.value)}
              className={inputClass}
            >
              <option value="">Select stage (optional)</option>
              {PRODUCT_STAGE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {PRODUCT_STAGE_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="product_collaboration_status" className={labelClass}>
              Collaboration status
            </label>
            <select
              id="product_collaboration_status"
              name="product_collaboration_status"
              value={productCollabStatus}
              onChange={(e) => setProductCollabStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">Select (optional)</option>
              {PRODUCT_COLLAB_VALUES.map((v) => (
                <option key={v} value={v}>
                  {PRODUCT_COLLAB_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
          {productCollabStatus && productCollabStatus !== "not_open_for_collaboration" && (
            <div>
              <label className={labelClass}>Looking for</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_LOOKING_FOR_OPTIONS.map((opt) => {
                  const checked = productLookingFor.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setProductLookingFor((prev) =>
                          checked ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        checked
                          ? "border-[#002abf] bg-[#002abf] text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Section: Connections */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Connections</h2>
          <TeamMembersField
            memberTitles={memberTitles}
            teamRows={teamRows}
            onAddRow={addTeamRow}
            onUpdateRow={updateTeamRow}
            onRemoveRow={removeTeamRow}
          />
        </section>

        {(submitError ?? state?.error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <ErrorMessage message={submitError ?? state?.error ?? ""} className="max-w-xl text-red-800 dark:text-red-200" />
          </div>
        )}
        </div>
      </AddListingLayout>
    </form>
  );
}
