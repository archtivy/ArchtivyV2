"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Plus } from "lucide-react";
import { HomeNav } from "@/components/home/HomeNav";
import {
  StepRail,
  WizardProgress,
  SaveIndicator,
  DeviceFrame,
  type WizardStepMeta,
} from "@/components/add/wizard/WizardChrome";
import { ImageDropzone } from "@/components/add/wizard/ImageDropzone";
import {
  Card,
  Field,
  inputCls,
  PickerStep,
  SeoStep,
  PublishStep,
} from "@/components/add/wizard/WizardPrimitives";
import { computeSeoScore, countWords, SEO_THRESHOLDS } from "@/lib/publish/seoScore";
import type { UploadedGalleryItem } from "@/lib/storage/types";
import { createProductCanonical } from "@/app/actions/listings";
import { updateProductCanonical } from "@/app/actions/updateListing";
import type { ProductEditData } from "@/lib/db/listingEdit";

/**
 * Product publish wizard — the product-side twin of ProjectWizard.
 *
 * ── STEPS, ADAPTED TO THE REAL MODEL ────────────────────────────────────────
 * Images · Information · Details · Materials · Links · SEO & Settings · Publish
 *
 * The brief suggested a "Brand / Manufacturer" step. There is nothing to pick:
 * `createProductCanonical` sets owner_profile_id from the signed-in profile, so
 * the brand IS the submitter. A step asking them to choose it would be a
 * decorative select with one correct answer. The brand is shown as confirmed
 * context on the Information step instead, and the slot is spent on Details —
 * colour options, which is a real column (`products.color_options`) the old
 * form supported and which 2 of 76 products actually use.
 *
 * Everything else is shared with the project flow through WizardPrimitives, so
 * the two cannot drift apart.
 *
 * ── WRITE PATH IS UNCHANGED ─────────────────────────────────────────────────
 * Posts the same FormData to createProductCanonical, which calls the
 * create_product_with_sidecar RPC — so the listings+products sidecar stay
 * atomic and colour options are still set inside the same transaction.
 */

export interface ProductTaxonomyOption {
  id: string;
  label: string;
}
export interface ProductMaterialOption {
  id: string;
  label: string;
}

