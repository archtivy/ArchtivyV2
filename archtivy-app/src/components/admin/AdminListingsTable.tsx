"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  bulkUpdateListings,
  duplicateListingAndGo,
  bulkDeleteListings,
} from "@/app/(admin)/admin/_actions/listings";
import { getListingUrl } from "@/lib/canonical";

type Row = {
  id: string;
  title: string | null;
  location: string | null;
  year: string | number | null;
  created_at: string;
  cover_image_url: string | null;
  linked_count: number;
  image_count: number;
};

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

type DeleteTarget = { single: string } | { bulk: string[] } | null;

export function AdminListingsTable({
  kind,
  rows,
  showDelete = false,
}: {
  kind: "project" | "product";
  rows: Row[];
  showDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkYear, setBulkYear] = useState("");
  const [bulkLocation, setBulkLocation] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );
  const allChecked = rows.length > 0 && selectedIds.length === rows.length;
  const anyChecked = selectedIds.length > 0;

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const r of rows) next[r.id] = checked;
    setSelected(next);
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((s) => ({ ...s, [id]: checked }));
  };

  const applyBulk = (patch: Parameters<typeof bulkUpdateListings>[0]["patch"]) => {
    if (!anyChecked) return;
    startTransition(async () => {
      const res = await bulkUpdateListings({ ids: selectedIds, patch });
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  };

  const runDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      if ("single" in deleteTarget) {
        const res = await fetch(`/api/admin/listings/${encodeURIComponent(deleteTarget.single)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            data?.error ?? "Cannot delete because there are related records. Remove/reassign them first.";
          setBanner({ type: "error", message: msg });
        } else {
          setBanner({ type: "success", message: "Deleted" });
          router.refresh();
        }
      } else {
        const res = await bulkDeleteListings(deleteTarget.bulk);
        if (!res.ok) {
          setBanner({ type: "error", message: res.error ?? "Delete failed." });
        } else {
          setBanner({ type: "success", message: "Deleted" });
          router.refresh();
        }
      }
      setDeleteTarget(null);
      setSelected({});
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {banner && (
        <div
          className={
            banner.type === "success"
              ? "border-b border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              : "border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          }
          role="status"
        >
          {banner.message}
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-2 font-medium underline focus:outline-none"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
      {anyChecked && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="text-sm font-medium text-zinc-900">
            {selectedIds.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={bulkYear}
              onChange={(e) => setBulkYear(e.target.value)}
              placeholder="Year"
              className="h-9 w-24 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => applyBulk({ year: bulkYear || null })}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Set year
            </button>
            <input
              value={bulkLocation}
              onChange={(e) => setBulkLocation(e.target.value)}
              placeholder="Location"
              className="h-9 w-56 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => applyBulk({ location: bulkLocation || null })}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Set location
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => applyBulk({ year: null })}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Clear year
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => applyBulk({ location: null })}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Clear location
            </button>
            {showDelete && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteTarget({ bulk: selectedIds })}
                className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Delete selected
              </button>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 id="delete-confirm-title" className="text-lg font-semibold text-zinc-900">
              {"bulk" in deleteTarget
                ? "Delete listings?"
                : `Delete ${kind === "project" ? "project" : "product"}?`}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {"single" in deleteTarget
                ? "This will permanently delete this listing. This action cannot be undone."
                : `This will permanently delete ${deleteTarget.bulk.length} listing(s) and their images and connections.`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={runDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 bg-white">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {kind === "project" ? "Project name" : "Product name"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Year
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Images
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Linked {kind === "project" ? "products" : "projects"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const title = toText(r.title) || "—";
              return (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={(e) => toggleOne(r.id, e.target.checked)}
                      aria-label={`Select ${title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={kind === "project" ? `/admin/projects/${r.id}` : `/admin/products/${r.id}`}
                      className="text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {title}
                    </Link>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{toText(r.location) || "—"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{toText(r.year) || "—"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.image_count}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700">{r.linked_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={kind === "project" ? `/admin/projects/${r.id}` : `/admin/products/${r.id}`}
                        className="text-sm font-medium text-zinc-900 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={getListingUrl({ id: r.id, type: kind })}
                        className="text-sm font-medium text-zinc-700 hover:underline"
                      >
                        Preview
                      </Link>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const res = await duplicateListingAndGo(r.id);
                            if (res && !res.ok) alert(res.error);
                          })
                        }
                        className="text-sm font-medium text-zinc-700 hover:underline disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          // TEMP: verify click handler fires (remove once confirmed in devtools)
                          if (process.env.NODE_ENV !== "production") {
                            // eslint-disable-next-line no-console
                            console.log("delete clicked", r.id);
                          }
                          setDeleteTarget({ single: r.id });
                        }}
                        className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

