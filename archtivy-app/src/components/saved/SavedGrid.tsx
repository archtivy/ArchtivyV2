import { ListingCardShared } from "@/components/listing/ListingCardShared";
import type { SavedItem } from "@/lib/db/savedLibrary";

/**
 * The mixed saved grid.
 *
 * ── CANONICAL CARDS, EACH KEEPING ITS OWN IDENTITY ──────────────────────────
 * There is no SavedProjectCard and no SavedProductCard. Every item renders
 * ListingCardShared with the FULL model that getProjectRailCards /
 * getProductRailCards produced — taxonomy line, owner identity and logo, year,
 * relationship badge, credit count — so a project saved here is visibly the
 * same card as on /projects, and a product the same as on /products.
 *
 * The two are NOT flattened into one generic saved card: a project keeps its
 * 4/3 photograph and a product keeps its 1/1 white tile, which is how you tell
 * them apart in a mixed grid without inventing a type badge the canonical card
 * has no slot for. Rows are therefore not perfectly aligned across types, and
 * that is the intended trade — the alternative is redesigning the shared card
 * to make a grid tidy.
 *
 * ── COLUMN COUNTS COME FROM THE MAIN COLUMN, NOT THE VIEWPORT ───────────────
 * The page is max-w-[1600px] with px-4 / sm:px-6 / lg:px-8, and the 264px rail
 * plus its 40px gutter only exists from `lg` — below that it is a drawer and
 * the grid gets the whole page. Computed against that, with gap-x-4:
 *
 *   vw     main   cols   card
 *    390    358     2     171
 *    768    720     3     229
 *   1024    656     3     208     <- rail appears here, so main DROPS
 *   1280    912     4     216
 *   1440   1072     4     256
 *   1536   1168     5     221
 *   1600   1232     5     234     <- container caps, so this is the widest
 *
 * FIVE ACROSS STARTS AT 1536, NOT 1440. The brief asks for five on large
 * desktop "if canonical card minimum width permits", and at 1440 it does not:
 * five would be 201px against the 256px four gives. The rail costs the grid
 * 304px that a directory page does not spend, which is the whole reason this
 * lands a breakpoint later than /products does. The card is never shrunk to
 * hold a column count.
 */
export function SavedGrid({ items }: { items: SavedItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => (
        <li key={item.key}>
          <ListingCardShared
            model={item.model}
            ratio={item.entityType === "product" ? "1/1" : "4/3"}
                  /* Mirrors the table above step for step, including the drop at
               1024 where the rail takes 304px out of the grid. */
            sizes="(max-width: 767px) 45vw, (max-width: 1023px) 31vw, (max-width: 1279px) 23vw, (max-width: 1535px) 18vw, 240px"
          />
        </li>
      ))}
    </ul>
  );
}
