"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search, X, Plus, ExternalLink, MapPin } from "lucide-react";
import { computeSeoScore, countWords, SEO_THRESHOLDS } from "@/lib/publish/seoScore";

/**
 * Shared wizard primitives — used by both the project and product publish
 * flows so the two cannot drift visually or behaviourally. Extracted when the
 * product wizard was added rather than copied, which is how two flows end up
 * with subtly different field styling and checklist wording.
 */

export interface TeamMemberDraft {
  name: string;
  title: string;
}
export interface MemberTitleOption {
  label: string;
}

/* ── Small shared pieces ───────────────────────────────────────────────── */

export const inputCls =
  "w-full rounded-xl border border-hairline bg-cream px-4 py-3 font-body text-[15px] text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5 motion-reduce:transition-none";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 rounded-2xl border border-hairline bg-cream p-6 sm:p-8">{children}</div>
  );
}

export function Field({
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

export function TeamStep({
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

export function PickerStep({
  kind,
  options,
  selected,
  onChange,
  placeholder,
  emptyHint,
  footnote,
}: {
  kind: "product" | "material";
  options: { id: string; label: string; sub: string | null; cover: string | null }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  emptyHint: string;
  /** Warm, non-blocking aside. Used to trail the Products step. */
  footnote?: string;
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

      {footnote && (
        <p className="flex items-start gap-2.5 rounded-xl bg-stone/40 px-4 py-3.5 font-body text-[13px] leading-[20px] text-muted">
          <MapPin strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {footnote}
        </p>
      )}
    </div>
  );
}

/* ── SEO ───────────────────────────────────────────────────────────────── */

export function SeoStep({
  slug,
  onSlug,
  metaDescription,
  onMeta,
  seo,
  slugPrefix = "/projects/",
  note,
}: {
  slug: string;
  onSlug: (v: string) => void;
  metaDescription: string;
  onMeta: (v: string) => void;
  seo: ReturnType<typeof computeSeoScore>;
  /** Differs per entity: /projects/ or /products/. */
  slugPrefix?: string;
  /** Entity-specific caveat shown under the checklist. */
  note?: string;
}) {
  const len = metaDescription.trim().length;
  const inBand = len >= SEO_THRESHOLDS.metaDescriptionMin && len <= SEO_THRESHOLDS.metaDescriptionMax;
  return (
    <div className="space-y-6">
      <Card>
        <Field label="URL" hint="Lowercase, hyphenated">
          <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-hairline bg-cream focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5">
            <span className="shrink-0 border-r border-hairline bg-stone/40 px-4 py-3 font-body text-[14px] text-muted">
              {slugPrefix}
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
        {note && (
          <p className="mt-5 border-t border-hairline pt-4 font-body text-[12px] leading-[18px] text-muted">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Publish ───────────────────────────────────────────────────────────── */

export function PublishStep({
  seo,
  canPublish,
  pending,
  onPublish,
  onDraft,
  publishLabel = "Publish project",
  publishNote,
}: {
  seo: ReturnType<typeof computeSeoScore>;
  canPublish: boolean;
  pending: boolean;
  onPublish: () => void;
  onDraft: () => void;
  publishLabel?: string;
  /** e.g. products go to review rather than straight live. */
  publishNote?: string;
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
          {pending ? "Submitting…" : publishLabel}
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
      {publishNote && (
        <p className="font-body text-[13px] leading-[20px] text-muted">{publishNote}</p>
      )}
      {!canPublish && (
        <p className="font-body text-[13px] text-muted">
          A title and at least one photo are needed to publish.
        </p>
      )}
    </div>
  );
}
