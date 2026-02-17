"use server";

import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getLeadById, updateLeadStatus } from "@/lib/db/leads";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL?.trim() || "Archtivy <introductions@archtivy.com>";

export async function approveLeadAction(leadId: string): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const lead = await getLeadById(leadId);
  if (!lead) return { error: "Lead not found" };
  if (lead.status !== "pending") return { error: "Lead already reviewed" };

  const updated = await updateLeadStatus(leadId, "approved", userId);
  if ("error" in updated) return updated;

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
  return { ok: true };
}

export async function rejectLeadAction(leadId: string): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  const lead = await getLeadById(leadId);
  if (!lead) return { error: "Lead not found" };
  if (lead.status !== "pending") return { error: "Lead already reviewed" };

  const updated = await updateLeadStatus(leadId, "rejected", userId);
  if ("error" in updated) return updated;

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/" + leadId);
  return { ok: true };
}
