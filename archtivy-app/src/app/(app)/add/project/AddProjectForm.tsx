"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/actions/types";
import { createProject } from "@/app/actions/createProject";
import { createAdminProjectFull } from "@/app/(admin)/admin/_actions/listings";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AddListingLayout } from "@/components/add/AddListingLayout";
import { GalleryUploadCard } from "@/components/add/GalleryUploadCard";
import { ListingPreviewCard } from "@/components/add/ListingPreviewCard";
import { DocumentsUploadCard } from "@/components/add/DocumentsUploadCard";
import { SubmissionProgressBar } from "@/components/add/SubmissionProgressBar";
import { LocationPicker, type LocationValue } from "@/components/location/LocationPicker";
import { PROJECT_CATEGORIES } from "@/lib/auth/config";
import { MaterialsMultiSelect } from "@/components/materials/MaterialsMultiSelect";
import type { MaterialRow } from "@/lib/db/materials";
import type { MemberTitleRow } from "./TeamMembersField";
import { TeamMembersField } from "./TeamMembersField";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const textareaClass =
  "w-full min-h-[120px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const sectionClass =
  "space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50";
const sectionTitleClass = "text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-1";

const MIN_DESC_WORDS = 300;
const MAX_DESC_WORDS = 500;
const MIN_GALLERY = 3;
const PROJECT_REQUIRED_COUNT = 7;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type OwnerProfileOption = { id: string; display_name: string | null; username: string | null };

export interface ProjectFormInitialData {
  listingId: string;
  title: string;
  description: string;
  locationValue: LocationValue | null;
  category: string;
  areaSqft: string;
  year: string;
  teamRows: Array<{ name: string; role: string }>;
  materialIds: string[];
  mentionedRows: Array<{ brand_name_text: string; product_name_text: string }>;
}

