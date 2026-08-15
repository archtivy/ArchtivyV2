"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Search, X, Plus, ExternalLink } from "lucide-react";
import { StepRail, WizardProgress, SaveIndicator, DeviceFrame, type WizardStepMeta } from "@/components/add/wizard/WizardChrome";
import { ImageDropzone } from "@/components/add/wizard/ImageDropzone";
import { computeSeoScore, countWords, SEO_THRESHOLDS } from "@/lib/publish/seoScore";
import type { UploadedGalleryItem } from "@/lib/storage/types";
import { createProject } from "@/app/actions/createProject";
import { HomeNav } from "@/components/home/HomeNav";

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
export interface MemberTitleOption {
  label: string;
}

interface TeamMemberDraft {
  name: string;
  title: string;
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
}: {
  categories: TaxonomyOption[];
  materials: MaterialOption[];
  products: ProductOption[];
  memberTitles: MemberTitleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // ── Form state ────────────────────────────────────────────────────────────
  const [images, setImages] = useState<UploadedGalleryItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taxonomyNodeId, setTaxonomyNodeId] = useState("");
  const [year, setYear] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [team, setTeam] = useState<TeamMemberDraft[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [locationText, setLocationText] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

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
      city.trim().length > 0 && country.trim().length > 0,
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
    fd.set("location", locationText || [city, country].filter(Boolean).join(", "));
    fd.set("location_text", locationText || [city, country].filter(Boolean).join(", "));
    fd.set("location_city", city);
    fd.set("location_country", country);
    fd.set("gallery", JSON.stringify(images));
    fd.set("team_members", JSON.stringify(team.filter((t) => t.name.trim())));
    fd.set("project_material_ids", JSON.stringify(materialIds));
    fd.set("mentioned_products", JSON.stringify(productIds));
    fd.set("meta_description", metaDescription);
    fd.set("website", website);
    fd.set("instagram", instagram);
    fd.set("video_url", videoUrl);
    fd.set("slug", slug);
    if (draft) fd.set("draft", "1");
    return fd;
  }

  function submit(draft: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await createProject({}, buildFormData(draft));
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(draft ? "/me/listings" : "/me/listings?published=1");
    });
  }

  const canPublish = title.trim().length > 0 && images.length > 0;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <HomeNav variant="solid" />
      <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-[104px] md:px-10 lg:px-14">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              New project
            </p>
            <h1 className="mt-2 font-display text-[34px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[42px]">
              Share your work.
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
              Save as draft
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
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Big Sur" /></Field>
                      <Field label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} placeholder="United States" /></Field>
                    </div>
                    <Field label="Full location" hint="Shown on the project page">
                      <input value={locationText} onChange={(e) => setLocationText(e.target.value)} className={inputCls} placeholder="Big Sur, California, United States" />
                    </Field>
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
                  />
                )}

                {step === 8 && (
                  <PublishStep seo={seo} canPublish={canPublish} pending={pending} onPublish={() => submit(false)} onDraft={() => submit(true)} />
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
      </div>
    </div>
  );
}

/* ── Small shared pieces ───────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-xl border border-hairline bg-cream px-4 py-3 font-body text-[15px] text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5 motion-reduce:transition-none";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 rounded-2xl border border-hairline bg-cream p-6 sm:p-8">{children}</div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-body text-[14px] text-ink">
          {label}
          {required && <span className="ml-1 text-muted">*</span>}
        </span>
        {hint && <span className="font-body text-[12px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function stepHeading(step: number): string {
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

function stepBlurb(step: number): string {
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

function TeamStep({
  team,
  setTeam,
  titles,
}: {
  team: TeamMemberDraft[];
  setTeam: (t: TeamMemberDraft[]) => void;
  titles: MemberTitleOption[];
}) {
  return (
    <div className="space-y-4">
      {team.map((m, i) => (
        <div key={i} className="flex items-end gap-3 rounded-2xl border border-hairline bg-cream p-4">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block font-body text-[12px] text-muted">Name</span>
            <input
              value={m.name}
              onChange={(e) => setTeam(team.map((t, idx) => (idx === i ? { ...t, name: e.target.value } : t)))}
              className={inputCls}
              placeholder="Studio or person"
            />
          </label>
          <label className="w-[38%] min-w-0">
            <span className="mb-1.5 block font-body text-[12px] text-muted">Role</span>
            <select
              value={m.title}
              onChange={(e) => setTeam(team.map((t, idx) => (idx === i ? { ...t, title: e.target.value } : t)))}
              className={inputCls}
            >
              <option value="">Role…</option>
              {titles.map((t) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setTeam(team.filter((_, idx) => idx !== i))}
            aria-label={`Remove ${m.name || "team member"}`}
            className="mb-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-stone/60 hover:text-ink"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setTeam([...team, { name: "", title: "" }])}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-ink/25 px-5 py-3 font-body text-[14px] text-ink transition-colors hover:bg-stone/40"
      >
        <Plus strokeWidth={1.5} className="h-4 w-4" /> Add team member
      </button>
    </div>
  );
}

/* ── Product / material picker ─────────────────────────────────────────── */

