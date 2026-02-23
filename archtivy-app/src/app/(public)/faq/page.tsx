import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { PageCTA } from "@/components/layout/PageCTA";

const TOP_QUESTIONS = [
  { title: "What is Archtivy?", id: "what-is-archtivy" },
  { title: "Who is it for?", id: "who-is-it-for" },
  { title: "What does “connections” mean?", id: "what-does-connections-mean" },
  { title: "What's the difference between Explore Projects and Explore Products?", id: "difference-explore-projects-products" },
  { title: "Why did my search return no results?", id: "why-no-search-results" },
  { title: "What happens when I click Save?", id: "what-happens-when-i-click-save" },
  { title: "Do I need an account to save?", id: "do-i-need-account-to-save" },
  { title: "What is a board?", id: "what-is-a-board" },
  { title: "Why don't I see any folders when I click Save?", id: "why-no-folders-when-click-save" },
  { title: "Can I share a board with someone who doesn't have an account?", id: "can-i-share-board-without-account" },
  { title: "How do I add a project?", id: "how-do-i-add-project" },
  { title: "How do I add a product?", id: "how-do-i-add-product" },
  { title: "My listing says “pending”—what does that mean?", id: "listing-says-pending" },
  { title: "How do I link a product to a project?", id: "how-do-i-link-product-to-project" },
  { title: "Is “Used in projects” verified?", id: "is-used-in-projects-verified" },
];

const SECTION_NAV = [
  { label: "What is Archtivy", id: "section-what-is-archtivy" },
  { label: "Accounts & roles", id: "section-accounts-roles" },
  { label: "Discovery & explore", id: "section-discovery-explore" },
  { label: "Adding & managing listings", id: "section-adding-listings" },
  { label: "Save & boards", id: "section-save-boards" },
  { label: "Profiles & people", id: "section-profiles-people" },
  { label: "Trust & credibility", id: "section-trust-credibility" },
  { label: "Technical & support", id: "section-technical-support" },
];

