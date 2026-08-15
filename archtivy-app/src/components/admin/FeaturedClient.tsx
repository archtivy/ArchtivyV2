"use client";

import { useState } from "react";
import { useFeatured } from "@/lib/admin/hooks";
import { useToast } from "@/components/admin/AdminToast";
import { AdminPageShell, Panel } from "@/components/admin/ui/AdminPageShell";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import {
  TableShell,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  TDNum,
  RowActions,
  CellStack,
  TableEmpty,
} from "@/components/admin/ui/DataTable";
import {
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ROW,
  TYPE,
} from "@/components/admin/ui/tokens";

/**
 * Featured & Sponsors.
 *
 * ── A STANDING CAVEAT, NOT A BUG IN THIS REDESIGN ───────────────────────────
 * Neither `featured_slots` nor `sponsor_slots` exists in the database. Verified
 * live: both return PGRST205 (table not in schema cache). So this surface has
 * never actually managed anything — it renders a warning and hides its own Add
 * buttons. Memory already recorded both tables as OPTIONAL / may-not-exist.
 *
 * The redesign therefore covers the chrome, the table and the form, and makes
 * the disabled state say plainly what is missing instead of printing a raw
 * PostgREST message. Creating the tables is a migration, which is a separate
 * reviewed decision — see the review copy referenced in the notice below.
 *
 * `position` is included in the form and the table because the brief asks for
 * placement AND position. It is a plain payload key, and the API passes the
 * payload straight through, so it starts working the moment a table with that
 * column exists — and today it is inert along with everything else here.
 */

interface SlotRow {
  id: string;
  listing_id?: string | null;
  profile_id?: string | null;
  label?: string | null;
  position?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  notes?: string | null;
  [key: string]: unknown;
}

/**
 * A slot's live state. Three-valued, not two: the old version called anything
 * without a future end date "Expired", which mislabels a slot that has not
 * started yet and a slot deliberately left open-ended.
 */
function slotState(row: SlotRow): { label: string; tone: "positive" | "neutral" | "attention" } {
  const now = Date.now();
  const starts = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const ends = row.ends_at ? new Date(row.ends_at).getTime() : null;

  if (starts && starts > now) return { label: "Scheduled", tone: "attention" };
  if (ends && ends < now) return { label: "Ended", tone: "neutral" };
  return { label: "Live", tone: "positive" };
}

