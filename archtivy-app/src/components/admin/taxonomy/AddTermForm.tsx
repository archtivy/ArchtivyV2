"use client";

import { useState, useTransition } from "react";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import {
  TAXONOMY_DOMAIN_LABELS,
  PENDING_TAXONOMY_DOMAINS,
  type TaxonomyDomain,
} from "@/lib/taxonomy/domains";
import { addTaxonomyNode } from "@/app/(admin)/admin/_actions/taxonomy";
import { INPUT, SELECT, BTN_PRIMARY, BTN_SECONDARY, TYPE } from "@/components/admin/ui/tokens";

/**
 * Add a taxonomy term.
 *
 * The `addTaxonomyNode` server action already existed and was already imported
 * into TaxonomyDbManager — but never called from anywhere. So "edit/add terms"
 * was half-built: the write path was there, the UI to reach it was not. This is
 * that UI; the action is unchanged.
 *
 * Slug is derived from the label and shown read-only rather than being a second
 * thing to type and keep in sync. It stays derived because a hand-typed slug
 * that disagrees with its label is the classic way these tables rot.
 */

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AddTermForm({
  domain,
  nodes,
  onAdded,
  onCancel,
}: {
  domain: TaxonomyDomain;
  /** Nodes in this domain — candidate parents. */
  nodes: TaxonomyNode[];
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slug = slugify(label);
  const isPendingDomain = PENDING_TAXONOMY_DOMAINS.includes(domain);

  // A duplicate within the same parent is what actually breaks navigation;
  // the same slug under a different parent is legitimate and common here.
  const siblingClash = nodes.some(
    (n) => n.slug === slug && (n.parent_id ?? "") === parentId
  );

  const submit = () => {
    setError(null);
    if (!label.trim()) return setError("Give the term a label.");
    if (!slug) return setError("That label produces an empty slug — use letters or numbers.");
    if (siblingClash) return setError("A term with that slug already exists under the same parent.");

    startTransition(async () => {
      const res = await addTaxonomyNode({
        domain,
        parent_id: parentId || null,
        slug,
        label: label.trim(),
        sort_order: sortOrder ? Number(sortOrder) : nodes.length + 1,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not add the term.");
        return;
      }
      setLabel("");
      setParentId("");
      setSortOrder("");
      onAdded();
    });
  };

  return (
    <div className="border-b border-hairline bg-cream/60 px-5 py-5">
      <h3 className={TYPE.sectionTitle}>
        New term in {TAXONOMY_DOMAIN_LABELS[domain]}
      </h3>

      {isPendingDomain && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 font-body text-[13px] leading-relaxed text-amber-800">
          This domain is not enabled in the database yet — its migration has not
          been applied, so saving will fail with a constraint error until it is.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="term-label" className="mb-1.5 block font-body text-[13px] font-medium text-ink">
            Label
          </label>
          <input
            id="term-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Calm"
            className={INPUT}
          />
          <p className={`mt-1 ${TYPE.meta}`}>
            Slug: <span className="font-mono">{slug || "—"}</span>
          </p>
        </div>

        <div>
          <label htmlFor="term-parent" className="mb-1.5 block font-body text-[13px] font-medium text-ink">
            Parent
          </label>
          <select
            id="term-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={SELECT}
          >
            <option value="">No parent (top level)</option>
            {nodes
              .slice()
              .sort((a, b) => a.slug_path.localeCompare(b.slug_path))
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {"— ".repeat(n.depth)}
                  {n.label}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="term-sort" className="mb-1.5 block font-body text-[13px] font-medium text-ink">
            Sort order
          </label>
          <input
            id="term-sort"
            type="number"
            min="0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder={String(nodes.length + 1)}
            className={INPUT}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 font-body text-[13px] text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={submit} disabled={isPending} className={BTN_PRIMARY}>
          {isPending ? "Adding…" : "Add term"}
        </button>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Cancel
        </button>
      </div>
    </div>
  );
}
