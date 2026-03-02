"use client";

import { useState } from "react";
import { useFeatured } from "@/lib/admin/hooks";
import { useToast } from "@/components/admin/AdminToast";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-500",
      ].join(" ")}
    >
      {active ? "Active" : "Expired"}
    </span>
  );
}

function isActive(endsAt: string | null | undefined): boolean {
  if (!endsAt) return false;
  return new Date(endsAt) > new Date();
}

interface SlotRow {
  id: string;
  listing_id?: string | null;
  profile_id?: string | null;
  label?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  notes?: string | null;
  [key: string]: unknown;
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
  if (rows.length === 0) {
    return (
      <div className="rounded border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        No {kind} slots yet.
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-200 bg-white">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-[#f5f5f5]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Label / ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Target</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Date Range</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Pricing</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{row.label ?? "—"}</div>
                  <div className="font-mono text-xs text-zinc-400">{row.id}</div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {row.listing_id && <div>Listing: <code className="rounded bg-zinc-100 px-1">{row.listing_id}</code></div>}
                  {row.profile_id && <div>Profile: <code className="rounded bg-zinc-100 px-1">{row.profile_id}</code></div>}
                  {!row.listing_id && !row.profile_id && <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  <div>{row.starts_at ? new Date(row.starts_at).toLocaleDateString() : "—"}</div>
                  <div>→ {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "open"}</div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {row.price_weekly != null && <div>Wk: ${row.price_weekly}</div>}
                  {row.price_monthly != null && <div>Mo: ${row.price_monthly}</div>}
                  {row.price_weekly == null && row.price_monthly == null && <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active={isActive(row.ends_at as string)} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SlotFormProps {
  kind: "featured" | "sponsor";
  initial?: SlotRow | null;
  onCancel: () => void;
  onSaved: () => void;
}

function SlotForm({ kind, initial, onCancel, onSaved }: SlotFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const table = kind === "featured" ? "featured_slots" : "sponsor_slots";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      label: fd.get("label") || null,
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

  const inputCls =
    "h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#002abf]/30";
  const labelCls = "block text-xs font-medium text-zinc-600 mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded border border-[#002abf]/20 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 text-sm font-semibold text-zinc-900">
        {initial ? "Edit" : "New"} {kind} slot
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls}>Label</label>
          <input name="label" defaultValue={initial?.label ?? ""} className={inputCls} placeholder="e.g. Homepage hero" />
        </div>
        <div>
          <label className={labelCls}>Listing ID (optional)</label>
          <input name="listing_id" defaultValue={initial?.listing_id ?? ""} className={inputCls} placeholder="UUID" />
        </div>
        <div>
          <label className={labelCls}>Profile ID (optional)</label>
          <input name="profile_id" defaultValue={initial?.profile_id ?? ""} className={inputCls} placeholder="UUID" />
        </div>
        <div>
          <label className={labelCls}>Starts at</label>
          <input
            name="starts_at"
            type="date"
            defaultValue={initial?.starts_at ? String(initial.starts_at).slice(0, 10) : ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Ends at</label>
          <input
            name="ends_at"
            type="date"
            defaultValue={initial?.ends_at ? String(initial.ends_at).slice(0, 10) : ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Weekly price ($)</label>
          <input name="price_weekly" type="number" min="0" defaultValue={initial?.price_weekly ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Monthly price ($)</label>
          <input name="price_monthly" type="number" min="0" defaultValue={initial?.price_monthly ?? ""} className={inputCls} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelCls}>Notes</label>
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? ""}
            rows={2}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#002abf]/30"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-[#002abf] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function FeaturedClient() {
  const { data, isLoading, error, refetch } = useFeatured();
  const [editingFeatured, setEditingFeatured] = useState<SlotRow | null | "new">(null);
  const [editingSponsor, setEditingSponsor] = useState<SlotRow | null | "new">(null);

  const featured = (data?.featured ?? []) as SlotRow[];
  const sponsors = (data?.sponsors ?? []) as SlotRow[];

  return (
    <div className="px-6 py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Featured & Sponsors</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Manage featured slots and sponsor inventory with date range controls.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {data?.featured_error && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Featured slots table not found in DB: <code>{data.featured_error}</code>. Create the{" "}
          <code>featured_slots</code> table to enable this feature.
        </div>
      )}

      {/* Featured Slots */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Featured Slots</h2>
          {!data?.featured_error && (
            <button
              type="button"
              onClick={() => setEditingFeatured("new")}
              className="rounded bg-[#002abf] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              + Add Slot
            </button>
          )}
        </div>

        {editingFeatured && (
          <SlotForm
            kind="featured"
            initial={editingFeatured === "new" ? null : editingFeatured}
            onCancel={() => setEditingFeatured(null)}
            onSaved={() => { setEditingFeatured(null); refetch(); }}
          />
        )}

        {isLoading ? (
          <div className="h-24 animate-pulse rounded border border-zinc-200 bg-white" />
        ) : (
          <SlotTable
            rows={featured}
            kind="featured"
            onEdit={(row) => setEditingFeatured(row)}
          />
        )}
      </section>

      {data?.sponsors_error && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Sponsor slots table not found in DB: <code>{data.sponsors_error}</code>. Create the{" "}
          <code>sponsor_slots</code> table to enable this feature.
        </div>
      )}

      {/* Sponsor Inventory */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">Sponsor Inventory</h2>
          {!data?.sponsors_error && (
            <button
              type="button"
              onClick={() => setEditingSponsor("new")}
              className="rounded bg-[#002abf] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              + Add Sponsor
            </button>
          )}
        </div>

        {editingSponsor && (
          <SlotForm
            kind="sponsor"
            initial={editingSponsor === "new" ? null : editingSponsor}
            onCancel={() => setEditingSponsor(null)}
            onSaved={() => { setEditingSponsor(null); refetch(); }}
          />
        )}

        {isLoading ? (
          <div className="h-24 animate-pulse rounded border border-zinc-200 bg-white" />
        ) : (
          <SlotTable
            rows={sponsors}
            kind="sponsor"
            onEdit={(row) => setEditingSponsor(row)}
          />
        )}
      </section>
    </div>
  );
}