const STEP_LABELS = [
  "Images",
  "Information",
  "Details",
  "Materials",
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

export function ProductWizard({
  categories,
  materials,
  brandName,
  initial,
  initialStep,
}: {
  categories: ProductTaxonomyOption[];
  materials: ProductMaterialOption[];
  brandName: string | null;
  /**
   * Present only when editing. Its absence is what makes this a create form —
   * there is no separate `mode` prop to keep in sync with it.
   */
  initial?: ProductEditData;
  /**
   * Step to open on. Set when a dashboard draft card deep-links to the exact
   * field it says is missing — landing on step 0 and making the author hunt
   * for it would undercut the point of naming the field.
   */
  initialStep?: number;
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

  const [images, setImages] = useState<UploadedGalleryItem[]>(initial?.images ?? []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [taxonomyNodeId, setTaxonomyNodeId] = useState(initial?.taxonomyNodeId ?? "");
  const [colorOptions, setColorOptions] = useState<string[]>(initial?.colorOptions ?? []);
  const [colorDraft, setColorDraft] = useState("");
  const [materialIds, setMaterialIds] = useState<string[]>(initial?.materialIds ?? []);
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  // An existing listing's slug is fixed, so it counts as "touched" from the
  // start — otherwise the title-sync effect below would rewrite the live URL
  // the moment the author corrected a typo in the name.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const a = setTimeout(() => setSaveState("saved"), 500);
    const b = setTimeout(() => setSaveState("idle"), 2600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [title, description, images, materialIds, colorOptions, metaDescription]);

  const seo = useMemo(
    () =>
      computeSeoScore({
        title,
        metaDescription,
        slug,
        description,
        imageCount: images.length,
        imagesWithAlt: images.filter((i) => (i.alt ?? "").trim().length > 2).length,
        teamCount: 0,
        productCount: 0,
        materialCount: materialIds.length,
        // Products have no location of their own — the brand's country is the
        // closest thing and it is not on this form. Passing the brand name
        // would make the location check pass on something that is not a
        // location, so it is left failing honestly and called out below.
        city: "",
        country: "",
      }),
    [title, metaDescription, slug, description, images, materialIds]
  );

  const steps: WizardStepMeta[] = STEP_LABELS.map((label, i) => ({
    id: label,
    label,
    complete: [
      images.length > 0,
      title.trim().length > 0 && description.trim().length > 0,
      Boolean(taxonomyNodeId) || colorOptions.length > 0,
      materialIds.length > 0,
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
    fd.set("gallery", JSON.stringify(images));
    fd.set("product_material_ids", JSON.stringify(materialIds));
    fd.set("color_options", JSON.stringify(colorOptions));
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
      // Editing never changes status — updateProductCanonical ignores `draft`
      // entirely and keeps whatever the listing already was. A draft stays a
      // draft; a published product is not silently pulled back for review.
      const result = initial
        ? await updateProductCanonical(initial.id, buildFormData(draft))
        : await createProductCanonical(null, buildFormData(draft));
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (initial) {
        router.push("/me/listings?updated=1");
        router.refresh();
        return;
      }
      router.push(draft ? "/me/listings" : "/me/listings?submitted=1");
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
              {isEdit ? (initial?.status === "DRAFT" ? "Editing draft" : "Editing product") : "New product"}
            </p>
            <h1 className="mt-2 font-display text-[34px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[42px]">
              {isEdit ? title.trim() || "Edit product." : "Add a product."}
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
                  published product. */}
              {isEdit ? "Save changes" : "Save as draft"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-[104px] lg:space-y-8">
              <WizardProgress steps={steps} />
              <StepRail steps={steps} current={step} onGo={go} />
            </div>
          </aside>

          <main className="min-w-0 lg:col-span-6">
            <div
              key={step}
              className={[
                "motion-reduce:animate-none",
                direction === 1
                  ? "animate-[wizardInRight_320ms_ease-out]"
                  : "animate-[wizardInLeft_320ms_ease-out]",
              ].join(" ")}
            >
              <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
                Step {step + 1} of {STEP_LABELS.length}
              </p>
              <h2 className="mt-2 font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-ink">
                {HEADINGS[step]}
              </h2>
              <p className="mt-3 max-w-[52ch] font-body text-[15px] leading-[24px] text-muted">
                {BLURBS[step]}
              </p>

              <div className="mt-8">
                {step === 0 && <ImageDropzone items={images} onChange={setImages} />}

                {step === 1 && (
                  <Card>
                    {brandName && (
                      <p className="rounded-xl bg-stone/40 px-4 py-3 font-body text-[13px] text-muted">
                        Publishing as <span className="text-ink">{brandName}</span> — products are
                        attributed to your brand profile automatically.
                      </p>
                    )}
                    <Field label="Product name" required>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={inputCls}
                        placeholder="Nena Armchair"
                      />
                    </Field>
                    <Field label="Category">
                      <select
                        value={taxonomyNodeId}
                        onChange={(e) => setTaxonomyNodeId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Choose a category…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Description"
                      required
                      hint={`${countWords(description)} words · ${SEO_THRESHOLDS.minDescriptionWords} recommended`}
                    >
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={9}
                        className={`${inputCls} leading-[24px]`}
                        placeholder="What it is, what it's made of, and what makes it worth specifying…"
                      />
                    </Field>
                  </Card>
                )}

                {step === 2 && (
                  <Card>
                    <Field
                      label="Finish and colour options"
                      hint="One per line, or press Enter"
                    >
                      <div className="flex gap-2">
                        <input
                          value={colorDraft}
                          onChange={(e) => setColorDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = colorDraft.trim();
                              if (v && !colorOptions.includes(v)) setColorOptions([...colorOptions, v]);
                              setColorDraft("");
                            }
                          }}
                          className={inputCls}
                          placeholder="Walnut, Black leather, Brushed brass…"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = colorDraft.trim();
                            if (v && !colorOptions.includes(v)) setColorOptions([...colorOptions, v]);
                            setColorDraft("");
                          }}
                          className="shrink-0 rounded-xl border border-ink/25 px-4 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
                        >
                          <Plus strokeWidth={1.5} className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Add option</span>
                        </button>
                      </div>
                    </Field>
                    {colorOptions.length > 0 && (
                      <ul className="flex flex-wrap gap-2">
                        {colorOptions.map((c) => (
                          <li key={c}>
                            <button
                              type="button"
                              onClick={() => setColorOptions(colorOptions.filter((x) => x !== c))}
                              className="inline-flex items-center gap-2 rounded-full bg-stone px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/70"
                            >
                              {c}
                              <X strokeWidth={2} className="h-3 w-3" aria-hidden />
                              <span className="sr-only">Remove option</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                )}

                {step === 3 && (
                  <PickerStep
                    kind="material"
                    options={materials.map((m) => ({ id: m.id, label: m.label, sub: null, cover: null }))}
                    selected={materialIds}
                    onChange={setMaterialIds}
                    placeholder="Search materials…"
                    emptyHint="No materials tagged yet."
                    footnote="Materials power the material filters across Archtivy — they're how specifiers find products like yours."
                  />
                )}

                {step === 4 && (
                  <Card>
                    <Field label="Product page on your site">
                      <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://example.com/products/nena" />
                    </Field>
                    <Field label="Instagram" hint="Just the handle — we build the link">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-body text-[15px] text-muted">
                          @
                        </span>
                        <input
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value.replace(/^@/, "").toLowerCase())}
                          className={`${inputCls} pl-9`}
                          placeholder="brandname"
                        />
                      </div>
                    </Field>
                    <Field label="Video" hint="YouTube or Vimeo">
                      <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputCls} placeholder="https://vimeo.com/123456789" />
                    </Field>
                  </Card>
                )}

                {step === 5 && (
                  <SeoStep
                    slug={slug}
                    onSlug={(v) => {
                      setSlugTouched(true);
                      setSlug(slugify(v));
                    }}
                    metaDescription={metaDescription}
                    onMeta={setMetaDescription}
                    seo={seo}
                    slugPrefix="/products/"
                    /* The slug is shown but not editable when editing: it is
                       the live URL, and updateProductCanonical deliberately
                       never changes it. An editable field that silently
                       discards its own input is worse than a locked one. */
                    slugReadOnly={isEdit}
                    note={
                      isEdit
                        ? "The URL is fixed once a product exists — changing it would break every link already pointing here."
                        : "Products have no location of their own, so that check stays unticked — it doesn’t stop you publishing."
                    }
                  />
                )}

                {step === 6 && (
                  <PublishStep
                    seo={seo}
                    canPublish={canPublish}
                    pending={pending}
                    onPublish={() => submit(false)}
                    onDraft={() => submit(true)}
                    isEdit={isEdit}
                    publishLabel={isEdit ? undefined : "Submit product"}
                    /* Products go to PENDING, not straight live — the RPC has
                       always done this, unlike projects. Say so plainly rather
                       than let someone wonder why it is not on their profile. */
                    publishNote={
                      isEdit
                        ? "Saving updates the product in place. Its published state doesn’t change."
                        : "Products are reviewed before they appear publicly. You’ll keep the draft either way."
                    }
                  />
                )}
              </div>

              {error && (
                <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-body text-[14px] text-red-700">
                  {error}
                </p>
              )}

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

          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-[104px]">
              <p className="mb-3 font-body text-[12px] uppercase tracking-[0.14em] text-muted">
                Live preview
              </p>
              <DeviceFrame url={`archtivy.com/products/${slug || "your-product"}`}>
                <div className="overflow-hidden rounded-lg">
                  <div className="relative aspect-square w-full bg-stone">
                    {images[0] && (
                      <Image src={images[0].url} alt="" fill sizes="320px" className="object-cover" />
                    )}
                  </div>
                  <div className="pt-3">
                    {brandName && (
                      <p className="font-body text-[11px] uppercase tracking-[0.1em] text-muted">
                        {brandName}
                      </p>
                    )}
                    <p className="mt-1 font-display text-[17px] leading-[1.2] tracking-tight text-ink">
                      {title.trim() || "Your product name"}
                    </p>
                    {colorOptions.length > 1 && (
                      <p className="mt-1.5 font-body text-[12px] text-muted">
                        {colorOptions.length} finishes
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
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const HEADINGS = [
  "Add your photos",
  "About the product",
  "Finishes and options",
  "Materials",
  "Links",
  "How it appears in search",
  "Review and submit",
];

const BLURBS = [
  "Clean product shots work best. The first becomes the main image.",
  "The name and description are what specifiers read — and what search engines index.",
  "List the finishes this product ships in. Shown as options on the product page.",
  "Tag what it's made of. This is how the material filters find it.",
  "Where can people go to learn more or buy it?",
  "These fields decide how your product looks in Google — and whether it's indexed at all.",
  "One last look before it goes for review.",
];
