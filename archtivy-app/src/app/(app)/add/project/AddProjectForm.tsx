"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ActionResult } from "@/app/actions/types";
import { createProject } from "@/app/actions/createProject";
import { createAdminProjectFull } from "@/app/(admin)/admin/_actions/listings";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AddListingLayout } from "@/components/add/AddListingLayout";
import { CompletionChecklist, type ChecklistItem } from "@/components/add/CompletionChecklist";
import { LocationPicker, type LocationValue } from "@/components/location/LocationPicker";
import { PROJECT_CATEGORIES } from "@/lib/auth/config";
import type { BrandUsed } from "@/lib/types/listings";
import { MaterialsMultiSelect } from "@/components/materials/MaterialsMultiSelect";
import type { MaterialRow } from "@/lib/db/materials";
import type { MemberTitleRow } from "./TeamMembersField";
import { TeamMembersField } from "./TeamMembersField";

const inputClass =
  "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100";
const sectionClass =
  "space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50";
const sectionTitleClass = "text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-1";

const MIN_DESC_WORDS = 300;
const MAX_DESC_WORDS = 500;
const MIN_GALLERY = 3;

export interface BrandOption {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type OwnerProfileOption = { id: string; display_name: string | null; username: string | null };

export function AddProjectForm({
  brands,
  materials,
  memberTitles,
  formMode = "user",
  ownerProfileOptions = [],
}: {
  brands: BrandOption[];
  materials: MaterialRow[];
  memberTitles: MemberTitleRow[];
  formMode?: "user" | "admin";
  ownerProfileOptions?: OwnerProfileOption[];
}) {
  const router = useRouter();
  const action = formMode === "admin" ? createAdminProjectFull : createProject;
  const [state, formAction] = useFormState(action, null as ActionResult);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationValue, setLocationValue] = useState<LocationValue | null>(null);
  const [category, setCategory] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [year, setYear] = useState("");
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [teamRows, setTeamRows] = useState<Array<{ name: string; role: string }>>([]);
  const [selectedBrands, setSelectedBrands] = useState<BrandUsed[]>([]);
  const [teamMembersJson, setTeamMembersJson] = useState("[]");
  const [brandsUsedJson, setBrandsUsedJson] = useState("[]");
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [materialIdsJson, setMaterialIdsJson] = useState("[]");

  useEffect(() => {
    if (formMode === "admin") return;
    const result = state as ActionResult;
    const target = result?.slug ?? result?.id;
    if (target) router.push(`/projects/${target}`);
  }, [formMode, state, router]);

  useEffect(() => {
    setTeamMembersJson(JSON.stringify(teamRows.filter((r) => r.name.trim() || r.role.trim())));
  }, [teamRows]);

  useEffect(() => {
    setBrandsUsedJson(JSON.stringify(selectedBrands));
  }, [selectedBrands]);

  useEffect(() => {
    setMaterialIdsJson(JSON.stringify(materialIds));
  }, [materialIds]);

  const wordCount = useMemo(() => countWords(description), [description]);
  const descValid = wordCount >= MIN_DESC_WORDS && wordCount <= MAX_DESC_WORDS;
  const galleryCount = imageFiles ? imageFiles.length : 0;
  const galleryValid = galleryCount >= MIN_GALLERY;
  const hasLocation = Boolean(locationValue?.location_text?.trim());
  const canPublish =
    title.trim() !== "" &&
    descValid &&
    hasLocation &&
    category.trim() !== "" &&
    year.trim() !== "" &&
    galleryValid;

  const checklistItems: ChecklistItem[] = useMemo(
    () => [
      { id: "title", label: "Title", done: title.trim() !== "" },
      {
        id: "description",
        label: `Description (${MIN_DESC_WORDS}–${MAX_DESC_WORDS} words)`,
        done: descValid,
      },
      { id: "location", label: "Location", done: hasLocation },
      { id: "category", label: "Category", done: category.trim() !== "" },
      { id: "area", label: "Area & year", done: year.trim() !== "" },
      { id: "gallery", label: `Gallery (min ${MIN_GALLERY} images)`, done: galleryValid },
    ],
    [title, descValid, hasLocation, category, year, galleryValid]
  );

  const addTeamRow = () => setTeamRows((r) => [...r, { name: "", role: "" }]);
  const updateTeamRow = (i: number, field: "name" | "role", value: string) => {
    setTeamRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };
  const removeTeamRow = (i: number) => setTeamRows((r) => r.filter((_, j) => j !== i));

  const toggleBrand = (b: BrandOption) => {
    const name = b.display_name || b.username || "Brand";
    const logoUrl = b.avatar_url ?? undefined;
    setSelectedBrands((prev) => {
      const exists = prev.some((x) => x.name === name);
      if (exists) return prev.filter((x) => x.name !== name);
      return [...prev, { name, logo_url: logoUrl || null }];
    });
  };

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-8">
      <input type="hidden" name="team_members" value={teamMembersJson} />
      <input type="hidden" name="brands_used" value={brandsUsedJson} />
      <input type="hidden" name="draft" value="0" id="draft-value" />
      <input type="hidden" name="project_material_ids" value={materialIdsJson} />

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
        sidebar={
          <CompletionChecklist items={checklistItems} defaultCollapsed={false} />
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
              className={inputClass}
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
          {brands.length > 0 && (
            <div>
              <span className={labelClass}>Brands used (optional)</span>
              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                Select brands featured in this project.
              </p>
              <div className="flex flex-wrap gap-3">
                {brands.map((b) => {
                  const name = b.display_name || b.username || "Brand";
                  const selected = selectedBrands.some((x) => x.name === name);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBrand(b)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-archtivy-primary bg-archtivy-primary/10 dark:bg-archtivy-primary/20"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {b.avatar_url ? (
                        <Image
                          src={b.avatar_url}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-700">
                          {(name[0] ?? "?").toUpperCase()}
                        </span>
                      )}
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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

        {state?.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <ErrorMessage message={state.error} className="max-w-xl text-red-800 dark:text-red-200" />
          </div>
        )}
      </AddListingLayout>
    </form>
  );
}