function PickerStep({
  kind,
  options,
  selected,
  onChange,
  placeholder,
  emptyHint,
}: {
  kind: "product" | "material";
  options: { id: string; label: string; sub: string | null; cover: string | null }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  emptyHint: string;
}) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return options
      .filter((o) => !selected.includes(o.id))
      .filter((o) => o.label.toLowerCase().includes(needle) || (o.sub ?? "").toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, options, selected]);

  const chosen = options.filter((o) => selected.includes(o.id));

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search strokeWidth={1.5} className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} pl-11`} placeholder={placeholder} />
      </div>

      {matches.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-hairline">
          {matches.map((o) => (
            <li key={o.id} className="border-b border-hairline last:border-0">
              <button
                type="button"
                onClick={() => { onChange([...selected, o.id]); setQ(""); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone/40"
              >
                {o.cover ? (
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone">
                    <Image src={o.cover} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                ) : (
                  <span className="h-10 w-10 shrink-0 rounded-lg bg-stone" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-[14px] text-ink">{o.label}</span>
                  {o.sub && <span className="block truncate font-body text-[12px] text-muted">{o.sub}</span>}
                </span>
                <Plus strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {chosen.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline px-5 py-8 text-center font-body text-[13px] text-muted">
          {emptyHint}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onChange(selected.filter((id) => id !== o.id))}
                className="inline-flex items-center gap-2 rounded-full bg-stone px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/70"
              >
                {o.label}
                <X strokeWidth={2} className="h-3 w-3" aria-hidden />
                <span className="sr-only">Remove {kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── SEO ───────────────────────────────────────────────────────────────── */

function SeoStep({
  slug,
  onSlug,
  metaDescription,
  onMeta,
  seo,
}: {
  slug: string;
  onSlug: (v: string) => void;
  metaDescription: string;
  onMeta: (v: string) => void;
  seo: ReturnType<typeof computeSeoScore>;
}) {
  const len = metaDescription.trim().length;
  const inBand = len >= SEO_THRESHOLDS.metaDescriptionMin && len <= SEO_THRESHOLDS.metaDescriptionMax;
  return (
    <div className="space-y-6">
      <Card>
        <Field label="URL" hint="Lowercase, hyphenated">
          <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-hairline bg-cream focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5">
            <span className="shrink-0 border-r border-hairline bg-stone/40 px-4 py-3 font-body text-[14px] text-muted">
              /projects/
            </span>
            <input
              value={slug}
              onChange={(e) => onSlug(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 font-body text-[15px] text-ink focus:outline-none"
              placeholder="cliff-house"
            />
          </div>
        </Field>
        <Field
          label="Meta description"
          required
          hint={`${len} / ${SEO_THRESHOLDS.metaDescriptionMin}–${SEO_THRESHOLDS.metaDescriptionMax}`}
        >
          <textarea
            value={metaDescription}
            onChange={(e) => onMeta(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="A one-sentence summary shown under your link in search results."
          />
          <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-stone">
            <span
              className={[
                "block h-full rounded-full transition-all duration-300 motion-reduce:transition-none",
                inBand ? "bg-ink" : "bg-muted/50",
              ].join(" ")}
              style={{ width: `${Math.min(100, (len / SEO_THRESHOLDS.metaDescriptionMax) * 100)}%` }}
            />
          </span>
        </Field>
      </Card>

      <div className="rounded-2xl border border-hairline p-6 sm:p-8">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-[20px] tracking-tight text-ink">Search readiness</h3>
          <span className="font-body text-[14px] tabular-nums text-muted">{seo.passed} of {seo.total}</span>
        </div>
        <ul className="mt-5 space-y-3.5">
          {seo.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <span
                className={[
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none",
                  c.passed ? "bg-ink text-cream" : "border border-hairline",
                ].join(" ")}
                aria-hidden
              >
                {c.passed && <Check strokeWidth={2.5} className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className={`block font-body text-[14px] ${c.passed ? "text-ink" : "text-muted"}`}>
                  {c.label}
                </span>
                {!c.passed && (
                  <span className="mt-0.5 block font-body text-[12px] leading-[18px] text-muted">{c.hint}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Publish ───────────────────────────────────────────────────────────── */

function PublishStep({
  seo,
  canPublish,
  pending,
  onPublish,
  onDraft,
}: {
  seo: ReturnType<typeof computeSeoScore>;
  canPublish: boolean;
  pending: boolean;
  onPublish: () => void;
  onDraft: () => void;
}) {
  const failing = seo.checks.filter((c) => !c.passed);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-cream p-6 sm:p-8">
        <h3 className="font-display text-[22px] tracking-tight text-ink">Before you publish</h3>
        {failing.length === 0 ? (
          <p className="mt-3 font-body text-[15px] leading-[24px] text-muted">
            Everything checks out. Your project will be visible and eligible for search results.
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-[24px] text-muted">
              {failing.length} {failing.length === 1 ? "item is" : "items are"} incomplete. You can
              still publish — the project will be live on Archtivy, just not indexed by search
              engines until these pass.
            </p>
            <ul className="mt-5 space-y-2">
              {failing.map((c) => (
                <li key={c.id} className="font-body text-[13px] text-muted">
                  · {c.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={pending || !canPublish}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-body text-[15px] text-cream transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none"
        >
          {pending ? "Publishing…" : "Publish project"}
          <ExternalLink strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDraft}
          disabled={pending}
          className="rounded-full border border-ink/25 px-6 py-3.5 font-body text-[15px] text-ink transition-all duration-150 hover:bg-stone/50 active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none"
        >
          Save as draft
        </button>
      </div>
      {!canPublish && (
        <p className="font-body text-[13px] text-muted">
          A title and at least one photo are needed to publish.
        </p>
      )}
    </div>
  );
}
