"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeFromSaved } from "@/app/actions/saves";
import { Button } from "@/components/ui/Button";

interface RemoveFromSavedButtonProps {
  listingId: string;
  listingTitle: string;
}

export function RemoveFromSavedButton({ listingId, listingTitle }: RemoveFromSavedButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeFromSaved(listingId);
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="mt-2 w-full rounded-[20px] text-sm"
      onClick={handleRemove}
      disabled={isPending}
    >
      {isPending ? "Removing…" : "Remove from saved"}
    </Button>
  );
}
