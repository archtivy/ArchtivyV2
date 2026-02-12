"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { bulkUpdateProfiles } from "@/app/(admin)/admin/_actions/profiles";

type Row = {
  id: string;
  name: string;
  typeLabel: string;
  location: string;
  createdBy: "Archtivy" | "User";
  projectsCount: number;
  productsCount: number;
  status: "Draft" | "Live";
  username: string | null;
};

export function AdminProfilesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkCity, setBulkCity] = useState("");
  const [bulkCountry, setBulkCountry] = useState("");
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
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

  const applyBulk = (patch: Record<string, unknown>) => {
    if (!anyChecked) return;
    startTransition(async () => {
      const res = await bulkUpdateProfiles({ ids: selectedIds, patch });
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  };

  const runDeleteProfile = () => {
    if (!deleteProfileId) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/profiles/${encodeURIComponent(deleteProfileId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          message: data?.error ?? "Cannot delete because there are related records. Remove/reassign them first.",
        });
      } else {
        setBanner({ type: "success", message: "Deleted" });
        router.refresh();
      }
      setDeleteProfileId(null);
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
      {deleteProfileId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-profile-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 id="delete-profile-title" className="text-lg font-semibold text-zinc-900">
              Delete profile?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              This will delete the profile and may affect linked listings/connections. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteProfileId(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={runDeleteProfile}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {anyChecked && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="text-sm font-medium text-zinc-900">
            {selectedIds.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={bulkCity}
              onChange={(e) => setBulkCity(e.target.value)}
              placeholder="City"
              className="h-9 w-40 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <input
              value={bulkCountry}
              onChange={(e) => setBulkCountry(e.target.value)}
              placeholder="Country"
              className="h-9 w-40 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                applyBulk({
                  location_city: bulkCity || null,
                  location_country: bulkCountry || null,
                })
              }
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Set location
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => applyBulk({ location_city: null, location_country: null })}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              Clear location
            </button>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
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
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Created by
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Linked projects
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Linked products
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={(e) => toggleOne(r.id, e.target.checked)}
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-zinc-900">{r.name}</div>
                  {r.username ? (
                    <div className="mt-0.5 text-xs text-zinc-500">@{r.username}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-700">{r.typeLabel}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{r.location}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{r.createdBy}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{r.projectsCount}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{r.productsCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                      r.status === "Live"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-700",
                    ].join(" ")}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {r.username ? (
                      <Link
                        href={`/u/${r.username}`}
                        className="text-sm font-medium text-zinc-700 hover:underline"
                      >
                        View
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/profiles/${r.id}`}
                      className="text-sm font-medium text-zinc-700 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setDeleteProfileId(r.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-500">
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

