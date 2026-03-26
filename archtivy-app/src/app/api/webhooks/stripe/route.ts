import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/server";
import { activateCampaign } from "@/lib/promote/campaigns";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for promotion campaigns.
 * Must be configured in Stripe Dashboard to send checkout.session.completed events.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const activated = await activateCampaign(session.id, paymentIntentId);
    if (activated) {
      console.log("[stripe-webhook] Campaign activated for session:", session.id);
    } else {
      console.warn("[stripe-webhook] Failed to activate campaign for session:", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
