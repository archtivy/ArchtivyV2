"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export async function linkProjectProduct(input: { projectId: string; productId: string }) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("project_product_links")
    .upsert({ project_id: input.projectId, product_id: input.productId }, { onConflict: "project_id,product_id" });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/connections");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function unlinkProjectProduct(input: { projectId: string; productId: string }) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("project_product_links")
    .delete()
    .eq("project_id", input.projectId)
    .eq("product_id", input.productId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/connections");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return { ok: true as const };
}

