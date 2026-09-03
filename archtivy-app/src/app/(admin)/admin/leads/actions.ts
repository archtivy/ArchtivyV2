"use server";

import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getLeadById, updateLeadStatus } from "@/lib/db/leads";
import { isAdminUser } from "@/lib/admin/guard";
import { deliverLeadToInbox } from "@/lib/leads/deliver";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL?.trim() || "Archtivy <info@archtivy.com>";

/**
 * Approve, and deliver.
 *
 * ── ORDER MATTERS ───────────────────────────────────────────────────────────
 * In-app delivery runs BEFORE the status write. deliverLeadToInbox claims the
 * lead with a compare-and-swap that requires status = 'pending', so marking it
 * approved first would make its own claim impossible and every approval would
 * fall through to email only. Delivery also fails loudly: if the conversation,
 * participants or message cannot be written, this returns an error and the
 * lead stays pending rather than reporting a delivery that did not happen.
 */
export async function approveLeadAction(
  leadId: string
): Promise<{ ok: true; delivered: boolean } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  /*
   * A server action is an ENDPOINT. The (admin) layout's requireAdmin() stops
   * a non-admin rendering /admin/leads and does nothing to stop one posting
   * here with a lead id — which is not a secret. Without this check any
   * signed-in account could approve or reject any lead, and now also cause a
   * message to be delivered into someone else's inbox.
   */
  if (!(await isAdminUser())) return { error: "Not authorized." };

  const lead = await getLeadById(leadId);
  if (!lead) return { error: "Lead not found" };
  if (lead.status !== "pending") return { error: "Lead already reviewed" };

  const delivery = await deliverLeadToInbox(lead);
  if (delivery.kind === "error") {
    // Nothing was left behind — deliverLeadToInbox rolls its own writes back.
    return { error: `In-app delivery failed: ${delivery.error}` };
  }
  const delivered = delivery.kind === "delivered" || delivery.kind === "already";

  const updated = await updateLeadStatus(leadId, "approved", userId);
  if ("error" in updated) return updated;

  /*
   * ── THE EMAIL PATH IS UNCHANGED, AND STILL RUNS ─────────────────────────
   * It is the only delivery most listings have: 72 of 80 approved products
   * are owned by profiles carrying a synthetic archtivy_internal_* id, which
   * is not an account anyone can sign in to. Making in-app delivery a
   * precondition for approval would strand those leads permanently. So the
   * two run independently — a lead can be delivered in-app, by email, or by
   * both, and approval never depends on either.
   */
  const ownerEmail = lead.listing_owner_email?.trim();
  if (ownerEmail && resend) {
    const body =
      "<p>Someone reached out via Archtivy about your listing <strong>" +
      lead.listing_title.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
      "</strong>.</p>" +
      "<p><strong>From:</strong> " +
      lead.sender_name.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
      " &lt;" +
      lead.sender_email.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
      "&gt;</p>" +
      (lead.sender_company
        ? "<p><strong>Company:</strong> " + lead.sender_company.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>"
        : "") +
      "<p><strong>Message:</strong></p>" +
      "<pre style=\"white-space:pre-wrap;font-family:inherit;background:#f4f4f4;padding:12px;border-radius:6px;\">" +
      lead.message.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
      "</pre>" +
      "<p>You can reply directly to this email — your reply will go to " +
      lead.sender_name.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
      ".</p>";

    await resend.emails
      .send({
        from: FROM_EMAIL,
        to: ownerEmail,
        replyTo: lead.sender_email,
        subject: "New Curated Introduction via Archtivy — " + lead.listing_title,
        html: body,
      })
      .catch((err) => {
        console.error("[leads] Approve: failed to send to owner:", err);
      });
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/" + leadId);
  return { ok: true, delivered };
}

export async function rejectLeadAction(leadId: string): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  /* Same reasoning as approveLeadAction — see the note there. */
  if (!(await isAdminUser())) return { error: "Not authorized." };

  const lead = await getLeadById(leadId);
  if (!lead) return { error: "Lead not found" };
  if (lead.status !== "pending") return { error: "Lead already reviewed" };

  const updated = await updateLeadStatus(leadId, "rejected", userId);
  if ("error" in updated) return updated;

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/" + leadId);
  return { ok: true };
}