const SECTIONS: { sectionId: string; title: string; items: { id?: string; q: string; a: string }[] }[] = [
  {
    sectionId: "section-what-is-archtivy",
    title: "What is Archtivy",
    items: [
      { id: "what-is-archtivy", q: "What is Archtivy?", a: "A platform that connects built projects, products, designers, and brands. Publish projects or products, link products to projects (credits), and discover work and specifications in one place." },
      { id: "who-is-it-for", q: "Who is it for?", a: "Designers who want to publish work and get credit for specifications. Brands who want products discovered and linked from real projects. Anyone exploring architecture and design." },
    ],
  },
  {
    sectionId: "section-accounts-roles",
    title: "Accounts & roles",
    items: [
      { q: "Who can use Archtivy?", a: "Anyone can explore. To add projects or products, or to save to boards, you need an account. When you sign up you choose a role: designer, brand, or reader. The role determines what you can add (projects vs products), not what you can view." },
      { q: "What's the difference between designer, brand, and reader?", a: "Designers add projects and link products used in those projects. Brands add products. Readers explore and save; they don't add listings. Everyone can explore and save to boards." },
      { q: "I'm both a designer and a brand. Which role do I pick?", a: "Pick the role that matches your primary use. You can still explore everything; the role only controls whether you add projects or products. One account, one role." },
      { q: "Can I change my role later?", a: "Role changes may be possible depending on account settings. Contact support if you need to switch." },
      { q: "Why am I sent to sign-in when I click Save?", a: "Saving adds the item to one of your boards. You need to be signed in so we know which boards are yours. After sign-in you'll be returned to the page you were on." },
    ],
  },
  {
    sectionId: "section-discovery-explore",
    title: "Discovery & explore",
    items: [
      { q: "How do I find projects or products?", a: "Use the Explore menu: Projects, Products, Designers, Brands. Use search and filters (e.g. location, category) where available. Featured sections on the homepage show a curated set." },
      { id: "what-does-connections-mean", q: "What does “connections” mean?", a: "On a project, connections are the people (team) and products linked to that project. On a product, it's the number of projects and teams it's linked to. It's a measure of how much the listing is tied into the rest of the platform." },
      { id: "why-no-search-results", q: "Why did my search return no results?", a: "Try broader terms or fewer filters. Some listings may still be pending approval and won't appear in explore until approved." },
      { id: "difference-explore-projects-products", q: "What's the difference between Explore Projects and Explore Products?", a: "Projects are built work (buildings, interiors, etc.). Products are materials, furniture, fixtures, etc. Products can be linked to projects so you see “used in” and “products used.”" },
    ],
  },
  {
    sectionId: "section-adding-listings",
    title: "Adding & managing listings",
    items: [
      { id: "how-do-i-add-project", q: "How do I add a project?", a: "Sign in, go to Add Project (from the menu or /add/project). Add title, description, location, gallery (minimum 3 images), team, and products used. Submit for review; once approved, it appears in explore." },
      { id: "how-do-i-add-product", q: "How do I add a product?", a: "Sign in as a brand, go to Add Product. Add title, category, description, gallery, and specs. Submit for review; once approved, it appears in explore and can be linked to projects by designers." },
      { q: "What counts as one listing?", a: "One project = one listing. One product = one listing. Limits (if any) are per account." },
      { id: "how-do-i-link-product-to-project", q: "How do I link a product to a project?", a: "When creating or editing a project, use the “products used” section to search and add products. Those links appear on the project page and on the product's “Used in projects” section. Only project authors (or those with edit access) can add or remove links." },
      { id: "listing-says-pending", q: "My project or product says “pending.” What does that mean?", a: "Listings are reviewed before they go live. “Pending” means it's in the queue. You'll be able to share the full URL once it's approved. Timing depends on the review queue." },
      { q: "Can I edit or delete a listing after publishing?", a: "Yes. From your profile or “My listings” you can edit. Deletion or unpublish depends on platform policy; use the listing's edit/settings flow or contact support." },
      { q: "Can I add documents or files to a listing?", a: "Yes. Projects and products support document uploads (e.g. PDFs, specs). Signed-in users can download them from the listing page." },
      { q: "Who can see my listings?", a: "Once approved, listings are public. Anyone can see them in explore, search, and on your profile. Board visibility is separate: your saved boards can be private or shared via link." },
    ],
  },
  {
    sectionId: "section-save-boards",
    title: "Save & boards",
    items: [
      { id: "what-happens-when-i-click-save", q: "What happens when I click Save on a project or product?", a: "A modal opens where you choose which board (folder) to add it to. You can create a new board from there. Saving does not publish or change the listing itself; it only adds it to your collection." },
      { id: "do-i-need-account-to-save", q: "Do I need an account to save?", a: "Yes. Saving adds items to your boards, so you must be signed in." },
      { id: "what-is-a-board", q: "What is a board?", a: "A board is a collection you create (e.g. “Kitchen references,” “Lighting”). You add projects and products to boards from their detail pages or from the lightbox. Boards can be private or shared via a link." },
      { id: "why-no-folders-when-click-save", q: "Why don't I see any folders when I click Save?", a: "You may not have created a board yet. Create one in the Save modal or from Saved in the menu. If you've just signed up, create your first board from the modal." },
      { id: "can-i-share-board-without-account", q: "Can I share a board with someone who doesn't have an account?", a: "Yes. Make the board public and use “Share” to copy a link. Anyone with the link can view the board; they don't need to sign in." },
      { q: "How do I remove something from a board?", a: "Open the board (from Saved), find the item, and use remove or delete from board. The exact control depends on the board detail UI." },
    ],
  },
  {
    sectionId: "section-profiles-people",
    title: "Profiles & people",
    items: [
      { q: "How do I get to a designer's or brand's profile?", a: "Click their name on a project or product card, or use Explore → Designers or Brands and click through. Profile URLs are in the form archtivy.com/u/username." },
      { q: "Who is shown as “posted by” or owner on a card?", a: "The account that owns the listing: for a project, usually the designer or studio; for a product, the brand. It's the profile that created and owns that listing." },
      { q: "What's the difference between projects I authored and projects I collaborated on?", a: "Authored = you (or your profile) own the listing. Collaborated = you're listed as a team member but didn't create the listing. Profile pages can show both; labels may say “Projects” and “Collaborations” or similar." },
      { q: "Are team members on a project clickable?", a: "Team members are shown as credited on the project. Whether they link to a profile depends on the product; if not, they're display-only." },
    ],
  },
  {
    sectionId: "section-trust-credibility",
    title: "Trust & credibility",
    items: [
      { q: "Who can add products to a project?", a: "The person or people who can edit that project (typically the project author). They search for products and link them; product pages then show “Used in projects” with those links." },
      { id: "is-used-in-projects-verified", q: "Is “Used in projects” on a product verified?", a: "Links are created when a project author adds that product to their project. They're user-submitted credits, not independently verified. They show where the product has been credited in real projects." },
      { q: "How do I know a listing is legitimate?", a: "Listings are submitted by registered users and reviewed before going live. We don't verify every fact; treat listings as community-contributed. Report anything that breaks guidelines." },
      { q: "Can anyone edit someone else's project?", a: "No. Only the listing owner (or accounts with edit permission) can edit. Linking a product to a project is done by the project author, not by the brand." },
    ],
  },
  {
    sectionId: "section-technical-support",
    title: "Technical & support",
    items: [
      { q: "Does Archtivy work on mobile?", a: "Yes. The site is responsive. Explore, detail pages, lightbox, and Save work on phones and tablets. Some admin or advanced flows may be easier on desktop." },
      { q: "Can I use Archtivy in my language?", a: "The product is currently in English. Locations and project content can be in any language; search and filters may work best in English." },
      { q: "Why did I see an error or blank page when I clicked Save?", a: "If you were signed in and it failed, it may have been a temporary issue. Try again; if it persists, sign out and back in, or contact support with the page URL and what you clicked." },
      { q: "How do I report a listing or get help?", a: "Use the contact or feedback link in the footer. For reporting, include the listing URL and a short description. For account or billing, use the same channel or the email provided in the app." },
      { q: "What happens to my data if I delete my account?", a: "Account deletion is handled according to our privacy policy. Listings you created may be anonymised or removed; details are in the policy and in-account deletion flow." },
    ],
  },
];

