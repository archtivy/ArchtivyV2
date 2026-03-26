import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily initialised Stripe client.
 * Returns null when STRIPE_SECRET_KEY is not set (safe for builds / environments without Stripe).
 */
export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
  return _stripe;
}
