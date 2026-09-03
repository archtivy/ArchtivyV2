/**
 * Intent-based search parser for the Explore map.
 *
 * Decomposes natural language queries like "lighting brands in Turkiye"
 * into a structured SearchIntent for filtering map pins.
 *
 * Designed as a rule-based parser. Drop-in replaceable with an API/LLM
 * parser later — just return the same SearchIntent shape.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export type EntityType = "project" | "designer" | "brand" | "product";

/**
 * Which entity types the caller can actually display.
 *
 * The Explore map draws project, designer and brand pins and has nowhere to
 * put a product, so it takes the default. Universal search passes all four.
 * Inference never proposes a type the caller did not ask for — that is the
 * whole reason this option exists rather than a second parser.
 */
export type EntityScope = readonly EntityType[];

export const MAP_ENTITIES: EntityScope = ["project", "designer", "brand"];
export const ALL_ENTITIES: EntityScope = ["project", "designer", "brand", "product"];

export interface SearchIntent {
  /** Inferred entity types to show. Empty = show all. */
  types: EntityType[];
  /** Location text extracted from the query (to geocode or match). */
  location: string | null;
  /** Matched category/discipline terms. */
  categories: string[];
  /** Matched material terms. */
  materials: string[];
  /** Matched style terms. */
  styles: string[];
  /** Remaining unmatched tokens for fuzzy text matching. */
  freeText: string;
  /** Human-readable label summarising the interpreted intent. */
  label: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Vocabulary dictionaries
   ═══════════════════════════════════════════════════════════════════════════ */

/** Words/phrases → entity type. Ordered longest-first for greedy matching. */
const TYPE_SYNONYMS: [string[], EntityType][] = [
  // Brand
  [["brands", "brand", "manufacturer", "manufacturers", "supplier", "suppliers", "company", "companies"], "brand"],
  // Designer
  [["architects", "architect", "architecture studio", "architecture studios", "design studio", "design studios"], "designer"],
  [["interior designers", "interior designer"], "designer"],
  [["designers", "designer", "studios", "studio", "firms", "firm", "practices", "practice", "professionals"], "designer"],
  // Project
  [["projects", "project", "buildings", "building", "works", "work"], "project"],
  // Product entity words. Inert unless the caller has products in scope.
  [["products", "product", "objects", "object", "items", "item", "furnishings"], "product"],
];

/** Flattened synonym → EntityType lookup (built once). */
const TYPE_MAP = new Map<string, EntityType>();
for (const [words, type] of TYPE_SYNONYMS) {
  for (const w of words) TYPE_MAP.set(w, type);
}

/** Words → canonical category name. Covers project types, brand types, designer disciplines. */
const CATEGORY_SYNONYMS = new Map<string, string>([
  // Project categories
  ["residential", "Residential"], ["house", "Residential"], ["houses", "Residential"],
  ["villa", "Residential"], ["villas", "Residential"], ["home", "Residential"], ["homes", "Residential"],
  ["apartment", "Residential"], ["apartments", "Residential"],
  ["commercial", "Commercial"], ["office", "Commercial"], ["offices", "Commercial"],
  ["retail", "Commercial"], ["shop", "Commercial"], ["shops", "Commercial"],
  ["hospitality", "Hospitality"], ["hotel", "Hospitality"], ["hotels", "Hospitality"],
  ["restaurant", "Hospitality"], ["restaurants", "Hospitality"], ["cafe", "Hospitality"],
  ["cultural", "Cultural"], ["museum", "Cultural"], ["museums", "Cultural"],
  ["gallery", "Cultural"], ["galleries", "Cultural"], ["library", "Cultural"],
  ["theater", "Cultural"], ["theatre", "Cultural"],
  ["interior", "Interior"], ["interiors", "Interior"], ["interior design", "Interior"],
  ["institutional", "Institutional"], ["school", "Institutional"], ["university", "Institutional"],
  ["hospital", "Institutional"],
  ["mixed-use", "Mixed-Use"], ["mixed use", "Mixed-Use"],
  // Brand product types (from productTaxonomy root types)
  ["lighting", "Lighting"], ["lights", "Lighting"], ["lamp", "Lighting"], ["lamps", "Lighting"],
  ["light", "Lighting"], ["pendant", "Lighting"], ["pendants", "Lighting"], ["luminaire", "Lighting"],
  ["furniture", "Furniture"], ["seating", "Furniture"], ["chairs", "Furniture"], ["tables", "Furniture"],
  // Singulars for the same terms. Someone searching "chair" and someone
  // searching "chairs" mean the same thing, and only one of them was
  // understood before.
  ["chair", "Furniture"], ["table", "Furniture"], ["sofa", "Furniture"], ["sofas", "Furniture"],
  ["armchair", "Furniture"], ["armchairs", "Furniture"], ["stool", "Furniture"], ["stools", "Furniture"],
  ["bench", "Furniture"], ["benches", "Furniture"], ["desk", "Furniture"], ["desks", "Furniture"],
  ["bed", "Furniture"], ["beds", "Furniture"], ["shelf", "Furniture"], ["shelving", "Furniture"],
  ["couch", "Furniture"], ["couches", "Furniture"],
  ["surface", "Surfaces"], ["surfaces", "Surfaces"], ["countertop", "Surfaces"],
  ["countertops", "Surfaces"], ["worktop", "Surfaces"], ["worktops", "Surfaces"],
  ["cladding", "Surfaces"], ["panel", "Surfaces"], ["panels", "Surfaces"],
  ["bathroom", "Bathroom"], ["bath", "Bathroom"], ["sanitary", "Bathroom"],
  ["kitchen", "Kitchen"], ["kitchens", "Kitchen"],
  ["flooring", "Flooring"], ["floors", "Flooring"], ["floor", "Flooring"],
  ["outdoor", "Outdoor"], ["landscape", "Outdoor"], ["garden", "Outdoor"],
  ["textiles", "Textiles"], ["textile", "Textiles"], ["fabric", "Textiles"], ["fabrics", "Textiles"],
  ["acoustic", "Acoustic"], ["acoustics", "Acoustic"],
  ["hardware", "Hardware"], ["handles", "Hardware"], ["hinges", "Hardware"],
  ["doors", "Doors & Windows"], ["windows", "Doors & Windows"], ["door", "Doors & Windows"], ["window", "Doors & Windows"],
  // Designer disciplines
  ["landscape architecture", "Landscape Architecture"], ["landscape architect", "Landscape Architecture"],
  ["urban design", "Urban Design"], ["urban planning", "Urban Design"],
  ["industrial design", "Industrial Design"],
]);

/** Material terms → canonical material name. */
const MATERIAL_SYNONYMS = new Map<string, string>([
  ["concrete", "Concrete"], ["béton", "Concrete"], ["beton", "Concrete"],
  ["wood", "Wood"], ["wooden", "Wood"], ["timber", "Wood"],
  ["glass", "Glass"], ["glazed", "Glass"],
  ["steel", "Steel"], ["metal", "Steel"], ["metallic", "Steel"], ["iron", "Steel"],
  ["stone", "Stone"], ["marble", "Stone"], ["granite", "Stone"], ["travertine", "Stone"], ["limestone", "Stone"],
  ["brick", "Brick"], ["masonry", "Brick"], ["brickwork", "Brick"],
  ["ceramic", "Ceramic"], ["tile", "Ceramic"], ["tiles", "Ceramic"], ["porcelain", "Ceramic"], ["terracotta", "Ceramic"],
]);

/** Style terms → canonical style name. */
const STYLE_SYNONYMS = new Map<string, string>([
  ["minimal", "Minimal"], ["minimalist", "Minimal"], ["minimalism", "Minimal"],
  ["brutalist", "Brutalist"], ["brutalism", "Brutalist"],
  ["scandinavian", "Scandinavian"], ["nordic", "Scandinavian"],
  ["modern", "Modern"], ["contemporary", "Modern"],
  ["industrial", "Industrial"],
  ["art deco", "Art Deco"], ["artdeco", "Art Deco"],
  ["parametric", "Parametric"],
  ["japanese", "Japanese"], ["zen", "Japanese"],
  ["tropical", "Tropical"],
  ["vernacular", "Vernacular"],
  ["biophilic", "Biophilic"],
]);

/** Prepositions that introduce a location phrase. */
const LOCATION_PREPS = new Set(["in", "near", "around", "from"]);

/** Words to strip entirely (articles, fillers). */
const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "with", "for", "of", "to", "by"]);