const TRUST_DISCLAIMER = "Product–project links are credited by project authors and are not independently verified.";

export const metadata = {
  title: "FAQ | Archtivy",
  description: "Frequently asked questions about Archtivy: roles, listings, discovery, Save & boards, and collaboration.",
};

export default async function FAQPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-16 sm:space-y-24">
      <header className="space-y-6 pt-4 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          FAQ
        </p>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Frequently asked questions
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Platform usage, roles, discovery, Save & boards, and how collaboration works.
        </p>

        {/* Jump to section */}
        <nav aria-label="FAQ sections" className="mx-auto max-w-2xl pt-4">
          <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Jump to section
          </p>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {SECTION_NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-[#002abf] hover:decoration-[#002abf] dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-[#002abf]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Top questions */}
      <section className="border-t border-zinc-200 pt-12 dark:border-zinc-800">
        <h2 className="mb-6 font-serif text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
          Top questions
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOP_QUESTIONS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-[#002abf] hover:decoration-[#002abf] dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-[#002abf]"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <section
          key={section.sectionId}
          id={section.sectionId}
          className="scroll-mt-8 border-t border-zinc-200 pt-12 dark:border-zinc-800"
        >
          <h2 className="mb-8 font-serif text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
            {section.title}
          </h2>
          <ul className="space-y-10">
            {section.items.map((item, i) => (
              <li
                key={i}
                id={item.id}
                className="scroll-mt-8 border-b border-zinc-100 pb-10 last:border-0 dark:border-zinc-800"
              >
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.q}
                </h3>
                <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
          {section.sectionId === "section-trust-credibility" && (
            <p className="mt-6 text-sm italic text-zinc-500 dark:text-zinc-400">
              {TRUST_DISCLAIMER}
            </p>
          )}
        </section>
      ))}

      {/* Still need help? */}
      <section className="border-t border-zinc-200 pt-12 dark:border-zinc-800">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="mb-2 font-serif text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
            Still need help?
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Use the <Link href="/contact" className="font-medium text-[#002abf] underline underline-offset-2 hover:no-underline dark:text-[#002abf]">Contact</Link> link in the footer. Include the page URL and what you were trying to do so we can respond quickly.
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
