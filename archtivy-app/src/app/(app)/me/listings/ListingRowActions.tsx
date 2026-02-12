"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteListing } from "@/app/actions/listings";
import { getListingUrl } from "@/lib/canonical";
import { Button } from "@/components/ui/Button";

interface ListingRowActionsProps {
  listingId: string;
  listingType: "project" | "product";
  listingTitle: string;
}

export function ListingRowActions({ listingId, listingType, listingTitle }: ListingRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const listingHref = getListingUrl({ id: listingId, type: listingType });

  const handleDelete = () => {
    if (!confirm(`Delete "${listingTitle}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteListing(listingId);
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button as="link" href={listingHref} variant="link" className="!rounded px-2 py-1 text-sm">
        View
      </Button>
      <Button as="link" href={listingHref} variant="link" className="!rounded px-2 py-1 text-sm">
        Edit
      </Button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded px-2 py-1 text-sm text-zinc-500 transition hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-archtivy-primary disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
