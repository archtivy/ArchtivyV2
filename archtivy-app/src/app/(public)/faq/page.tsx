import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { PageCTA } from "@/components/layout/PageCTA";

const FAQ_ITEMS = [
  {
    q: "What is Archtivy?",
    a: "Archtivy is a platform that connects architectural projects, products, designers, and brands. You can publish projects or products, link products to projects (credits), and discover work and specifications in one place.",
  },
  {
    q: "Who can use Archtivy?",
    a: "Designers can create project listings and link products they specified. Brands can create product listings. Readers can explore and discover. When you sign up, you choose a role (designer, brand, or reader) that determines what you can add.",
  },
  {
    q: "How many listings can I create?",
    a: "Create an account to add projects or products. You can save and organize your work, follow designers and brands, and get discovered in explore.",
  },
  {
    q: "What counts as a listing?",
    a: "Each project or each product is one listing. So 2 projects and 1 product would use your 3 free listings.",
  },
  {
    q: "How do I link a product to a project?",
    a: "When editing or creating a project, you can search for and add products that were used in that project. Those links appear on the project page and help brands see where their products are specified.",
  },
  {
    q: "Can I add documents or files to a listing?",
    a: "Yes. Projects and products support document uploads (e.g. PDFs, specs). Signed-in users can download them from the listing page.",
  },
  {
    q: "How does discovery work?",
    a: "Anyone can explore Projects, Products, Designers, and Brands. Listings are searchable and browsable. When you link products to projects, both the project and the product become easier to find in context.",
  },
  {
    q: "What if I am a designer and a brand?",
    a: "Your account has one role. If you do both, choose the role that matches your primary use (designer or brand). You can still explore everything; the role mainly controls whether you add projects or products.",
  },
  {
    q: "How do I get more visibility?",
    a: "Add clear titles, descriptions, and gallery images. Link products to projects so credits are visible. The more complete and accurate your listings, the more useful they are for discovery.",
  },
  {
    q: "Who can see my listings?",
    a: "Listings are public. Anyone visiting Archtivy can explore them. Your profile and linked work are visible to the whole community.",
  },
];

export const metadata = {
  title: "FAQ | Archtivy",
  description: "Frequently asked questions about Archtivy: roles, listings, discovery, and collaboration.",
};

export default async function FAQPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-20 sm:space-y-28">
      <header className="space-y-6 pt-4 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          FAQ
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Frequently asked questions
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Platform usage, roles, listing limits, and how discovery and collaboration work.
        </p>
      </header>

      <section className="border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <ul className="space-y-8">
          {FAQ_ITEMS.map((item, i) => (
            <li key={i} className="border-b border-zinc-200 pb-8 last:border-0 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {item.q}
              </h2>
              <p className="mt-3 leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.a}
              </p>
            </li>
          ))}
        </ul>
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
