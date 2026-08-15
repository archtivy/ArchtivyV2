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
import { ListingStatusPill } from "@/components/admin/ui/StatusPill";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import {
  TableShell,
  TableBar,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  TDNum,
  RowActions,
  CellStack,
  Checkbox,
  TableEmpty,
} from "@/components/admin/ui/DataTable";
import { INPUT, BTN_ROW, BTN_SECONDARY, TYPE } from "@/components/admin/ui/tokens";

/**
 * Listings table — inventory scanning and bulk edit.
 *
 * Redesigned, not replaced. The behaviour is unchanged: same server actions,
 * same bulk patches, same delete confirmation. What changed is the finish —
 * hairline rules, a 56px row, pill status, and row actions that stay quiet
 * until the row is hovered or focused.
 *
 * The bulk-action strip now only appears when something is selected and sits
 * inside the card, so the table doesn't reflow the page when you tick a box.
 */

type Row = {
  id: string;
  title: string | null;
  status: string | null;
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
  filtered = false,
}: {
  kind: "project" | "product";
  rows: Row[];
  showDelete?: boolean;
  /** Drives the empty-state copy: no matches vs nothing exists yet. */
  filtered?: boolean;
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

  const toggleOne = (id: string, checked: boolean) =>
    setSelected((s) => ({ ...s, [id]: checked }));

  const applyBulk = (patch: Parameters<typeof bulkUpdateListings>[0]["patch"]) => {
    if (!anyChecked) return;
    startTransition(async () => {
      const res = await bulkUpdateListings({ ids: selectedIds, patch });
      if (!res.ok) setBanner({ type: "error", message: res.error ?? "Update failed." });
      else {
        setBanner({ type: "success", message: `Updated ${selectedIds.length} listing(s).` });
        router.refresh();
      }
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
          setBanner({
            type: "error",
            message:
              data?.error ??
              "Cannot delete because there are related records. Remove or reassign them first.",
          });
        } else {
          setBanner({ type: "success", message: "Deleted." });
          router.refresh();
        }
      } else {
        const res = await bulkDeleteListings(deleteTarget.bulk);
        if (!res.ok) setBanner({ type: "error", message: res.error ?? "Delete failed." });
        else {
          setBanner({ type: "success", message: "Deleted." });
          router.refresh();
        }
      }
      setDeleteTarget(null);
      setSelected({});
    });
  };

  const noun = kind === "project" ? "project" : "product";

  return (
    <>
      <TableShell>
        {banner && (
          <TableBar tone={banner.type === "success" ? "positive" : "critical"}>
            <span className="flex-1">{banner.message}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="font-medium underline underline-offset-2 focus:outline-none"
            >
              Dismiss
            </button>
          </TableBar>
        )}

        {anyChecked && (
          <TableBar tone="selection">
            <span className="font-medium tabular-nums">
              {selectedIds.length} selected
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                value={bulkYear}
                onChange={(e) => setBulkYear(e.target.value)}
                placeholder="Year"
                aria-label="Year to apply"
                className={`${INPUT} w-24`}
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => applyBulk({ year: bulkYear || null })}
                className={BTN_SECONDARY}
              >
                Set year
              </button>
              <input
                value={bulkLocation}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="Location"
                aria-label="Location to apply"
                className={`${INPUT} w-52`}
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => applyBulk({ location: bulkLocation || null })}
                className={BTN_SECONDARY}
              >
                Set location
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => applyBulk({ year: null })}
                className={BTN_ROW}
              >
                Clear year
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => applyBulk({ location: null })}
                className={BTN_ROW}
              >
                Clear location
              </button>
              {showDelete && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setDeleteTarget({ bulk: selectedIds })}
                  className={`${BTN_ROW} text-red-600 hover:bg-red-50 hover:text-red-700`}
                >
                  Delete selected
                </button>
              )}
            </div>
          </TableBar>
        )}

        <Table minWidth={960}>
          <THead>
            <TH width="44px">
              <Checkbox checked={allChecked} onChange={toggleAll} label="Select all" />
            </TH>
            <TH>{kind === "project" ? "Project" : "Product"}</TH>
            <TH>Status</TH>
            <TH>Location</TH>
            <TH align="right">Year</TH>
            <TH align="right">Images</TH>
            <TH align="right">
              Linked {kind === "project" ? "products" : "projects"}
            </TH>
            <TH align="right">
              <span className="sr-only">Actions</span>
            </TH>
          </THead>
          <TBody>
            {rows.map((r) => {
              const title = toText(r.title) || "Untitled";
              const href = kind === "project" ? `/admin/projects/${r.id}` : `/admin/products/${r.id}`;
              return (
                <TR key={r.id} selected={!!selected[r.id]}>
                  <TD>
                    <Checkbox
                      checked={!!selected[r.id]}
                      onChange={(c) => toggleOne(r.id, c)}
                      label={`Select ${title}`}
                    />
                  </TD>
                  <TD className="max-w-[320px]">
                    <div className="flex items-center gap-3">
                      <div className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-hairline bg-stone/30 sm:block">
                        {r.cover_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.cover_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <CellStack
                        title={
                          <Link href={href} className="hover:underline">
                            {title}
                          </Link>
                        }
                        sub={`Added ${new Date(r.created_at).toLocaleDateString()}`}
                      />
                    </div>
                  </TD>
                  <TD>
                    <ListingStatusPill status={r.status} />
                  </TD>
                  <TD className="text-muted">{toText(r.location) || "—"}</TD>
                  <TDNum muted={!toText(r.year)}>{toText(r.year) || "—"}</TDNum>
                  <TDNum muted={r.image_count === 0}>{r.image_count}</TDNum>
                  <TDNum muted={r.linked_count === 0}>{r.linked_count}</TDNum>
                  <RowActions>
                    <Link href={href} className={BTN_ROW}>
                      Edit
                    </Link>
                    <Link
                      href={getListingUrl({ id: r.id, type: kind })}
                      target="_blank"
                      rel="noreferrer"
                      className={BTN_ROW}
                    >
                      Preview
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await duplicateListingAndGo(r.id);
                          if (res && !res.ok) {
                            setBanner({ type: "error", message: res.error ?? "Duplicate failed." });
                          }
                        })
                      }
                      className={BTN_ROW}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setDeleteTarget({ single: r.id })}
                      className={`${BTN_ROW} text-red-600 hover:bg-red-50 hover:text-red-700`}
                    >
                      Delete
                    </button>
                  </RowActions>
                </TR>
              );
            })}
            {rows.length === 0 && (
              <TableEmpty
                colSpan={8}
                title={filtered ? `No ${noun}s match these filters` : `No ${noun}s yet`}
                hint={
                  filtered
                    ? "Clear or widen the filters above to see more."
                    : `Published ${noun}s will appear here.`
                }
              />
            )}
          </TBody>
        </Table>
      </TableShell>

      <ConfirmDialog
        open={!!deleteTarget}
        title={
          deleteTarget && "bulk" in deleteTarget
            ? `Delete ${deleteTarget.bulk.length} listings?`
            : `Delete this ${noun}?`
        }
        body={
          deleteTarget && "bulk" in deleteTarget
            ? `This permanently deletes ${deleteTarget.bulk.length} listing(s) along with their images and connections. This cannot be undone.`
            : "This permanently deletes the listing along with its images and connections. This cannot be undone."
        }
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        pending={isPending}
        onConfirm={runDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {rows.length > 0 && (
        <p className={`mt-3 ${TYPE.meta}`}>
          Showing {rows.length} {rows.length === 1 ? noun : `${noun}s`}
        </p>
      )}
    </>
  );
}
