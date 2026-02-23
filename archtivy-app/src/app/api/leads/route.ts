import { NextRequest } from "next/server";
import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";
import { getBaseUrl } from "@/lib/canonical";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingForLead, insertLead } from "@/lib/db/leads";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || "";
const FROM_EMAIL = process.env.FROM_EMAIL?.trim() || "Archtivy <introductions@archtivy.com>";

const MIN_MESSAGE_LENGTH = 15;
const MAX_LINKS = 2;
const LINK_REGEX = /https?:\/\/[^\s]+/gi;

function countLinks(text: string): number {
  const matches = text.match(LINK_REGEX);
  return matches ? matches.length : 0;
}

async function getOwnerEmailForListing(listing: {
  owner_clerk_user_id: string | null;
  owner_profile_id: string | null;
}): Promise<string | null> {
  let clerkUserId: string | null = listing.owner_clerk_user_id;
  if (!clerkUserId && listing.owner_profile_id) {
    const sup = getSupabaseServiceClient();
    const { data: profile } = await sup
      .from("profiles")
      .select("clerk_user_id, owner_user_id")
      .eq("id", listing.owner_profile_id)
      .maybeSingle();
    if (profile) {
      const row = profile as { clerk_user_id?: string | null; owner_user_id?: string | null };
      clerkUserId = row.clerk_user_id ?? row.owner_user_id ?? null;
    }
  }
  if (!clerkUserId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
    return primary?.emailAddress?.trim() || user.emailAddresses[0]?.emailAddress?.trim() || null;
  } catch {
    return null;
  }
}

function safeErrorMessage(e: any) {
  if (e?.message) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function POST(request: NextRequest) {
  console.log("[LEADS] hit /api/leads");
  console.log("[LEADS] env check", {
    hasResend: !!process.env.RESEND_API_KEY,
    hasFrom: !!process.env.FROM_EMAIL,
    hasAdmin: !!process.env.ADMIN_EMAIL,
    // supabase service client helper hangi env’i kullanıyorsa burada görürüz
    hasSbUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  try {
    const body = await request.json();
    console.log("[LEADS] body", body);

    const sender_name = typeof body.sender_name === "string" ? body.sender_name.trim() : "";
    const sender_email = typeof body.sender_email === "string" ? body.sender_email.trim() : "";
    const sender_company =
      body.sender_company != null && typeof body.sender_company === "string"
        ? body.sender_company.trim()
        : null;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const listing_id = typeof body.listing_id === "string" ? body.listing_id.trim() : "";

    if (!sender_name || sender_name.length < 2) {
      return Response.json(
        { error: "Please provide your name (at least 2 characters)." },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sender_email || !emailRegex.test(sender_email)) {
      return Response.json({ error: "Please provide a valid email address." }, { status: 400 });
    }
    if (!message || message.length < MIN_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Message must be at least ${MIN_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }
    if (countLinks(message) > MAX_LINKS) {
      return Response.json(
        { error: `Message may contain at most ${MAX_LINKS} links.` },
        { status: 400 }
      );
    }
    if (!listing_id) {
      return Response.json({ error: "Missing listing." }, { status: 400 });
    }

    const listing = await getListingForLead(listing_id);
    if (!listing) {
      return Response.json({ error: "Listing not found." }, { status: 404 });
    }

    const listing_owner_email = await getOwnerEmailForListing(listing);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const ip_hash = ip ? Buffer.from(ip).toString("base64").slice(0, 44) : null;
    const user_agent = request.headers.get("user-agent")?.slice(0, 500) || null;

    const result = await insertLead({
      listing_id: listing.id,
      listing_type: listing.type,
      listing_title: listing.title,
      listing_owner_email,
      sender_name,
      sender_email,
      sender_company,
      message,
      ip_hash,
      user_agent,
    });

    if ("error" in result) {
      console.error("[LEADS] insertLead returned error:", result.error);
      return Response.json(
        { error: "Failed to save your message. Please try again." },
        { status: 500 }
      );
    }

    if (ADMIN_EMAIL && resend) {
      const reviewUrl = `${getBaseUrl()}/admin/leads`;
      await resend.emails
        .send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Lead Pending Review — ${listing.title}`,
          html: `
          <p>A new contact request is pending review.</p>
          <ul>
            <li><strong>Listing:</strong> ${listing.title} (${listing.type})</li>
            <li><strong>From:</strong> ${sender_name} &lt;${sender_email}&gt;</li>
            ${sender_company ? `<li><strong>Company:</strong> ${sender_company}</li>` : ""}
          </ul>
          <p><strong>Message:</strong></p>
          <pre style="white-space:pre-wrap;font-family:inherit;background:#f4f4f4;padding:12px;border-radius:6px;">${message
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</pre>
          <p><a href="${reviewUrl}">Review in Admin</a></p>
        `,
        })
        .catch((err) => {
          console.error("[leads] Failed to send admin notification:", err);
        });
    }

    return Response.json({ success: true, id: result.id });
  } catch (e: any) {
    console.error("[LEADS_POST_ERROR]", e);
    const msg = safeErrorMessage(e);
    return Response.json(
      { error: "Something went wrong. Please try again.", debug: msg },
      { status: 500 }
    );
  }
}