function SlotTable({
  rows,
  kind,
  onEdit,
}: {
  rows: SlotRow[];
  kind: "featured" | "sponsor";
  onEdit: (row: SlotRow) => void;
}) {
  return (
    <TableShell>
      <Table minWidth={820}>
        <THead>
          <TH align="right" width="72px">
            Pos.
          </TH>
          <TH>Placement</TH>
          <TH>Target</TH>
          <TH>Runs</TH>
          <TH align="right">Pricing</TH>
          <TH>Status</TH>
          <TH align="right">
            <span className="sr-only">Actions</span>
          </TH>
        </THead>
        <TBody>
          {rows.map((row) => {
            const state = slotState(row);
            return (
              <TR key={row.id}>
                <TDNum muted={row.position == null}>
                  {row.position != null ? row.position : "—"}
                </TDNum>
                <TD className="max-w-[240px]">
                  <CellStack title={row.label ?? "Unlabelled"} sub={String(row.id).slice(0, 8)} />
                </TD>
                <TD className="text-muted">
                  {row.listing_id ? (
                    <span className="font-mono text-[12px]">
                      Listing {String(row.listing_id).slice(0, 8)}
                    </span>
                  ) : row.profile_id ? (
                    <span className="font-mono text-[12px]">
                      Profile {String(row.profile_id).slice(0, 8)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-muted">
                  {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : "—"}
                  {" → "}
                  {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "open"}
                </TD>
                <TDNum muted={row.price_weekly == null && row.price_monthly == null}>
                  {row.price_weekly != null && <div>${row.price_weekly}/wk</div>}
                  {row.price_monthly != null && <div>${row.price_monthly}/mo</div>}
                  {row.price_weekly == null && row.price_monthly == null && "—"}
                </TDNum>
                <TD>
                  <StatusPill tone={state.tone} dot>
                    {state.label}
                  </StatusPill>
                </TD>
                <RowActions>
                  <button type="button" onClick={() => onEdit(row)} className={BTN_ROW}>
                    Edit
                  </button>
                </RowActions>
              </TR>
            );
          })}
          {rows.length === 0 && (
            <TableEmpty
              colSpan={7}
              title={`No ${kind} slots yet`}
              hint={`Add a slot to place a ${kind === "featured" ? "listing or profile" : "sponsor"} in a fixed position.`}
            />
          )}
        </TBody>
      </Table>
    </TableShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className={`mt-1 block ${TYPE.meta}`}>{hint}</span> : null}
    </label>
  );
}

function SlotForm({
  kind,
  initial,
  onCancel,
  onSaved,
}: {
  kind: "featured" | "sponsor";
  initial?: SlotRow | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const table = kind === "featured" ? "featured_slots" : "sponsor_slots";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      label: fd.get("label") || null,
      position: fd.get("position") ? Number(fd.get("position")) : null,
      listing_id: fd.get("listing_id") || null,
      profile_id: fd.get("profile_id") || null,
      starts_at: fd.get("starts_at") || null,
      ends_at: fd.get("ends_at") || null,
      price_weekly: fd.get("price_weekly") ? Number(fd.get("price_weekly")) : null,
      price_monthly: fd.get("price_monthly") ? Number(fd.get("price_monthly")) : null,
      notes: fd.get("notes") || null,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/featured", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial ? { table, id: initial.id, payload } : { table, payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      toast(initial ? "Slot updated" : "Slot created", { kind: "success" });
      onSaved();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Error", { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5">
      <Panel title={`${initial ? "Edit" : "New"} ${kind} slot`}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Placement label" hint="Where this appears, e.g. Homepage hero">
            <input
              name="label"
              defaultValue={initial?.label ?? ""}
              className={INPUT}
              placeholder="Homepage hero"
            />
          </Field>
          <Field label="Position" hint="Lower numbers appear first.">
            <input
              name="position"
              type="number"
              min="1"
              step="1"
              defaultValue={initial?.position ?? ""}
              className={INPUT}
              placeholder="1"
            />
          </Field>
          <Field label="Listing ID" hint="Optional — leave blank if targeting a profile.">
            <input
              name="listing_id"
              defaultValue={initial?.listing_id ?? ""}
              className={INPUT}
              placeholder="UUID"
            />
          </Field>
          <Field label="Profile ID" hint="Optional — leave blank if targeting a listing.">
            <input
              name="profile_id"
              defaultValue={initial?.profile_id ?? ""}
              className={INPUT}
              placeholder="UUID"
            />
          </Field>
          <Field label="Starts">
            <input
              name="starts_at"
              type="date"
              defaultValue={initial?.starts_at ? String(initial.starts_at).slice(0, 10) : ""}
              className={INPUT}
            />
          </Field>
          <Field label="Ends" hint="Leave blank to run open-ended.">
            <input
              name="ends_at"
              type="date"
              defaultValue={initial?.ends_at ? String(initial.ends_at).slice(0, 10) : ""}
              className={INPUT}
            />
          </Field>
          <Field label="Weekly price ($)">
            <input
              name="price_weekly"
              type="number"
              min="0"
              defaultValue={initial?.price_weekly ?? ""}
              className={INPUT}
            />
          </Field>
          <Field label="Monthly price ($)">
            <input
              name="price_monthly"
              type="number"
              min="0"
              defaultValue={initial?.price_monthly ?? ""}
              className={INPUT}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Notes">
              <textarea
                name="notes"
                defaultValue={initial?.notes ?? ""}
                rows={2}
                className={`${INPUT} h-auto resize-none py-2.5`}
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? "Saving…" : "Save slot"}
          </button>
          <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
            Cancel
          </button>
        </div>
      </Panel>
    </form>
  );
}

/** Honest disabled state — names the table, not the PostgREST error string. */
function UnavailableNotice({ table }: { table: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
      <p className="font-body text-[14px] font-medium text-amber-900">
        Not available yet — the <code>{table}</code> table does not exist.
      </p>
      <p className="mt-1 font-body text-[13px] leading-relaxed text-amber-800">
        Slots cannot be created or scheduled until it is added. The management UI
        below is complete and will work as soon as the table exists.
      </p>
    </div>
  );
}

export function FeaturedClient() {
  const { data, isLoading, error, refetch } = useFeatured();
  const [editingFeatured, setEditingFeatured] = useState<SlotRow | null | "new">(null);
  const [editingSponsor, setEditingSponsor] = useState<SlotRow | null | "new">(null);

  const featured = (data?.featured ?? []) as SlotRow[];
  const sponsors = (data?.sponsors ?? []) as SlotRow[];

  return (
    <AdminPageShell
      title="Featured & Sponsors"
      description="Paid and editorial placements, with position and scheduling."
      actions={
        <button type="button" onClick={() => refetch()} className={BTN_SECONDARY}>
          Refresh
        </button>
      }
    >
      <div className="space-y-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/60 px-5 py-4 font-body text-[14px] text-red-700">
            {error.message}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={TYPE.sectionTitle}>Featured slots</h2>
              <p className={`mt-0.5 ${TYPE.pageSubtitle}`}>
                Editorial placements across the homepage and index pages.
              </p>
            </div>
            {!data?.featured_error && (
              <button
                type="button"
                onClick={() => setEditingFeatured("new")}
                className={BTN_PRIMARY}
              >
                Add slot
              </button>
            )}
          </div>

          {data?.featured_error ? (
            <UnavailableNotice table="featured_slots" />
          ) : (
            <>
              {editingFeatured && (
                <SlotForm
                  kind="featured"
                  initial={editingFeatured === "new" ? null : editingFeatured}
                  onCancel={() => setEditingFeatured(null)}
                  onSaved={() => {
                    setEditingFeatured(null);
                    refetch();
                  }}
                />
              )}
              {isLoading ? (
                <div className="h-32 animate-pulse rounded-2xl border border-hairline bg-white" />
              ) : (
                <SlotTable rows={featured} kind="featured" onEdit={setEditingFeatured} />
              )}
            </>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={TYPE.sectionTitle}>Sponsor inventory</h2>
              <p className={`mt-0.5 ${TYPE.pageSubtitle}`}>
                Paid placements, with their run dates and rates.
              </p>
            </div>
            {!data?.sponsors_error && (
              <button
                type="button"
                onClick={() => setEditingSponsor("new")}
                className={BTN_PRIMARY}
              >
                Add sponsor
              </button>
            )}
          </div>

          {data?.sponsors_error ? (
            <UnavailableNotice table="sponsor_slots" />
          ) : (
            <>
              {editingSponsor && (
                <SlotForm
                  kind="sponsor"
                  initial={editingSponsor === "new" ? null : editingSponsor}
                  onCancel={() => setEditingSponsor(null)}
                  onSaved={() => {
                    setEditingSponsor(null);
                    refetch();
                  }}
                />
              )}
              {isLoading ? (
                <div className="h-32 animate-pulse rounded-2xl border border-hairline bg-white" />
              ) : (
                <SlotTable rows={sponsors} kind="sponsor" onEdit={setEditingSponsor} />
              )}
            </>
          )}
        </section>
      </div>
    </AdminPageShell>
  );
}
