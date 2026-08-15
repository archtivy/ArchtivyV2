"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { bulkUpdateProfiles } from "@/app/(admin)/admin/_actions/profiles";
import { StatusPill } from "@/components/admin/ui/StatusPill";
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
 * Profiles table.
 *
 * Same data and same server actions as before; the finish now matches the rest
 * of the admin area. The one substantive change is the "Created by" column,
 * which used to print the bare words "Archtivy" and "User" — it is now a pill,
 * because that column exists to spot internally-seeded records at a glance and
 * plain text in a nine-column table does not achieve that.
 */

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

export function AdminProfilesTable({
  rows,
  filtered = false,
}: {
  rows: Row[];
  filtered?: boolean;
}) {
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

  const toggleOne = (id: string, checked: boolean) =>
    setSelected((s) => ({ ...s, [id]: checked }));

  const applyBulk = (patch: Record<string, unknown>) => {
    if (!anyChecked) return;
    startTransition(async () => {
      const res = await bulkUpdateProfiles({ ids: selectedIds, patch });
      if (!res.ok) setBanner({ type: "error", message: res.error ?? "Update failed." });
      else {
        setBanner({ type: "success", message: `Updated ${selectedIds.length} profile(s).` });
        router.refresh();
      }
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
          message:
            data?.error ??
            "Cannot delete because there are related records. Remove or reassign them first.",
        });
      } else {
        setBanner({ type: "success", message: "Deleted." });
        router.refresh();
      }
      setDeleteProfileId(null);
    });
  };

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
            <span className="font-medium tabular-nums">{selectedIds.length} selected</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                value={bulkCity}
                onChange={(e) => setBulkCity(e.target.value)}
                placeholder="City"
                aria-label="City to apply"
                className={`${INPUT} w-36`}
              />
              <input
                value={bulkCountry}
                onChange={(e) => setBulkCountry(e.target.value)}
                placeholder="Country"
                aria-label="Country to apply"
                className={`${INPUT} w-36`}
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
                className={BTN_SECONDARY}
              >
                Set location
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => applyBulk({ location_city: null, location_country: null })}
                className={BTN_ROW}
              >
                Clear location
              </button>
            </div>
          </TableBar>
        )}

        <Table minWidth={1020}>
          <THead>
            <TH width="44px">
              <Checkbox checked={allChecked} onChange={toggleAll} label="Select all" />
            </TH>
            <TH>Name</TH>
            <TH>Type</TH>
            <TH>Location</TH>
            <TH>Source</TH>
            <TH align="right">Projects</TH>
            <TH align="right">Products</TH>
            <TH>Status</TH>
            <TH align="right">
              <span className="sr-only">Actions</span>
            </TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id} selected={!!selected[r.id]}>
                <TD>
                  <Checkbox
                    checked={!!selected[r.id]}
                    onChange={(c) => toggleOne(r.id, c)}
                    label={`Select ${r.name}`}
                  />
                </TD>
                <TD className="max-w-[280px]">
                  <CellStack
                    title={
                      <Link href={`/admin/profiles/${r.id}`} className="hover:underline">
                        {r.name}
                      </Link>
                    }
                    sub={r.username ? `@${r.username}` : "No username yet"}
                  />
                </TD>
                <TD className="text-muted">{r.typeLabel}</TD>
                <TD className="text-muted">{r.location}</TD>
                <TD>
                  <StatusPill tone={r.createdBy === "Archtivy" ? "info" : "neutral"}>
                    {r.createdBy === "Archtivy" ? "Seeded" : "Self-signup"}
                  </StatusPill>
                </TD>
                <TDNum muted={r.projectsCount === 0}>{r.projectsCount}</TDNum>
                <TDNum muted={r.productsCount === 0}>{r.productsCount}</TDNum>
                <TD>
                  {r.status === "Live" ? (
                    <StatusPill tone="positive" dot>
                      Live
                    </StatusPill>
                  ) : (
                    <StatusPill tone="neutral" dot>
                      Draft
                    </StatusPill>
                  )}
                </TD>
                <RowActions>
                  {r.username && (
                    <Link
                      href={`/u/${r.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className={BTN_ROW}
                    >
                      View
                    </Link>
                  )}
                  <Link href={`/admin/profiles/${r.id}`} className={BTN_ROW}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDeleteProfileId(r.id)}
                    className={`${BTN_ROW} text-red-600 hover:bg-red-50 hover:text-red-700`}
                  >
                    Delete
                  </button>
                </RowActions>
              </TR>
            ))}
            {rows.length === 0 && (
              <TableEmpty
                colSpan={9}
                title={filtered ? "No profiles match these filters" : "No profiles yet"}
                hint={
                  filtered
                    ? "Clear or widen the filters above to see more."
                    : "Create a profile, or wait for the first signup."
                }
              />
            )}
          </TBody>
        </Table>
      </TableShell>

      <ConfirmDialog
        open={!!deleteProfileId}
        title="Delete this profile?"
        body="This deletes the profile and may affect linked listings and connections. This cannot be undone."
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        pending={isPending}
        onConfirm={runDeleteProfile}
        onCancel={() => setDeleteProfileId(null)}
      />

      {rows.length > 0 && (
        <p className={`mt-3 ${TYPE.meta}`}>
          Showing {rows.length} {rows.length === 1 ? "profile" : "profiles"}
        </p>
      )}
    </>
  );
}
