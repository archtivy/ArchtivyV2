export const dynamic = "force-dynamic";

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Post-signup welcome page. Shows role pick and CTAs.
 * Redirect new users here once; store has_seen_welcome in user metadata.
 */
export default async function WelcomePage() {
  const { userId } = await auth();
  // If signed out, show public CTAs (sign in / explore)
  if (!userId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Welcome to Archtivy
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Discover how projects, products, and professionals connect.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Sign in
          </Link>
          <Link
            href="/explore/projects"
            className="inline-flex items-center justify-center rounded-lg bg-[#002abf] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Explore Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-serif text-2xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
        Welcome to Archtivy
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Get your first connection in 60 seconds.
      </p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            What do you want to do?
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/onboarding?role=designer"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Share projects
            </Link>
            <Link
              href="/onboarding?role=brand"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Add products
            </Link>
            <Link
              href="/explore/projects"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Explore first
            </Link>
          </div>
        </section>

        <section className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Quick start
          </h2>
          <ul className="mt-3 list-inside list-decimal space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Pick your role (designer, brand, or reader)</li>
            <li>Create your first listing or explore the network</li>
            <li>Connect projects to products and get discovered</li>
          </ul>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/add/project"
            className="inline-flex items-center justify-center rounded-lg bg-[#002abf] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Create first project
          </Link>
          <Link
            href="/add/product"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Add first product
          </Link>
          <Link
            href="/explore/projects"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Explore Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
