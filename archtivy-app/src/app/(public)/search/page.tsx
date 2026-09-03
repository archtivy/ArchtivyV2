import type { Metadata } from "next";
import { DirectoryPageShell } from "@/components/directory/DirectoryPageShell";
import { SearchResultsView, type SearchTab } from "@/components/search/SearchResultsView";
import { searchAll } from "@/lib/search/universalSearch";
import type { SearchEntity } from "@/lib/search/types";

/**
 * /search — the canonical universal search route.
 *
 * ── WHY THIS ROUTE EXISTS ───────────────────────────────────────────────────
 * The global header had no destination of its own. It inferred an entity type
 * from whatever page you were reading and pushed you into that directory with
 * `?q=` appended, which meant a search for "chair" from anywhere but two paths
 * landed in Projects, and designers and brands could not be searched at all.
 * A search that spans four entity types needs a page that belongs to none of
 * them.
 *
 * ── STILL A DIRECTORY, VISUALLY ─────────────────────────────────────────────
 * It renders inside DirectoryPageShell and draws the same cards as /projects
 * and /products. A results page is a directory whose filter happens to be a
 * sentence.
 *
 * ── THE DIRECTORIES ARE UNTOUCHED ───────────────────────────────────────────
 * /projects and /products keep their own in-page search field, which filters
 * the set already on the page. That is a different job — narrowing a section
 * you have chosen — and it is unaffected by anything here.
 */

export const dynamic = "force-dynamic";

const VALID_TABS: SearchTab[] = ["all", "project", "product", "designer", "brand"];
const PER_PAGE = 24;

function readTab(raw: string | string[] | undefined): SearchTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  // The tab links emit the singular. Plurals are accepted anyway, because
  // ?type=products is what a person hand-editing the URL will write.
  const singular =
    v === "products"
      ? "product"
      : v === "projects"
        ? "project"
        : v === "designers"
          ? "designer"
          : v === "brands"
            ? "brand"
            : v;
  return VALID_TABS.includes(singular as SearchTab) ? (singular as SearchTab) : "all";
}

function readQuery(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  // Bounded: the query is echoed into the page and into a database ilike, and
  // an unbounded one is a pointless cost on both.
  return (v ?? "").trim().slice(0, 160);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return {
    title: q ? `“${q}” — Search` : "Search",
    description: q
      ? `Projects, products, designers and brands matching “${q}” on Archtivy.`
      : "Search projects, products, designers and brands on Archtivy.",
    /*
     * Results pages are not indexable. They are a combinatorial explosion of
     * near-identical thin pages over content that is already indexed at its
     * own canonical URL, which is exactly what search engines penalise.
     */
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = readQuery(sp.q);
  const tab = readTab(sp.type);
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const result = await searchAll(query, {
    entity: tab === "all" ? "all" : (tab as SearchEntity),
    page,
    perPage: PER_PAGE,
  });

  return (
    <DirectoryPageShell>
      <SearchResultsView
        query={query}
        tab={tab}
        result={result}
        intentLabel={result.intent.label}
      />
    </DirectoryPageShell>
  );
}
