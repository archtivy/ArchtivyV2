import Link from "next/link";
import { Crown } from "lucide-react";
import { getDailyRate } from "@/lib/promote/config";

/**
 * "Stand out on Archtivy" — the dashboard's upsell.
 *
 * ── IT SELLS THE THING THAT ACTUALLY EXISTS ─────────────────────────────────
 * The reference says "Upgrade to Pro to unlock premium features". Archtivy has
 * no Pro tier, no subscription and no plan table — what it sells is listing
 * promotion: Homepage Feature and Map Spotlight, priced per day, paid through
 * the existing Stripe checkout. So the card names that, quotes the REAL daily
 * rate from lib/promote/config rather than a made-up price, and its CTA opens
 * the real flow at /me/tools.
 *
 * Nothing here is a placeholder, and there is no second billing path: the
 * button is a link, and every price and payment decision stays server-side in
 * /api/promote/checkout.
 */
export function PromoteUpsellCard() {
  return (
    <section className="flex flex-col justify-between rounded-xl border border-hairline bg-stone/25 p-5">
      <div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream">
          <Crown strokeWidth={1.5} className="h-4 w-4 text-ink" aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-[19px] leading-[1.2] tracking-tight text-ink">
          Stand out on Archtivy
        </h2>
        <p className="mt-2 font-body text-[13px] leading-[19px] text-muted">
          Feature a listing on the homepage or highlight it on the Explore map, from{" "}
          {getDailyRate("map_spotlight")} a day.
        </p>
      </div>
      <Link
        href="/me/tools"
        className="mt-5 flex h-10 w-full items-center justify-center rounded-lg bg-ink px-4 font-body text-[13px] text-cream transition-colors hover:bg-ink/90"
      >
        Promote a listing
      </Link>
    </section>
  );
}
