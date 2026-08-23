"use client";

/**
 * Facet value picker — Finish / Texture, Color Family, and whatever else a
 * domain declares.
 *
 * ── IDS, NOT LABELS ─────────────────────────────────────────────────────────
 * Selections are stored as facet_value ids in listing_facets. The field this
 * replaces stored free text in products.color_options, which meant "Beige"
 * typed by one brand and "beige" by another were different values that could
 * never match each other or drive a filter. An id is the same value for
 * everyone, and renaming "Beige" later updates every listing at once instead
 * of none.
 *
 * ── WHY EVERY DECLARED FACET, NOT A HARDCODED PAIR ──────────────────────────
 * The facets table already says which domains each one applies to. Rendering
 * exactly what getFacetsForDomain returns means the wizard follows that
 * declaration rather than a second list in the UI that has to be kept in step
 * with it — which is how "color-family applies to projects too" went unnoticed
 * and unused. A new facet becomes authorable with no change here.
 *
 * ── CHIPS, NOT CHECKBOXES ───────────────────────────────────────────────────
 * These are short, self-describing values chosen a few at a time. A chip row
 * shows the whole vocabulary at once, which is what makes "is there a value
 * for what I mean?" answerable at a glance.
 */

export interface FacetForPicker {
  id: string;
  slug: string;
  label: string;
  values: { id: string; slug: string; label: string }[];
}

export function FacetPicker({
  facets,
  selectedIds,
  onChange,
}: {
  facets: FacetForPicker[];
  /** Selected facet_value ids across ALL facets — one flat set. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (facets.length === 0) return null;

  const selected = new Set(selectedIds);

  const toggle = (valueId: string) => {
    const next = new Set(selected);
    if (next.has(valueId)) next.delete(valueId);
    else next.add(valueId);
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-7">
      {facets
        .filter((f) => f.values.length > 0)
        .map((facet) => (
          <fieldset key={facet.id}>
            <legend className="mb-2.5 font-body text-[14px] text-ink">{facet.label}</legend>
            <div className="flex flex-wrap gap-2">
              {facet.values.map((v) => {
                const on = selected.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(v.id)}
                    className={[
                      "rounded-full border px-4 py-2 font-body text-[13px] transition-colors duration-150",
                      on
                        ? "border-ink bg-ink text-cream"
                        : "border-ink/25 text-muted hover:border-ink/40 hover:text-ink",
                    ].join(" ")}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
    </div>
  );
}
