"use client";

import { useState, useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { ListingSummary } from "@/lib/types/listings";
import type {
  linkProductToProjectAction,
  LinkActionResult,
} from "@/app/actions/projectProductLinks";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";

type LinkAction = typeof linkProductToProjectAction;

interface LinkProductSelectorProps {
  projectId: string;
  linkedProductIds: Set<string>;
  allProducts: ListingSummary[];
  linkAction: LinkAction;
}

export function LinkProductSelector({
  projectId,
  linkedProductIds,
  allProducts,
  linkAction,
}: LinkProductSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(linkAction, null as LinkActionResult | null);

  const options = allProducts.filter((p) => !linkedProductIds.has(p.id));

  useEffect(() => {
    if (state?.ok === true) {
      setOpen(false);
      router.refresh();
    }
  }, [state?.ok, router]);

  if (options.length === 0 && !open) {
    return (
      <Button variant="secondary" disabled>
        Link product (none available)
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Link product
        </Button>
      ) : (
        <form
          action={formAction}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-nowrap"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <label htmlFor="link-product-select" className="sr-only">
            Select product
          </label>
          <select
            id="link-product-select"
            name="productId"
            required
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Choose a product</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Add link
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {state?.ok === false && state?.error && (
        <ErrorMessage message={state.error} />
      )}
    </div>
  );
}
