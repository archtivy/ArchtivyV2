"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Search, X, Plus, ExternalLink, MapPin } from "lucide-react";
import {
  StepRail,
  WizardFrame,
  WizardProgress,
  SaveIndicator,
  DeviceFrame,
  type WizardStepMeta,
} from "@/components/add/wizard/WizardChrome";
import { ImageDropzone } from "@/components/add/wizard/ImageDropzone";
import { computeSeoScore } from "@/lib/publish/seoScore";
import { countWords, SEO_THRESHOLDS } from "@/lib/publish/seoScore";
export type { MemberTitleOption } from "@/components/add/wizard/WizardPrimitives";
import {
  Card,
  Field,
  inputCls,
  TeamStep,
  OwnerField,
  PickerStep,
  SeoStep,
  PublishStep,
  type TeamMemberDraft,
  type MemberTitleOption,
} from "@/components/add/wizard/WizardPrimitives";
import type { UploadedGalleryItem } from "@/lib/storage/types";
import { createProject } from "@/app/actions/createProject";
import { updateProjectCanonical } from "@/app/actions/updateListing";
import type { ProjectEditData } from "@/lib/db/listingEdit";
import type { WizardAdminContext } from "@/components/add/wizard/adminContext";
import { LocationPicker, type LocationValue } from "@/components/location/LocationPicker";

/**
 * Unified Create/Publish wizard (Build Brief §2).
 *
 * NINE STEPS: Images, Information, Team, Products, Materials, Location, Links,
 * SEO & Settings, Preview & Publish.
 *
 * ── WHAT IS REUSED ──────────────────────────────────────────────────────────
 * The entire write path. This assembles the SAME FormData the old
 * /add/project form submitted, and posts it to the SAME createProject action —
 * so slug generation, uniqueness, taxonomy wiring, geo handling, team/material
 * persistence and rollback-on-failure are untouched. Only the surface is new.
 * The old form's dense, table-like styling is deliberately not carried over.
 *
 * ── DRAFT IS REAL NOW ───────────────────────────────────────────────────────
 * "Save as draft" posts draft=1, which createProject now writes as
 * status='DRAFT'. Previously that flag only relaxed validation and the row
 * still went in as APPROVED — so a "draft" was live and indexable. Drafts are
 * invisible to everyone but the owner and admins (guards in both detail routes).
 */

export interface TaxonomyOption {
  id: string;
  label: string;
  slugPath: string;
}
export interface MaterialOption {
  id: string;
  label: string;
}
export interface ProductOption {
  id: string;
  title: string;
  brand: string | null;
  cover: string | null;
}

const STEP_LABELS = [
  "Images",
  "Information",
  "Team",
  "Products",
  "Materials",
  "Location",
  "Links",
  "SEO & Settings",
  "Preview & Publish",
] as const;

