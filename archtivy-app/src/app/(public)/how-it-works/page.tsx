import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { PageCTA } from "@/components/layout/PageCTA";

export const metadata = {
  title: "How it works | Archtivy",
  description: "Share your work, link products and credits, and get discovered. For designers and brands.",
};

export default async function HowItWorksPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-20 sm:space-y-28">
      <header className="space-y-6 pt-4 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          How it works
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Share. Link. Get discovered.
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Archtivy connects projects, products, designers, and brands in one place. Here is how it works.
        </p>
      </header>

      <section className="border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          The flow
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          <li className="space-y-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-archtivy-primary/10 text-lg font-semibold text-archtivy-primary">
              1
            </span>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Share your work
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Designers add projects; brands add products. Each listing gets a title, description, and gallery so others can see what you built or offer.
            </p>
          </li>
          <li className="space-y-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-archtivy-primary/10 text-lg font-semibold text-archtivy-primary">
              2
            </span>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Link credits and products
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Connect products to projects so every build shows which brands and products were used. Credits stay visible and searchable.
            </p>
          </li>
          <li className="space-y-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-archtivy-primary/10 text-lg font-semibold text-archtivy-primary">
              3
            </span>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Get discovered
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Others explore by project, product, designer, or brand. Your work and products appear in context.
            </p>
          </li>
        </ol>
      </section>

      <section className="grid gap-12 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            For designers
          </h2>
        </div>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400">
          <p className="leading-relaxed">
            Create a project listing with a title, description, location, and gallery. Add team members and link the products you specified. Your project becomes discoverable; brands see where their products are used.
          </p>
          <p className="leading-relaxed">
            You control what you share. Listings stay on the platform so your work stays findable over time.
          </p>
        </div>
      </section>

      <section className="grid gap-12 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            For brands
          </h2>
        </div>
        <div className="space-y-4 text-zinc-600 dark:text-zinc-400">
          <p className="leading-relaxed">
            Add product listings with type, features, and gallery. When designers link your products to their projects, you gain visibility in context.
          </p>
          <p className="leading-relaxed">
            Discovery happens through exploration: by project type, product category, or designer. Your presence is ongoing.
          </p>
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-16 text-center dark:border-zinc-800 sm:pt-20">
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Ready to share your work or explore projects?
        </p>
        <PageCTA userId={userId} role={role} />
      </section>
    </article>
  );
}
