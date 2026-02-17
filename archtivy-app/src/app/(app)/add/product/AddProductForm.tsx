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
import { COLOR_OPTIONS, getColorSwatch } from "@/lib/colors";
import { MaterialsMultiSelect } from "@/components/materials/MaterialsMultiSelect";
import type { MaterialRow } from "@/lib/db/materials";
import type { MemberTitleRow } from "../project/TeamMembersField";
import { TeamMembersField } from "../project/TeamMembersField";

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
const MIN_GALLERY = 3;
const PRODUCT_REQUIRED_COUNT = 6;

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
  dimensions: string;
  year: string;
  teamRows: Array<{ name: string; role: string }>;
  materialIds: string[];
  /** Color options for filtering and tag suggestions. Default []. */
  colorOptions?: string[];
}

export function AddProductForm({
  materials,
  memberTitles,
  formMode = "user",
  ownerProfileOptions = [],
  initialData,
  updateAction,
}: {
  materials: MaterialRow[];
  memberTitles: MemberTitleRow[];
  formMode?: "user" | "admin";
  ownerProfileOptions?: OwnerProfileOption[];
  initialData?: ProductFormInitialData;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const action = updateAction ?? (formMode === "admin" ? createAdminProductFull : createProductCanonical);
  const [state, formAction] = useFormState(action, null as ActionResult);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [productType, setProductType] = useState(initialData?.productType ?? "");
  const [productCategory, setProductCategory] = useState(initialData?.productCategory ?? "");
  const [productSubcategory, setProductSubcategory] = useState(initialData?.productSubcategory ?? "");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [teamRows, setTeamRows] = useState<Array<{ name: string; role: string }>>(() => {
    const t = initialData?.teamRows;
    return t && t.length > 0 ? t : [{ name: "", role: "" }];
  });
  const [teamMembersJson, setTeamMembersJson] = useState("[]");
  const [materialIds, setMaterialIds] = useState<string[]>(initialData?.materialIds ?? []);
  const [materialIdsJson, setMaterialIdsJson] = useState("[]");
  const [colorOptions, setColorOptions] = useState<string[]>(initialData?.colorOptions ?? []);
  const [colorOptionsJson, setColorOptionsJson] = useState("[]");
  const [dimensions, setDimensions] = useState(initialData?.dimensions ?? "");
  const [year, setYear] = useState(initialData?.year ?? "");

  useEffect(() => {
    if (formMode === "admin" || updateAction) return;
    const result = state as ActionResult;
    if (result?.slug) router.push(`/products/${result.slug}`);
  }, [formMode, updateAction, state, router]);

  useEffect(() => {
    setTeamMembersJson(
      JSON.stringify(teamRows.filter((r) => r.name.trim() || r.role.trim()))
    );
  }, [teamRows]);

  useEffect(() => {
    setMaterialIdsJson(JSON.stringify(materialIds));
  }, [materialIds]);
  useEffect(() => {
    setColorOptionsJson(JSON.stringify(colorOptions));
  }, [colorOptions]);

  const wordCount = useMemo(() => countWords(description), [description]);
  const descValid = wordCount >= MIN_DESC_WORDS;
  const galleryCount = imageFiles.length;
  const galleryValid = galleryCount >= MIN_GALLERY;
  const [primaryImagePreviewUrl, setPrimaryImagePreviewUrl] = useState<string | null>(null);
  const [categoryFadedIn, setCategoryFadedIn] = useState(false);
  const [subcategoryFadedIn, setSubcategoryFadedIn] = useState(false);
  useEffect(() => {
    if (!productType) {
      setCategoryFadedIn(false);
      return;
    }
    const raf = requestAnimationFrame(() => setCategoryFadedIn(true));
    return () => cancelAnimationFrame(raf);
  }, [productType]);
  useEffect(() => {
    if (!productCategory) {
      setSubcategoryFadedIn(false);
      return;
    }
    const raf = requestAnimationFrame(() => setSubcategoryFadedIn(true));
    return () => cancelAnimationFrame(raf);
  }, [productCategory]);
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
  const subcategoryValid = productSubcategory.trim() !== "";
  const galleryRequired = !initialData;
  const canPublish =
    title.trim() !== "" &&
    descValid &&
    productType.trim() !== "" &&
    subcategoryValid &&
    (galleryRequired ? galleryValid : true);
  const canSave = title.trim() !== "" && productType.trim() !== "" && subcategoryValid;

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

  const productProgressPercent = useMemo(() => {
    const done = [
      title.trim() !== "",
      productType.trim() !== "",
      productCategory.trim() !== "",
      productSubcategory.trim() !== "",
      descValid,
      galleryRequired ? galleryValid : true,
    ].filter(Boolean).length;
    return Math.round((done / PRODUCT_REQUIRED_COUNT) * 100);
  }, [title, productType, productCategory, productSubcategory, descValid, galleryRequired, galleryValid]);

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
    imageFiles.forEach((f) => formData.append("images", f));
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
      <input type="hidden" name="product_material_ids" value={materialIdsJson} />
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
            <GalleryUploadCard
              files={imageFiles}
              onChange={setImageFiles}
              minCount={MIN_GALLERY}
              inputName=""
            />
            <ListingPreviewCard
              title={title}
              imageUrl={primaryImagePreviewUrl}
            />
            <DocumentsUploadCard id="documents" name="documents" />
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
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {productType && (
            <div
              className={`transition-opacity duration-200 ease-out ${categoryFadedIn ? "opacity-100" : "opacity-0"}`}
            >
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
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {productCategory && (
            <div
              className={`transition-opacity duration-200 ease-out ${subcategoryFadedIn ? "opacity-100" : "opacity-0"}`}
            >
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
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {subcategoryValid && (
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Required to save or publish. Use &quot;Other / Not specified&quot; only if none fit.
                </p>
              )}
            </div>
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
          <div>
            <MaterialsMultiSelect
              label="Materials"
              placeholder="Search materials"
              options={materials}
              selectedIds={materialIds}
              onChange={setMaterialIds}
            />
          </div>
          <div>
            <label className={labelClass}>Color options</label>
            <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">Select colors for filtering and tag suggestions.</p>
            <input type="hidden" name="color_options" value={colorOptionsJson} />
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setColorOptions((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-archtivy-primary ${
                    colorOptions.includes(c)
                      ? "border-archtivy-primary bg-archtivy-primary/10 text-archtivy-primary"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: getColorSwatch(c) }}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>
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
