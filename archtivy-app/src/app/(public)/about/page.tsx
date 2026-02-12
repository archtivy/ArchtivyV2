import { Button } from "@/components/ui/Button";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { AboutCTAs } from "./AboutCTAs";

export const metadata = {
  title: "About us | Archtivy",
  description:
    "Why Archtivy exists: connecting architectural designers and brands. Real visibility, real connections.",
};

export default async function AboutPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-20 sm:space-y-28">
      {/* Hero */}
      <header className="space-y-6 pt-4 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          About us
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-zinc-100">
          Architecture runs on connection. Most of it never happens.
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-xl">
          Designers and brands depend on the same thing: being visible to the right people at the right time. Today that visibility is scattered across networks, inboxes, trade fairs, and chance. Archtivy exists so that built work, products, and credits can live in one place—and so that the right connections can happen without depending on luck.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <AboutCTAs userId={userId} role={role} />
        </div>
      </header>

      {/* Stats */}
      <section className="border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          The gap is structural
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <li className="space-y-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-archtivy-primary/10 text-sm font-semibold text-archtivy-primary">
              1
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Designers report spending a large share of project time simply identifying and vetting suitable brands and products—time that could go into design and delivery.
            </p>
          </li>
          <li className="space-y-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-archtivy-primary/10 text-sm font-semibold text-archtivy-primary">
              2
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Many manufacturers still rely on personal networks and a small set of known studios for the majority of their specification opportunities.
            </p>
          </li>
          <li className="space-y-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-archtivy-primary/10 text-sm font-semibold text-archtivy-primary">
              3
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              A significant proportion of potential collaborations never occur because there is no shared, searchable record of who did what, and with which products.
            </p>
          </li>
          <li className="space-y-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-archtivy-primary/10 text-sm font-semibold text-archtivy-primary">
              4
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Without a central place for projects and products, visibility is tied to who you already know, not who you should know.
            </p>
          </li>
        </ul>
      </section>

      {/* Founder story */}
      <section className="grid gap-12 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Why Archtivy exists
          </h2>
        </div>
        <div className="space-y-6 text-zinc-600 dark:text-zinc-400">
          <p className="leading-relaxed">
            Archtivy came from the day-to-day reality of practice: the same search for the right products, the same dependence on PDFs and spreadsheets, the same hope that the right brand would appear at the right moment. It wasn’t conceived as a startup idea. It came from the frustration of seeing good work stay invisible and good products stay undiscovered.
          </p>
          <p className="leading-relaxed">
            The industry still runs on introductions, referrals, and being in the right room. That works for some. For everyone else—emerging studios, smaller brands, designers outside the usual circles—it creates a permanent disadvantage. Archtivy is a response to that: a single place where projects and products can be published, linked, and found. Not a replacement for relationships, but a way for the right ones to form.
          </p>
        </div>
      </section>

      {/* For designers */}
      <section className="grid gap-12 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            What changes for designers
          </h2>
        </div>
        <div className="space-y-6">
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            Without a shared platform, designers work in relative isolation. Product knowledge stays fragmented across brochures, websites, and word of mouth. Access to brands is uneven—often best for those who already have the strongest networks. The result is more time spent searching and less time designing, and many options never considered simply because they were never seen.
          </p>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            Archtivy shifts that. Your work can be published in one place, with clear credits and linked products. That improves discoverability: others can see what you’ve built and with whom. It adds context: projects show how products perform in real use. And it creates lasting visibility that isn’t tied to a single fair, pitch, or email thread. You stay findable. The right brands can find you.
          </p>
        </div>
      </section>

      {/* For brands */}
      <section className="grid gap-12 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            What changes for brands
          </h2>
        </div>
        <div className="space-y-6">
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            Brands know the limits of cold outreach, one-off events, and dependence on reps and fairs. Visibility is often short-lived; presence is hard to maintain. Reaching the designers who actually specify your products—and staying in their view—remains difficult without a stable, searchable place where work and products meet.
          </p>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            Archtivy is built for that. It’s a place where your products can sit alongside real projects: specified, documented, and credited. That’s specification and discovery, not advertising. Designers search by project type, location, or product—and find you in context. Your presence is ongoing, not tied to a single campaign or event. You become part of how designers discover and specify, not an interruption.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <footer className="space-y-8 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Architecture deserves better systems
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          The best work in architecture has always depended on clarity: clear credits, clear links between projects and products, and clear ways for the right people to find each other. Today that clarity is the exception. Archtivy is a step toward making it normal—so that connection isn’t left to chance and good work isn’t left unseen.
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          If you design, share your work. If you make, become part of the network. The platform is here. The rest is up to you.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <AboutCTAs userId={userId} role={role} />
          <Button as="link" href="/sign-up" variant="secondary">
            Become part of the network
          </Button>
        </div>
      </footer>
    </article>
  );
}
