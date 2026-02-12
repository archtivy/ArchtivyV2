"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { updateUserRole, disableUser, deleteUser } from "@/app/(admin)/admin/_actions/users";
import type { ProfileRole } from "@/lib/auth/config";

const ROLES: ProfileRole[] = ["designer", "brand", "reader", "admin"];

export function AdminUserActions({
  profileId,
  currentRole,
  isDisabled,
  listingsCount,
}: {
  profileId: string;
  currentRole: string;
  isDisabled: boolean;
  listingsCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as ProfileRole;
    if (!ROLES.includes(role)) return;
    startTransition(async () => {
      const res = await updateUserRole(profileId, role);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  };

  const handleDisable = () => {
    startTransition(async () => {
      const res = await disableUser(profileId, !isDisabled);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteUser(profileId);
      if (!res.ok) alert(res.error);
      else {
        setShowDeleteConfirm(false);
        router.push("/admin/users");
        router.refresh();
      }
    });
  };

  return (
    <>
      <select
        value={currentRole}
        onChange={handleRoleChange}
        disabled={isPending}
        className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={isPending}
        onClick={handleDisable}
        className={`rounded-lg px-3 py-2 text-sm font-medium ${isDisabled ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"} disabled:opacity-50`}
      >
        {isDisabled ? "Re-enable" : "Disable"}
      </button>
      <button
        type="button"
        disabled={isPending || listingsCount > 0}
        onClick={() => setShowDeleteConfirm(true)}
        title={listingsCount > 0 ? "Remove or reassign listings first" : "Permanently delete user"}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Delete user
      </button>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 id="delete-user-title" className="text-lg font-semibold text-zinc-900">
              Delete this user?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              This will permanently delete the profile. They must have no listings. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
