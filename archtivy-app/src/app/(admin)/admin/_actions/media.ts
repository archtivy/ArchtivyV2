"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export async function updateImageAlt(input: { imageId: string; alt: string | null }) {
  const supabase = getSupabaseServiceClient();
  const alt = toText(input.alt);
  const { error } = await supabase
    .from("listing_images")
    .update({ alt: alt.length ? alt : null })
    .eq("id", input.imageId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/media");
  revalidatePath("/admin/seo-quality");
  return { ok: true as const };
}

