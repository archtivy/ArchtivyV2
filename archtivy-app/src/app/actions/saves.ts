"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { addSave, removeSave } from "@/lib/db/userSaves";
import type { ActionResult } from "./types";

export async function addToSaved(listingId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to save items." };
  const { error } = await addSave(userId, listingId);
  if (error) return { error };
  revalidatePath("/me/saved");
  revalidatePath(`/projects/${listingId}`);
  revalidatePath(`/products/${listingId}`);
  return {};
}

export async function removeFromSaved(listingId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in to update saved items." };
  const { error } = await removeSave(userId, listingId);
  if (error) return { error };
  revalidatePath("/me/saved");
  revalidatePath(`/projects/${listingId}`);
  revalidatePath(`/products/${listingId}`);
  return {};
}
