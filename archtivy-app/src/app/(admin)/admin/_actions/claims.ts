"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { approveClaimRequest, rejectClaimRequest } from "@/lib/db/profileClaimRequests";

export async function approveClaim(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=" + encodeURIComponent("/admin/claims"));
  }
  const result = await approveClaimRequest(requestId, userId);
  if (result.error) {
    if (process.env.NODE_ENV === "development") console.warn("[approveClaim]", result.error);
    return { ok: false, error: result.error };
  }
  revalidatePath("/admin/claims");
  revalidatePath("/admin/claims/[id]", "page");
  redirect("/admin/claims?approved=1");
}

export async function rejectClaim(
  requestId: string,
  adminNote: string | null
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=" + encodeURIComponent("/admin/claims"));
  }
  const result = await rejectClaimRequest(requestId, userId, adminNote);
  if (result.error) {
    if (process.env.NODE_ENV === "development") console.warn("[rejectClaim]", result.error);
    return { ok: false, error: result.error };
  }
  revalidatePath("/admin/claims");
  revalidatePath("/admin/claims/[id]", "page");
  return { ok: true };
}
