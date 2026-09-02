"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { approveClaimRequest, rejectClaimRequest } from "@/lib/db/profileClaimRequests";
import { isAdminUser } from "@/lib/admin/guard";

export async function approveClaim(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=" + encodeURIComponent("/admin/claims"));
  }
  /*
   * A server action is an ENDPOINT, not a page. The (admin) layout's
   * requireAdmin() stops a non-admin rendering /admin/claims; it does nothing
   * to stop one posting to this action directly. Without this check any
   * signed-in account could approve a claim — including its own — by invoking
   * it with a request id. The id is not a secret: it is in the claims table
   * and in every review URL.
   */
  if (!(await isAdminUser())) {
    return { ok: false, error: "Not authorized." };
  }
  /*
   * A server action is an ENDPOINT, not a page. The (admin) layout's
   * requireAdmin() stops a non-admin rendering /admin/claims; it does nothing
   * to stop one posting to this action directly. Without this check any
   * signed-in account could approve a claim — including its own — by invoking
   * it with a request id. The id is not a secret: it is in the claims table
   * and in every review URL.
   */
  if (!(await isAdminUser())) {
    return { ok: false, error: "Not authorized." };
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
