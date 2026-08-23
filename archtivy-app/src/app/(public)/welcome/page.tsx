export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SitePage } from "@/components/layout/SitePage";

/**
 * Post-signup welcome page. Shows role pick and CTAs.
 * Redirect new users here once; store has_seen_welcome in user metadata.
 */

const PRIMARY_CTA =
  "inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 font-body text-[14px] text-cream transition-opacity hover:opacity-90";
const SECONDARY_CTA =
  "inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 font-body text-[14px] text-ink transition-colors hover:bg-stone/50";

export default async function WelcomePage() {
  const { userId } = await auth();

  // If signed out, show public CTAs (sign in / explore)
  if (!userId) {
    return (
      <SitePage width="narrow">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-[34px] font-medium leading-[1.1] tracking-tight text-ink sm:text-[42px]">
            Welcome to Archtivy
          </h1>
          <p className="mt-4 font-body text-[17px] leading-relaxed text-muted">
            Discover how projects, products, and professionals connect.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/sign-in" className={SECONDARY_CTA}>
              Sign in
            </Link>
            <Link href="/explore/projects" className={PRIMARY_CTA}>
              Explore Projects
            </Link>
          </div>
        </div>
      </SitePage>
    );
  }

  return (
    <SitePage width="narrow">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-[34px] font-medium leading-[1.1] tracking-tight text-ink sm:text-[42px]">
          Welcome to Archtivy
        </h1>
        <p className="mt-4 font-body text-[17px] leading-relaxed text-muted">
          Get your first connection in 60 seconds.
        </p>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              What do you want to do?
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/onboarding?role=designer" className={SECONDARY_CTA}>
                Share projects
              </Link>
              <Link href="/onboarding?role=brand" className={SECONDARY_CTA}>
                Add products
              </Link>
              <Link href="/explore/projects" className={SECONDARY_CTA}>
                Explore first
              </Link>
            </div>
          </section>

          <section className="border-t border-hairline pt-8">
            <h2 className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
              Quick start
            </h2>
            <ul className="mt-4 list-inside list-decimal space-y-2 font-body text-[15px] leading-relaxed text-muted">
              <li>Pick your role (designer, brand, or reader)</li>
              <li>Create your first listing or explore the network</li>
              <li>Connect projects to products and get discovered</li>
            </ul>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/add/project" className={PRIMARY_CTA}>
              Create first project
            </Link>
            <Link href="/add/product" className={SECONDARY_CTA}>
              Add first product
            </Link>
            <Link href="/explore/projects" className={SECONDARY_CTA}>
              Explore Projects
            </Link>
          </div>
        </div>
      </div>
    </SitePage>
  );
}