export function AddProjectForm({
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
  initialData?: ProjectFormInitialData;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const action = updateAction ?? (formMode === "admin" ? createAdminProjectFull : createProject);
  const [state, formAction] = useFormState(action, null as ActionResult);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [locationValue, setLocationValue] = useState<LocationValue | null>(initialData?.locationValue ?? null);
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [areaSqft, setAreaSqft] = useState(initialData?.areaSqft ?? "");
  const [year, setYear] = useState(initialData?.year ?? "");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [teamRows, setTeamRows] = useState<Array<{ name: string; role: string }>>(() => {
    const t = initialData?.teamRows;
    return t && t.length > 0 ? t : [{ name: "", role: "" }];
  });
  const [teamMembersJson, setTeamMembersJson] = useState("[]");
  const [materialIds, setMaterialIds] = useState<string[]>(initialData?.materialIds ?? []);
  const [materialIdsJson, setMaterialIdsJson] = useState("[]");
  const [mentionedRows, setMentionedRows] = useState<
    Array<{ brand_name_text: string; product_name_text: string }>
  >(() => {
    const m = initialData?.mentionedRows;
    return m && m.length > 0 ? m : [{ brand_name_text: "", product_name_text: "" }];
  });
  const [mentionedProductsJson, setMentionedProductsJson] = useState("[]");

  useEffect(() => {
    if (formMode === "admin" || updateAction) return;
    const result = state as ActionResult;
    const target = result?.slug ?? result?.id;
    if (target) router.push(`/projects/${target}`);
  }, [formMode, updateAction, state, router]);

  useEffect(() => {
    setTeamMembersJson(JSON.stringify(teamRows.filter((r) => r.name.trim() || r.role.trim())));
  }, [teamRows]);

  useEffect(() => {
    setMaterialIdsJson(JSON.stringify(materialIds));
  }, [materialIds]);

  useEffect(() => {
    setMentionedProductsJson(
      JSON.stringify(
        mentionedRows.filter(
          (r) => r.brand_name_text.trim() !== "" || r.product_name_text.trim() !== ""
        )
      )
    );
  }, [mentionedRows]);

  const wordCount = useMemo(() => countWords(description), [description]);
  const descValid = wordCount >= MIN_DESC_WORDS && wordCount <= MAX_DESC_WORDS;
  const galleryCount = imageFiles.length;
  const galleryValid = galleryCount >= MIN_GALLERY;
  const [primaryImagePreviewUrl, setPrimaryImagePreviewUrl] = useState<string | null>(null);
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
  const hasLocation = Boolean(locationValue?.location_text?.trim());
  const galleryRequired = !initialData;
  const canPublish =
    title.trim() !== "" &&
    descValid &&
    hasLocation &&
    category.trim() !== "" &&
    year.trim() !== "" &&
    (galleryRequired ? galleryValid : true);

  const projectProgressPercent = useMemo(() => {
    const done = [
      title.trim() !== "",
      category.trim() !== "",
      hasLocation,
      year.trim() !== "",
      areaSqft.trim() !== "" && !Number.isNaN(Number(areaSqft)) && Number(areaSqft) > 0,
      descValid,
      galleryRequired ? galleryValid : true,
    ].filter(Boolean).length;
    return Math.round((done / PROJECT_REQUIRED_COUNT) * 100);
  }, [title, category, hasLocation, year, areaSqft, descValid, galleryRequired, galleryValid]);

  const addTeamRow = () => setTeamRows((r) => [...r, { name: "", role: "" }]);
  const updateTeamRow = (i: number, field: "name" | "role", value: string) => {
    setTeamRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };
  const removeTeamRow = (i: number) => {
    setTeamRows((r) => {
      if (r.length <= 1) return [{ name: "", role: "" }];
      return r.filter((_, j) => j !== i);
    });
  };

  const addMentionedRow = () =>
    setMentionedRows((r) => [...r, { brand_name_text: "", product_name_text: "" }]);
  const updateMentionedRow = (
    i: number,
    field: "brand_name_text" | "product_name_text",
    value: string
  ) => {
    setMentionedRows((r) =>
      r.map((row, j) => (j === i ? { ...row, [field]: value } : row))
    );
  };
  const removeMentionedRow = (i: number) => {
    setMentionedRows((r) => {
      if (r.length <= 1) return [{ brand_name_text: "", product_name_text: "" }];
      return r.filter((_, j) => j !== i);
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    fd.delete("images");
    imageFiles.forEach((f) => fd.append("images", f));
    if (initialData?.listingId) fd.set("_listingId", initialData.listingId);
    formAction(fd);
  };

  const locationDisplay =
    locationValue?.location_text?.trim() ||
    (locationValue?.location_city && locationValue?.location_country
      ? `${locationValue.location_city}, ${locationValue.location_country}`
      : null);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-8"
    >
      <SubmissionProgressBar percent={projectProgressPercent} className="mb-6" />
      <input type="hidden" name="team_members" value={teamMembersJson} />
      <input type="hidden" name="draft" value="0" id="draft-value" />
      <input type="hidden" name="project_material_ids" value={materialIdsJson} />
      <input type="hidden" name="mentioned_products" value={mentionedProductsJson} />
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
              subtitle={locationDisplay}
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
              onClick={() => {
                const el = document.getElementById("draft-value") as HTMLInputElement | null;
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
                const el = document.getElementById("draft-value") as HTMLInputElement | null;
                if (el) el.value = "0";
              }}
            >
              Publish
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
        {/* Section: Basics */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Basics</h2>
          <div>
            <label htmlFor="title" className={labelClass}>
              Project title <span className="text-archtivy-primary">*</span>
            </label>
            <input
              id="title"
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Project name"
            />
          </div>
          <div>
            <label htmlFor="category" className={labelClass}>
              Category <span className="text-archtivy-primary">*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">Select category</option>
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Section: Location */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Location</h2>
          <LocationPicker
            namePrefix="location"
            value={locationValue}
            onChange={setLocationValue}
            required
          />
        </section>

        {/* Section: Details */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Details</h2>
          <div>
            <label htmlFor="description" className={labelClass}>
              Description <span className="text-archtivy-primary">*</span> ({MIN_DESC_WORDS}–{MAX_DESC_WORDS} words)
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaClass}
              placeholder="Describe the project, context, and outcomes."
            />
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400" role="status" aria-live="polite">
              {wordCount} words
              {!descValid && wordCount > 0 && (
                <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                  — Use between {MIN_DESC_WORDS} and {MAX_DESC_WORDS} words
                </span>
              )}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="area_sqft" className={labelClass}>
                Area (sqft) <span className="text-archtivy-primary">*</span>
              </label>
              <input
                id="area_sqft"
                type="number"
                name="area_sqft"
                required
                min={1}
                step={1}
                value={areaSqft}
                onChange={(e) => setAreaSqft(e.target.value)}
                className={inputClass}
                placeholder="e.g. 2500"
              />
            </div>
            <div>
              <label htmlFor="year" className={labelClass}>
                Year <span className="text-archtivy-primary">*</span>
              </label>
              <input
                id="year"
                type="text"
                name="year"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
                placeholder="e.g. 2024"
              />
            </div>
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

        {/* Section: Mentioned products (optional) */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Mentioned products (optional)</h2>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            List products mentioned in this project. Brand and product name only — no URLs.
          </p>
          {mentionedRows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-start gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <input
                type="text"
                placeholder="Brand name"
                value={row.brand_name_text}
                onChange={(e) => updateMentionedRow(i, "brand_name_text", e.target.value)}
                className="flex-1 min-w-[120px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <input
                type="text"
                placeholder="Product name"
                value={row.product_name_text}
                onChange={(e) => updateMentionedRow(i, "product_name_text", e.target.value)}
                className="flex-1 min-w-[120px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => removeMentionedRow(i)}
                className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMentionedRow}
            className="mt-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            + Add product
          </button>
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

        {state?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <ErrorMessage message={state.error} className="max-w-xl text-red-800 dark:text-red-200" />
          </div>
        )}
        </div>
      </AddListingLayout>
    </form>
  );
}