function slugify(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function ProjectWizard({
  categories,
  materials,
  products,
  memberTitles,
  initial,
  initialStep,
  admin,
}: {
  categories: TaxonomyOption[];
  materials: MaterialOption[];
  products: ProductOption[];
  memberTitles: MemberTitleOption[];
  /**
   * Present only when editing. Its absence is what makes this a create form —
   * there is no separate `mode` prop to keep in sync with it.
   */
  initial?: ProjectEditData;
  /**
   * Step to open on. Set when a dashboard draft card deep-links to the exact
   * field it says is missing — landing on step 0 and making the author hunt
   * for it would undercut the point of naming the field.
   */
  initialStep?: number;
  /**
   * Present only in /admin. Same convention as `initial` — the wizard is in
   * admin context because it was handed what only an admin has, so a mode flag
   * and the data behind it cannot disagree. See adminContext.ts.
   */
  admin?: WizardAdminContext;
}) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(() =>
    initialStep != null && initialStep >= 0 && initialStep < STEP_LABELS.length ? initialStep : 0
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // ── Form state ────────────────────────────────────────────────────────────
  const [images, setImages] = useState<UploadedGalleryItem[]>(initial?.images ?? []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [taxonomyNodeId, setTaxonomyNodeId] = useState(initial?.taxonomyNodeId ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [areaSqft, setAreaSqft] = useState(
    initial?.areaSqft != null ? String(initial.areaSqft) : ""
  );
  const [team, setTeam] = useState<TeamMemberDraft[]>(
    // listings.team_members stores `role`; the draft shape calls it `title`.
    // Mapping back is what makes an edited project keep its credits instead of
    // showing an empty Team step.
    (initial?.teamMembers ?? []).map((m) => ({
      name: m.name ?? "",
      title: (m as { role?: string }).role ?? "",
      profileId: (m as { profile_id?: string | null }).profile_id ?? null,
    }))
  );
  const [productIds, setProductIds] = useState<string[]>(initial?.mentionedProducts ?? []);
  const [ownerProfileId, setOwnerProfileId] = useState(admin?.ownerProfileId ?? "");
  const [materialIds, setMaterialIds] = useState<string[]>(initial?.materialIds ?? []);
  /*
   * Real Mapbox-backed location. The first pass used three plain text inputs,
   * which produced no lat/lng — and createProject REQUIRES coordinates to
   * publish ("select a place from the location search so the project can appear
   * on Explore"), so a non-draft publish could never succeed from the wizard.
   * LocationPicker already exists, geocodes against Mapbox and reads both
   * NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN and NEXT_PUBLIC_MAPBOX_TOKEN.
   */
  const [location, setLocation] = useState<LocationValue | null>(
    initial
      ? {
          location_place_name: initial.locationText,
          location_city: initial.locationCity || null,
          location_country: initial.locationCountry || null,
          location_lat: initial.locationLat,
          location_lng: initial.locationLng,
          location_text: initial.locationText,
        }
      : null
  );
  const city = location?.location_city ?? "";
  const country = location?.location_country ?? "";
  const locationText = location?.location_text ?? "";
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  // An existing listing's slug is fixed, so it counts as "touched" from the
  // start — otherwise the title-sync effect below would rewrite the live URL
  // the moment the author corrected a typo in the name.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  // Slug tracks the title until the author edits it themselves.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  // ── Autosave indicator ────────────────────────────────────────────────────
  // Local-only for now: there is no draft row until the first submit, so this
  // reflects "your input is retained", not "persisted to the server". It is
  // deliberately quiet and never blocks. Wiring it to a real per-keystroke
  // draft row is a fast-follow, noted in the report.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const t1 = setTimeout(() => setSaveState("saved"), 500);
    const t2 = setTimeout(() => setSaveState("idle"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [title, description, images, team, productIds, materialIds, city, metaDescription]);

  const seo = useMemo(
    () =>
      computeSeoScore({
        title,
        metaDescription,
        slug,
        description,
        imageCount: images.length,
        imagesWithAlt: images.filter((i) => (i.alt ?? "").trim().length > 2).length,
        teamCount: team.length,
        productCount: productIds.length,
        materialCount: materialIds.length,
        city,
        country,
      }),
    [title, metaDescription, slug, description, images, team, productIds, materialIds, city, country]
  );

  const steps: WizardStepMeta[] = STEP_LABELS.map((label, i) => ({
    id: label,
    label,
    complete: [
      images.length > 0,
      title.trim().length > 0 && description.trim().length > 0,
      team.length > 0,
      productIds.length > 0,
      materialIds.length > 0,
      location?.location_lat != null && location?.location_lng != null,
      Boolean(website || instagram || videoUrl),
      seo.checks.find((c) => c.id === "meta")?.passed ?? false,
      false,
    ][i],
  }));

  const go = (next: number) => {
    if (next < 0 || next >= STEP_LABELS.length) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function buildFormData(draft: boolean): FormData {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("taxonomy_node_id", taxonomyNodeId);
    fd.set("year", year);
    if (areaSqft) fd.set("area_sqft", areaSqft);
    const locText = locationText || location?.location_place_name || [city, country].filter(Boolean).join(", ");
    fd.set("location", locText);
    fd.set("location_text", locText);
    fd.set("location_city", city);
    fd.set("location_country", country);
    fd.set("location_place_name", location?.location_place_name ?? "");
    // Required by createProject for a non-draft publish.
    if (location?.location_lat != null) fd.set("location_lat", String(location.location_lat));
    if (location?.location_lng != null) fd.set("location_lng", String(location.location_lng));
    fd.set("gallery", JSON.stringify(images));
    // Map title -> role. parseTeamMembers() validates `role`, and the draft
    // field is called `title`, so serialising the draft as-is meant every
    // credit failed that check and was silently discarded on publish.
    fd.set(
      "team_members",
      JSON.stringify(
        team
          .filter((t) => t.name.trim())
          .map((t) => ({
            name: t.name.trim(),
            role: t.title ?? "",
            profile_id: t.profileId ?? null,
          }))
      )
    );
    fd.set("project_material_ids", JSON.stringify(materialIds));
    // Picked products go as ids; any free-text mentions the admin form allowed
    // ride along unchanged so an edit does not silently delete them. Both
    // shapes normalise server-side — see lib/listings/mentionedProducts.ts.
    fd.set(
      "mentioned_products",
      JSON.stringify([...productIds, ...(admin?.mentionedFreeText ?? [])])
    );
    fd.set("meta_description", metaDescription);
    fd.set("website", website);
    fd.set("instagram", instagram);
    fd.set("video_url", videoUrl);
    fd.set("slug", slug);
    if (draft) fd.set("draft", "1");
    if (admin) fd.set("owner_profile_id", ownerProfileId);
    return fd;
  }

  function submit(draft: boolean) {
    setError(null);
    startTransition(async () => {
      // Editing never changes status — the update actions ignore `draft`
      // entirely and keep whatever the listing already was. A draft stays a
      // draft; a published project is not silently unpublished.
      const fd = buildFormData(draft);
      const result = admin
        ? initial
          ? await admin.onUpdate(initial.id, fd)
          : await admin.onCreate(fd)
        : initial
          ? await updateProjectCanonical(initial.id, fd)
          : await createProject({}, fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      // The admin actions redirect server-side on success, so this only runs
      // when they returned without redirecting.
      if (admin) {
        router.push(admin.returnTo);
        router.refresh();
        return;
      }
      if (initial) {
        router.push("/me/listings?updated=1");
        router.refresh();
        return;
      }
      router.push(draft ? "/me/listings" : "/me/listings?published=1");
    });
  }

  // In admin context an owner is mandatory: createAdminProjectFull rejects a
  // submission without one, and a listing with no owner is invisible in
  // /me/listings and unattributed publicly.
  const canPublish =
    title.trim().length > 0 && images.length > 0 && (!admin || Boolean(ownerProfileId));

  return (
    <WizardFrame bare={Boolean(admin)}>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
            {isEdit
              ? initial?.status === "DRAFT"
                ? "Editing draft"
                : "Editing project"
              : "New project"}
          </p>
          <h1 className="mt-2 font-display text-[34px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[42px]">
            {isEdit ? title.trim() || "Edit project." : "Share your work."}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <SaveIndicator state={saveState} />
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending || !title.trim()}
            className="rounded-full border border-ink/25 px-5 py-2.5 font-body text-[14px] text-ink transition-all duration-150 hover:bg-stone/50 active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none"
          >
            {/* In edit mode both buttons run the same update and neither
                changes status, so "Save as draft" would be a lie on a
                published project. */}
            {isEdit ? "Save changes" : "Save as draft"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        {/* ── Rail ─────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-[104px] lg:space-y-8">
            <WizardProgress steps={steps} />
            <StepRail steps={steps} current={step} onGo={go} />
          </div>
        </aside>

        {/* ── Step body ────────────────────────────────────────────────── */}
        <main className="min-w-0 lg:col-span-6">
          <div
            key={step}
            className={[
              "motion-reduce:animate-none",
              direction === 1 ? "animate-[wizardInRight_320ms_ease-out]" : "animate-[wizardInLeft_320ms_ease-out]",
            ].join(" ")}
          >
            <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              Step {step + 1} of {STEP_LABELS.length}
            </p>
            <h2 className="mt-2 font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink">
              {stepHeading(step)}
            </h2>
            <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[24px] text-muted">
              {stepBlurb(step)}
            </p>

            <div className="mt-8">
              {step === 0 && <ImageDropzone items={images} onChange={setImages} />}

              {step === 1 && (
                <Card>
                  {admin && (
                    <OwnerField
                      kind="project"
                      options={admin.ownerOptions}
                      value={ownerProfileId}
                      onChange={setOwnerProfileId}
                    />
                  )}
                  <Field label="Project title" required>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Cliff House" />
                  </Field>
                  <Field label="Category">
                    <select value={taxonomyNodeId} onChange={(e) => setTaxonomyNodeId(e.target.value)} className={inputCls}>
                      <option value="">Choose a category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-5">
                    <Field label="Completion year">
                      <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" className={inputCls} placeholder="2024" />
                    </Field>
                    <Field label="Floor area (ft²)">
                      <input value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} inputMode="numeric" className={inputCls} placeholder="4520" />
                    </Field>
                  </div>
                  <Field
                    label="Description"
                    hint={`${countWords(description)} words · ${SEO_THRESHOLDS.minDescriptionWords} recommended`}
                  >
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={9} className={`${inputCls} leading-[24px]`} placeholder="Tell the story of the project…" />
                  </Field>
                </Card>
              )}

              {step === 2 && (
                <TeamStep team={team} setTeam={setTeam} titles={memberTitles} />
              )}

              {step === 3 && (
                <PickerStep
                  kind="product"
                  options={products.map((p) => ({ id: p.id, label: p.title, sub: p.brand, cover: p.cover }))}
                  selected={productIds}
                  onChange={setProductIds}
                  placeholder="Search products by name or brand…"
                  emptyHint="No products tagged yet."
                  footnote="Once published, you’ll be able to tag exactly where each product appears in your photos."
                />
              )}

              {step === 4 && (
                <PickerStep
                  kind="material"
                  options={materials.map((m) => ({ id: m.id, label: m.label, sub: null, cover: null }))}
                  selected={materialIds}
                  onChange={setMaterialIds}
                  placeholder="Search materials…"
                  emptyHint="No materials tagged yet."
                />
              )}

              {step === 5 && (
                <Card>
                  <LocationPicker namePrefix="location" value={location} onChange={setLocation} required />
                  {location?.location_lat == null && (
                    <p className="font-body text-[13px] text-muted">
                      Search for the address and pick a result — the coordinates are what put
                      your project on the map and in nearby searches.
                    </p>
                  )}
                </Card>
              )}

              {step === 6 && (
                <Card>
                  <Field label="Project website"><input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://example.com" /></Field>
                  <Field label="Instagram" hint="Just the handle — we build the link">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-body text-[15px] text-muted">@</span>
                      <input value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/^@/, "").toLowerCase())} className={`${inputCls} pl-9`} placeholder="studioname" />
                    </div>
                  </Field>
                  <Field label="Video" hint="YouTube or Vimeo"><input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputCls} placeholder="https://vimeo.com/123456789" /></Field>
                </Card>
              )}

              {step === 7 && (
                <SeoStep
                  slug={slug}
                  onSlug={(v) => { setSlugTouched(true); setSlug(slugify(v)); }}
                  metaDescription={metaDescription}
                  onMeta={setMetaDescription}
                  seo={seo}
                  /* Locked when editing: the slug is the live URL and
                     updateProjectCanonical never changes it. */
                  slugReadOnly={isEdit}
                  note={
                    isEdit
                      ? "The URL is fixed once a project exists — changing it would break every link already pointing here."
                      : undefined
                  }
                />
              )}

              {step === 8 && (
                <PublishStep
                  seo={seo}
                  canPublish={canPublish}
                  pending={pending}
                  onPublish={() => submit(false)}
                  onDraft={() => submit(true)}
                  isEdit={isEdit}
                  publishNote={
                    isEdit
                      ? "Saving updates the project in place. Its published state doesn’t change."
                      : undefined
                  }
                />
              )}
            </div>

            {error && (
              <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-body text-[14px] text-red-700">
                {error}
              </p>
            )}

            {/* ── One clear action per screen ───────────────────────────── */}
            <div className="mt-10 flex items-center justify-between border-t border-hairline pt-6">
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-body text-[14px] text-muted transition-colors hover:text-ink disabled:opacity-0"
              >
                <ArrowLeft strokeWidth={1.5} className="h-4 w-4" /> Back
              </button>
              {step < STEP_LABELS.length - 1 && (
                <button
                  type="button"
                  onClick={() => go(step + 1)}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-body text-[15px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none"
                >
                  Continue <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── Live preview ─────────────────────────────────────────────── */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-[104px]">
            <p className="mb-3 font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              Live preview
            </p>
            <DeviceFrame url={`archtivy.com/projects/${slug || "your-project"}`}>
              <div className="overflow-hidden rounded-lg">
                <div className="relative aspect-[4/3] w-full bg-stone">
                  {images[0] && (
                    <Image src={images[0].url} alt="" fill sizes="320px" className="object-cover" />
                  )}
                </div>
                <div className="pt-3">
                  <p className="font-display text-[17px] leading-[1.2] tracking-tight text-ink">
                    {title.trim() || "Your project title"}
                  </p>
                  {[city, country].filter(Boolean).length > 0 && (
                    <p className="mt-1 font-body text-[12px] text-muted">
                      {[city, country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {description.trim() && (
                    <p className="mt-2 line-clamp-3 font-body text-[12px] leading-[18px] text-muted">
                      {description.trim()}
                    </p>
                  )}
                </div>
              </div>
            </DeviceFrame>

            <div className="mt-5 rounded-xl border border-hairline p-4">
              <div className="flex items-center justify-between">
                <span className="font-body text-[13px] text-ink">Search readiness</span>
                <span className="font-body text-[13px] tabular-nums text-muted">
                  {seo.passed}/{seo.total}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone">
                <div
                  className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${seo.percent}%` }}
                />
              </div>
              <p className="mt-2.5 font-body text-[12px] leading-[17px] text-muted">
                {seo.isIndexable
                  ? "Ready to appear in search results."
                  : "Publishes fine — but won’t be indexed until every check passes."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </WizardFrame>
  );
}

export function stepHeading(step: number): string {
  return [
    "Add your photos",
    "Tell us about the project",
    "Who worked on it?",
    "Products used",
    "Materials",
    "Where is it?",
    "Links",
    "How it appears in search",
    "Review and publish",
  ][step];
}

export function stepBlurb(step: number): string {
  return [
    "Drag them in. The first photo becomes your cover — you can reorder any time.",
    "The title and description are what people read first, and what search engines index.",
    "Credit the architects, engineers, photographers and consultants. Each becomes a link.",
    "Tag the products specified in this project. Each tag connects your project to that product’s page.",
    "Tag the materials used. These power the material filters across the platform.",
    "Location strengthens your project’s structured data and helps people find work near them.",
    "Optional, but they give readers somewhere to go next.",
    "These fields decide how your project looks in Google — and whether it’s indexed at all.",
    "One last look before it goes live.",
  ][step];
}

/* ── Team ──────────────────────────────────────────────────────────────── */