/* ═══════════════════════════════════════════════════════════════════════════
   Parser
   ═══════════════════════════════════════════════════════════════════════════ */

export function parseSearchIntent(
  query: string,
  { entities = MAP_ENTITIES }: { entities?: EntityScope } = {}
): SearchIntent {
  const raw = query.trim();
  if (!raw) {
    return { types: [], location: null, categories: [], materials: [], styles: [], freeText: "", label: "" };
  }

  const lower = raw.toLowerCase();

  // --- Step 1: Extract location (everything after the last location preposition) ---
  let location: string | null = null;
  let descriptorPart = lower;

  // Find the LAST location preposition to handle "interior designers in Milan"
  let lastPrepIdx = -1;
  let lastPrepWord = "";
  for (const prep of LOCATION_PREPS) {
    // Match as whole word with boundary
    const pattern = new RegExp(`\\b${prep}\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(lower)) !== null) {
      if (m.index > lastPrepIdx) {
        lastPrepIdx = m.index;
        lastPrepWord = prep;
      }
    }
  }

  if (lastPrepIdx >= 0) {
    const afterPrep = lower.slice(lastPrepIdx + lastPrepWord.length).trim();
    if (afterPrep.length > 0) {
      // Check if what follows is actually a location (not a vocabulary term alone)
      // We accept it as location and strip matched vocab from it later
      location = afterPrep;
      descriptorPart = lower.slice(0, lastPrepIdx).trim();
    }
  }

  // --- Step 2: Tokenize the descriptor portion ---
  const tokens = descriptorPart.split(/\s+/).filter((t) => t.length > 0);

  const types: EntityType[] = [];
  /** Adds a type only if the caller can display it, and only once. */
  const pushType = (t: EntityType) => {
    if (entities.includes(t) && !types.includes(t)) types.push(t);
  };
  const categories: string[] = [];
  const materials: string[] = [];
  const styles: string[] = [];
  const remaining: string[] = [];
  const consumed = new Set<number>(); // token indices already matched

  // --- Step 3: Multi-word phrase matching (greedy, longest first) ---
  // Try 3-word, 2-word, then 1-word phrases
  for (let len = 3; len >= 1; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      if (consumed.has(i)) continue;
      const phrase = tokens.slice(i, i + len).join(" ");

      // Type match
      const typeMatch = TYPE_MAP.get(phrase);
      if (typeMatch) {
        const alreadyMatched = types.includes(typeMatch);
        pushType(typeMatch);
        // Consumed even when the type is out of the caller's scope:
        // "products" is an entity word, not a free-text term to go matching
        // against titles.
        if (!alreadyMatched) {
          for (let j = i; j < i + len; j++) consumed.add(j);
          continue;
        }
      }

      // Category match
      const catMatch = CATEGORY_SYNONYMS.get(phrase);
      if (catMatch && !categories.includes(catMatch)) {
        categories.push(catMatch);
        for (let j = i; j < i + len; j++) consumed.add(j);
        continue;
      }

      // Style match (before material — "industrial" could be both)
      const styleMatch = STYLE_SYNONYMS.get(phrase);
      if (styleMatch && !styles.includes(styleMatch)) {
        styles.push(styleMatch);
        for (let j = i; j < i + len; j++) consumed.add(j);
        continue;
      }

      // Material match
      const matMatch = MATERIAL_SYNONYMS.get(phrase);
      if (matMatch && !materials.includes(matMatch)) {
        materials.push(matMatch);
        for (let j = i; j < i + len; j++) consumed.add(j);
        continue;
      }
    }
  }

  // Collect unmatched, non-stop-word tokens
  for (let i = 0; i < tokens.length; i++) {
    if (!consumed.has(i) && !STOP_WORDS.has(tokens[i])) {
      remaining.push(tokens[i]);
    }
  }

  // --- Step 4: Smart type inference from context ---
  // If no explicit type was mentioned, infer from other signals
  if (types.length === 0) {
    // Category hints at brand type
    const brandCategories = new Set(["Lighting", "Furniture", "Bathroom", "Kitchen", "Flooring", "Outdoor", "Textiles", "Acoustic", "Hardware", "Doors & Windows", "Surfaces"]);
    const projectCategories = new Set(["Residential", "Commercial", "Hospitality", "Cultural", "Interior", "Institutional", "Mixed-Use"]);

    const hasBrandCat = categories.some((c) => brandCategories.has(c));
    const hasProjectCat = categories.some((c) => projectCategories.has(c));

    if (hasBrandCat && !hasProjectCat) {
      /*
       * A product category with no entity word — "lighting", "chair",
       * "surface". On the map this could only ever have meant brands. With
       * products in scope the thing itself is the better first answer, and
       * the brands that make it are the second; both are pushed, in that
       * order, and ordering here is what the ranker reads as preference.
       *
       * Note this proposes types, it does not restrict to them. A query that
       * favours products still returns matching projects and brands when they
       * genuinely match — the type is a weight, never a filter.
       */
      pushType("product");
      pushType("brand");
    } else if (hasProjectCat && !hasBrandCat) {
      pushType("project");
    }

    // Material/style hints → likely project search
    if (types.length === 0 && (materials.length > 0 || styles.length > 0)) {
      pushType("project");
    }
  }

  // --- Step 5: Also check if location text contains matchable vocabulary ---
  // e.g., "lighting brands in Turkiye" — "Turkiye" is pure location, but
  // "furniture shops in central London" — "central London" has no vocab overlap
  // The location stays as-is for geocoding.

  const freeText = remaining.join(" ");

  // --- Step 6: Build human-readable label ---
  const labelParts: string[] = [];
  if (categories.length > 0) labelParts.push(categories.join(", "));
  if (materials.length > 0) labelParts.push(materials.join(", "));
  if (styles.length > 0) labelParts.push(styles.join(", "));
  if (types.length > 0) {
    const typeLabels: Record<EntityType, string> = {
      project: "Projects",
      designer: "Designers",
      brand: "Brands",
      product: "Products",
    };
    labelParts.push(types.map((t) => typeLabels[t]).join(" & "));
  }
  if (freeText) labelParts.push(`"${freeText}"`);
  const label = labelParts.join(" · ") + (location ? ` · ${titleCase(location)}` : "");

  return { types, location, categories, materials, styles, freeText, label };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
