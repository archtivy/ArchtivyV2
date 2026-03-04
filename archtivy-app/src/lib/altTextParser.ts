/**
 * Deterministic alt-text parser for Image → Product suggestion scoring.
 * Extracts materials, colors, objects, brands, and generic tokens from alt text.
 * Produces an FTS tsquery string for Postgres full-text search.
 */

// ── Dictionaries ────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","shall","can",
  "need","must","that","this","these","those","it","its","my","your","his",
  "her","our","their","which","who","whom","what","where","when","how","not",
  "no","nor","if","then","than","too","very","just","about","above","after",
  "again","all","also","am","any","as","because","before","below","between",
  "both","each","few","further","here","into","more","most","other","out",
  "over","own","same","so","some","such","through","under","until","up",
  "while","during","image","photo","picture","view","showing","shows","seen",
  "features","featuring","using","used","made","designed","interior","exterior",
]);

const MATERIAL_DICT = new Set([
  "marble","granite","quartzite","quartz","travertine","limestone","sandstone",
  "slate","onyx","basalt","terrazzo","concrete","cement","plaster","stucco",
  "brick","stone","ceramic","porcelain","tile","mosaic","glass",
  "oak","walnut","teak","mahogany","pine","birch","maple","ash","cherry",
  "cedar","bamboo","rattan","wicker","wood","timber","plywood","veneer",
  "laminate","mdf","hardwood","softwood",
  "steel","iron","aluminum","aluminium","brass","copper","bronze","chrome",
  "nickel","zinc","titanium","metal",
  "leather","suede","fabric","linen","cotton","wool","silk","velvet",
  "chenille","boucle","tweed","jute","sisal","hemp",
  "vinyl","acrylic","resin","fiberglass","carbon","rubber","paper","cork",
  "corian","dekton","neolith","sintered","porcelain",
]);

const COLOR_DICT = new Set([
  "black","white","gray","grey","silver","brown","beige","tan","cream","ivory",
  "taupe","charcoal","navy","blue","green","red","yellow","orange","pink",
  "purple","violet","teal","turquoise","aqua","coral","magenta","indigo",
  "burgundy","maroon","olive","sage","mint","blush","rust","terracotta","sand",
  "champagne","gold","golden","rose","natural","matte","glossy","satin",
  "warm","cool","dark","light","neutral",
]);

const OBJECT_DICT = new Set([
  "faucet","tap","sink","basin","bathtub","tub","shower","toilet","bidet","vanity",
  "countertop","counter","worktop","benchtop","backsplash","splashback",
  "cabinet","cupboard","drawer","shelf","shelving","bookshelf","wardrobe",
  "closet","pantry","island",
  "table","desk","chair","stool","bench","sofa","couch","armchair","ottoman",
  "pouf","bed","headboard","nightstand","dresser","console","sideboard",
  "credenza","buffet",
  "light","lamp","chandelier","pendant","sconce","spotlight","fixture","luminaire",
  "tile","flooring","floor","wall","ceiling","panel","cladding","wallpaper",
  "moulding","molding","trim","baseboard","cornice",
  "door","handle","knob","pull","hinge","lock","window","frame","curtain",
  "blind","shade","shutter",
  "mirror","rug","carpet","mat","cushion","pillow","throw","vase","planter","pot",
  "railing","balustrade","staircase","step","handrail",
  "fireplace","mantel","grate","radiator",
  "switch","outlet","socket","thermostat",
  "appliance","oven","range","hood","refrigerator","dishwasher","microwave",
]);

/** Max terms in the FTS tsquery to avoid performance issues. */
const MAX_FTS_TERMS = 12;

// ── Types ───────────────────────────────────────────────────────────────────

export interface AltTextFeatures {
  /** Material names found (lowercased). */
  materials: string[];
  /** Color names found (lowercased). */
  colors: string[];
  /** Object/furniture/fixture names found (lowercased). */
  objects: string[];
  /** Brand names matched (original casing from input list). */
  brands: string[];
  /** All remaining meaningful tokens after stopword + dict extraction. */
  tokens: string[];
  /** Postgres-ready tsquery string: terms joined with " | ". Empty string if no terms. */
  ftsQuery: string;
  /** Whether the alt text was empty/null. */
  isEmpty: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize text: lowercase, replace non-alphanumeric with space, collapse whitespace. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detect brand names via case-insensitive substring match against the full normalized text. */
function detectBrands(normalizedText: string, brandNames: string[]): string[] {
  if (!normalizedText || brandNames.length === 0) return [];
  const matched: string[] = [];
  for (const brand of brandNames) {
    const lower = brand.toLowerCase().trim();
    if (lower.length < 2) continue; // skip single-char brand names
    if (normalizedText.includes(lower)) {
      matched.push(brand);
    }
  }
  return matched;
}

/**
 * Build a Postgres tsquery string from tokens.
 * Joins with " | " (OR), caps at MAX_FTS_TERMS.
 * Escapes single quotes and strips non-alphanumeric except underscores.
 */
function buildFtsQuery(allTokens: string[]): string {
  const unique = [...new Set(allTokens)];
  const safe = unique
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 2)
    .slice(0, MAX_FTS_TERMS);
  return safe.join(" | ");
}

// ── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse alt text into structured features for product matching.
 *
 * @param altText    The image alt text (may be null/empty).
 * @param brandNames List of known brand display names to match against.
 * @returns          Parsed features with materials, colors, objects, brands, tokens, ftsQuery.
 */
export function parseAltText(
  altText: string | null | undefined,
  brandNames: string[] = []
): AltTextFeatures {
  const empty: AltTextFeatures = {
    materials: [],
    colors: [],
    objects: [],
    brands: [],
    tokens: [],
    ftsQuery: "",
    isEmpty: true,
  };

  if (!altText || !altText.trim()) return empty;

  // Split by "|" (common alt text separator), then normalize each segment
  const segments = altText.split("|").map((s) => normalize(s)).filter(Boolean);
  const fullNormalized = segments.join(" ");

  // Tokenize
  const rawTokens = fullNormalized.split(" ").filter(Boolean);

  const materials: string[] = [];
  const colors: string[] = [];
  const objects: string[] = [];
  const remainingTokens: string[] = [];

  for (const token of rawTokens) {
    if (STOPWORDS.has(token)) continue;

    let classified = false;

    if (MATERIAL_DICT.has(token)) {
      materials.push(token);
      classified = true;
    }
    if (COLOR_DICT.has(token)) {
      colors.push(token);
      classified = true;
    }
    if (OBJECT_DICT.has(token)) {
      objects.push(token);
      classified = true;
    }

    // Token can be in multiple dicts (e.g. "brass" = material + color)
    // but still goes into remainingTokens for FTS if not classified at all
    if (!classified) {
      remainingTokens.push(token);
    }
  }

  // Detect brands
  const brands = detectBrands(fullNormalized, brandNames);

  // Deduplicate
  const dedupMaterials = [...new Set(materials)];
  const dedupColors = [...new Set(colors)];
  const dedupObjects = [...new Set(objects)];
  const dedupTokens = [...new Set(remainingTokens)];

  // Build FTS query from ALL meaningful tokens (dicts + remaining)
  const allMeaningful = [...dedupMaterials, ...dedupColors, ...dedupObjects, ...dedupTokens];
  const ftsQuery = buildFtsQuery(allMeaningful);

  return {
    materials: dedupMaterials,
    colors: dedupColors,
    objects: dedupObjects,
    brands,
    tokens: dedupTokens,
    ftsQuery,
    isEmpty: false,
  };
}
