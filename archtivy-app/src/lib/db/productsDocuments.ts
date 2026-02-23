/**
 * Persist documents array to products.documents (jsonb).
 * Format: [{ url, name, mime?, size? }, ...]
 * Do not overwrite with null/empty unless caller explicitly passes empty array.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type ProductDocumentEntry = {
  url: string;
  name: string;
  mime?: string;
  size?: number;
};

export async function updateProductsDocuments(
  productId: string,
  documents: ProductDocumentEntry[]
): Promise<{ error: string | null }> {
  const payload = documents.map((d) => ({
    url: d.url,
    name: d.name,
    ...(d.mime != null && { mime: d.mime }),
    ...(d.size != null && { size: d.size }),
  }));
  const { error } = await getSupabaseServiceClient()
    .from("products")
    .update({ documents: payload })
    .eq("id", productId);
  return { error: error?.message ?? null };
}
