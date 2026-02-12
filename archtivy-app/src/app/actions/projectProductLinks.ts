"use server";

import { revalidatePath } from "next/cache";
import {
  linkProductToProject as dbLink,
  unlinkProductFromProject as dbUnlink,
} from "@/lib/db/projectProductLinks";

export type LinkActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function linkProductToProjectAction(
  _prev: unknown,
  formData: FormData
): Promise<LinkActionResult> {
  const projectId = (formData.get("projectId") as string)?.trim();
  const productId = (formData.get("productId") as string)?.trim();
  if (!projectId || !productId) {
    return { ok: false, error: "Missing project or product" };
  }

  const result = await dbLink(projectId, productId);
  if (result.error) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  return { ok: true };
}

export async function unlinkProductFromProjectAction(
  projectId: string,
  productId: string
): Promise<LinkActionResult> {
  const result = await dbUnlink(projectId, productId);
  if (result.error) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/explore/projects");
  revalidatePath("/explore/products");
  return { ok: true };
}
