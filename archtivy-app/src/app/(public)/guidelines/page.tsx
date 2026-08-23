import { SitePage } from "@/components/layout/SitePage";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { PageCTA } from "@/components/layout/PageCTA";
import { GuidelinesAccordion } from "@/components/guidelines/GuidelinesAccordion";

export const metadata = {
  title: "Guidelines | Archtivy",
  description: "Listing quality, accuracy, credits, and image requirements for Archtivy.",
};

const GUIDELINES_ITEMS = [
  {
    title: "Listing quality",
    content:
      "Listings should describe real projects or real products. Use clear titles and descriptions so others can understand what the project is or what the product does. Avoid placeholder or misleading text.",
  },
  {
    title: "Accuracy and credits",
    content:
      "Credit the right people and products. When you link a product to a project, it should have been used or specified in that project. Team members and brands used should be accurate. Incorrect credits undermine trust and discovery.",
  },
  {
    title: "Images",
    content:
      "Use images you have the right to use. Prefer high-quality photos or renders that represent the project or product. Avoid watermarked or low-resolution images where they would make the listing hard to evaluate.",
  },
  {
    title: "Respectful content",
    content:
      "Content must be respectful and professional. No harassment, spam, or misleading claims. We may remove listings or accounts that violate these guidelines or our Terms.",
  },
];

export default async function GuidelinesPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <SitePage width="narrow" footer>
      <article className="space-y-20 sm:space-y-28">
        <header className="space-y-6 px-4 text-center pt-4 sm:px-0 sm:pt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Guidelines
          </p>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-ink sm:text-4xl md:text-5xl">
            Quality and conduct
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted">
            How we expect listings and behaviour on Archtivy so the platform stays useful for everyone.
          </p>
        </header>

        <section className="space-y-8 border-t border-hairline px-4 pt-8 sm:px-0 sm:pt-12 md:space-y-10 md:pt-16">
          <div className="mx-auto max-w-2xl">
            <GuidelinesAccordion items={GUIDELINES_ITEMS} />
          </div>
        </section>

        <section className="border-t border-hairline pt-16 text-center sm:pt-20">
          <p className="mb-6 text-muted">
            Ready to share your work or explore projects?
          </p>
          <PageCTA userId={userId} role={role} />
        </section>
      </article>
    </SitePage>
  );
}
