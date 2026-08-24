"use client";

import { useRouter } from "next/navigation";
import { ProductPinEditor } from "@/components/listing/ProductPinEditor";
import type { ManagedImage, TaggableProduct } from "@/lib/db/productTags";

/**
 * Client shell for the management page's copy of the pin editor.
 *
 * The editor no longer refreshes on its own — the wizard reloads through a
 * server action, this page reloads through the router, and the shared component
 * cannot know which it is inside. Here that means router.refresh(), which is
 * what the page did before the component was extracted.
 */
export function PinEditorHost({
  images,
  products,
  tagsTableReady,
}: {
  images: ManagedImage[];
  products: TaggableProduct[];
  tagsTableReady: boolean;
}) {
  const router = useRouter();
  return (
    <ProductPinEditor
      images={images}
      products={products}
      tagsTableReady={tagsTableReady}
      onChanged={() => router.refresh()}
    />
  );
}
