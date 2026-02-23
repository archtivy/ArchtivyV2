import { Webhook } from "svix";
import { headers } from "next/headers";
import { sendWelcomeEmail } from "@/lib/email/sendWelcome";

type ClerkWebhookEvent = {
  type: string;
  data?: {
    email_addresses?: { id: string; email_address: string }[];
    primary_email_address_id?: string;
  };
};

export async function POST(req: Request) {
  const headerList = await headers();
  const svixId = headerList.get("svix-id");
  const svixTimestamp = headerList.get("svix-timestamp");
  const svixSignature = headerList.get("svix-signature");
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();

  if (!secret || !svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing webhook secret or headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (evt.type === "user.created") {
    const d = evt.data;
    const primaryId = d?.primary_email_address_id;
    const addrs = d?.email_addresses ?? [];
    const primary = primaryId ? addrs.find((a) => a.id === primaryId) : addrs[0];
    const email = primary?.email_address ?? addrs[0]?.email_address;

    if (email && typeof email === "string" && email.includes("@")) {
      await sendWelcomeEmail(email);
    }
  }

  return Response.json({ ok: true });
}