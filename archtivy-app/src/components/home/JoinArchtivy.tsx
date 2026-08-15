import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Join Archtivy (Build Brief §9, right column).
 *
 * The "From the Magazine" column that sat beside this in the reference is
 * omitted from v1 — there is no CMS, no articles and no /magazine content — so
 * this band runs at a contained width rather than stretching a 35% column
 * across the full page.
 *
 * The email field posts to /sign-up rather than a waitlist endpoint: no
 * waitlist store exists, and a form that silently discards an address would be
 * worse than none. Carrying the address through as a query param means the
 * sign-up form can prefill it.
 */
export function JoinArchtivy() {
  return (
    <section className="rounded-xl bg-ink px-6 py-10 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-[560px] text-center">
        <h2 className="font-display text-[24px] leading-[32px] tracking-tight text-cream sm:text-[28px]">
          Join Archtivy
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] font-body text-[15px] leading-[24px] text-cream/70">
          Save your favorite projects, create collections and connect with the
          architecture world.
        </p>

        <form action="/sign-up" method="get" className="relative mx-auto mt-7 max-w-[420px]">
          <label htmlFor="join-email" className="sr-only">
            Email address
          </label>
          <input
            id="join-email"
            name="email_address"
            type="email"
            required
            placeholder="Enter your email"
            className="h-[52px] w-full rounded-full bg-cream pl-6 pr-14 font-body text-[15px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cream focus:ring-offset-2 focus:ring-offset-ink"
          />
          <button
            type="submit"
            aria-label="Continue to sign up"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-cream transition-opacity hover:opacity-90"
          >
            <ArrowRight strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          </button>
        </form>

        <p className="mt-5 font-body text-[13px] text-cream/60">
          Already a member?{" "}
          <Link
            href="/sign-in"
            className="text-cream underline decoration-cream/40 underline-offset-4 hover:decoration-cream"
          >
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}
