"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { Profile } from "@/lib/types/profiles";

interface ProfileEditButtonProps {
  profile: Profile;
  editForm: ReactNode;
}

export function ProfileEditButton({
  profile,
  editForm,
}: ProfileEditButtonProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Edit profile
          </h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
        {editForm}
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
      Edit profile
    </Button>
  );
}
