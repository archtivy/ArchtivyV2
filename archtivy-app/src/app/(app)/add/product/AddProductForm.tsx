"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions/types";
import { createProductCanonical } from "@/app/actions/listings";
import { createAdminProductFull } from "@/app/(admin)/admin/_actions/listings";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AddListingLayout } from "@/components/add/AddListingLayout";
import { CompletionChecklist, type ChecklistItem } from "@/components/add/CompletionChecklist";
import {
  PRODUCT_TAXONOMY,
  getCategoriesForType,
  getSubcategoriesForCategory,
} from "@/lib/taxonomy/productTaxonomy";
import { MaterialsMultiSelect } from "@/components/materials/MaterialsMultiSelect";
import type { MaterialRow } from "@/lib/db/materials";
import type { MemberTitleRow } from "../project/TeamMembersField";
import { TeamMembersField } from "../project/TeamMembersField";

const inputClass =
  "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100";
const sectionClass =
  "space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50";
const sectionTitleClass =
  "text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-1";

const MIN_DESC_WORDS = 200;
const MIN_GALLERY = 3;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type OwnerProfileOption = { id: string; display_name: string | null; username: string | null };

export function AddProductForm({
  materials,
  memberTitles,
  formMode = "user",
  ownerProfileOptions = [],
}: {
  materials: MaterialRow[];
  memberTitles: MemberTitleRow[];
  formMode?: "user" | "admin";
  ownerProfileOptions?: OwnerProfileOption[];
}) {
  const router = useRouter();
  const action = formMode === "admin" ? createAdminProductFull : createProductCanonical;
  const [state, formAction] = useFormState(action, null as ActionResult);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productSubcategory, setProductSubcategory] = useState("");
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [teamRows, setTeamRows] = useState<Array<{ name: string; role: string }>>([]);
  const [teamMembersJson, setTeamMembersJson] = useState("[]");
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [materialIdsJson, setMaterialIdsJson] = useState("[]");

  useEffect(() => {
    if (formMode === "admin") return;
    const result = state as ActionResult;
    if (result?.slug) router.push(`/products/${result.slug}`);
  }, [formMode, state, router]);

  useEffect(() => {
    setTeamMembersJson(
      JSON.stringify(teamRows.filter((r) => r.name.trim() || r.role.trim()))
    );
  }, [teamRows]);

  useEffect(() => {
    setMaterialIdsJson(JSON.stringify(materialIds));
  }, [materialIds]);

  const wordCount = useMemo(() => countWords(description), [description]);
  const descValid = wordCount >= MIN_DESC_WORDS;
  const galleryCount = imageFiles ? imageFiles.length : 0;
  const galleryValid = galleryCount >= MIN_GALLERY;
  const subcategoryValid = productSubcategory.trim() !== "";
  const canPublish =
    title.trim() !== "" &&
    descValid &&
    productType.trim() !== "" &&
    subcategoryValid &&
    galleryValid;
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

  const checklistItems: ChecklistItem[] = useMemo(
    () => [
      { id: "title", label: "Title", done: title.trim() !== "" },
      {
        id: "description",
        label: `Description (min ${MIN_DESC_WORDS} words)`,
        done: descValid,
      },
      { id: "product_type", label: "Product type", done: productType.trim() !== "" },
      { id: "product_category", label: "Product category", done: productCategory.trim() !== "" },
      { id: "product_subcategory", label: "Product subcategory (required)", done: subcategoryValid },
      { id: "gallery", label: `Gallery (min ${MIN_GALLERY} images)`, done: galleryValid },
    ],
    [title, descValid, productType, productCategory, subcategoryValid, galleryValid]
  );

  const addTeamRow = () => setTeamRows((r) => [...r, { name: "", role: "" }]);
  const updateTeamRow = (i: number, field: "name" | "role", value: string) => {
    setTeamRows((r) =>
      r.map((row, j) => (j === i ? { ...row, [field]: value } : row))
    );
  };
  const removeTeamRow = (i: number) =>
    setTeamRows((r) => r.filter((_, j) => j !== i));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    const formData = new FormData(e.currentTarget);
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
    <form action={formAction} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">
      <input type="hidden" name="team_members" value={teamMembersJson} />
      <input type="hidden" name="draft" value="0" id="product-draft-value" />
      <input type="hidden" name="product_material_ids" value={materialIdsJson} />

      {formMode === "admin" && ownerProfileOptions.length > 0 && (
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
        sidebar={<CompletionChecklist items={checklistItems} defaultCollapsed={false} />}
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
        {/* Section: Basics */}
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
          <div>
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
              disabled={!productType}
              className={inputClass}
              aria-describedby={!productType ? "product_category_hint" : undefined}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {!productType && (
              <p id="product_category_hint" className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Select a product type first.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="product_subcategory" className={labelClass}>
              Product subcategory <span className="text-archtivy-primary">*</span>
            </label>
            <select
              id="product_subcategory"
              name="product_subcategory"
              required
              value={productSubcategory}
              onChange={(e) => setProductSubcategory(e.target.value)}
              disabled={!productCategory}
              className={inputClass}
              aria-describedby={!productCategory ? "product_subcategory_hint" : undefined}
            >
              <option value="">Select subcategory</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {!productCategory && (
              <p id="product_subcategory_hint" className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Select a category first.
              </p>
            )}
            {subcategoryValid && (
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Required to save or publish. Use &quot;Other / Not specified&quot; only if none fit.
              </p>
            )}
          </div>
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
              className={inputClass}
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
            <label htmlFor="feature_highlight" className={labelClass}>
              Feature highlight (optional)
            </label>
            <input
              id="feature_highlight"
              type="text"
              name="feature_highlight"
              className={inputClass}
              placeholder="One key feature"
            />
          </div>
          <div>
            <label htmlFor="dimensions" className={labelClass}>
              Dimensions (optional)
            </label>
            <input
              id="dimensions"
              type="text"
              name="dimensions"
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
        </section>

        {/* Section: Media */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Media</h2>
          <div>
            <label htmlFor="images" className={labelClass}>
              Gallery images <span className="text-archtivy-primary">*</span> (min {MIN_GALLERY})
            </label>
            <input
              id="images"
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              required={!canPublish}
              className={inputClass}
              aria-describedby="images-hint"
              onChange={(e) => setImageFiles(e.target.files)}
            />
            <p id="images-hint" className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {galleryCount} selected. JPEG, PNG, WebP or GIF, max 5MB each. First image is the cover.
              {!galleryValid && galleryCount > 0 && (
                <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                  — Add at least {MIN_GALLERY} images to publish
                </span>
              )}
            </p>
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
          <div>
            <label htmlFor="documents" className={labelClass}>
              Files / documents (optional)
            </label>
            <input
              id="documents"
              type="file"
              name="documents"
              accept=".pdf,.docx,.pptx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip"
              multiple
              className={inputClass}
              aria-describedby="documents-hint"
            />
            <p id="documents-hint" className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              PDF, DOCX, PPTX or ZIP. Max 20MB each.
            </p>
          </div>
        </section>

        {(submitError ?? state?.error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <ErrorMessage message={submitError ?? state?.error ?? ""} className="max-w-xl text-red-800 dark:text-red-200" />
          </div>
        )}
      </AddListingLayout>
    </form>
  );
}
