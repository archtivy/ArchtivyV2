/**
 * Rule-based, template-driven SEO generator for Archtivy.
 * Zero AI dependency. All output is fully deterministic from database fields.
 * Designed to rank for long-tail architectural search queries and outperform
 * directory-style platforms (ArchDaily, Archello, Architonic).
 */

// ─── Input interfaces ─────────────────────────────────────────────────────────

export interface ProjectSeoInput {
  title: string;
  slug: string;
  category: string | null;
  location_city: string | null;
  location_country: string | null;
  year: number | string | null;
  area_sqft: number | null;
  materials: string[];
  description: string | null;
  gallery: { url: string; alt: string }[];
}

export interface ProductSeoInput {
  title: string;
  slug: string;
  brand: string | null;
  product_type: string | null;
  category: string | null;
  materials: string[];
  color_options: string[];
  description: string | null;
  gallery: { url: string; alt: string }[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface InternalLinkSuggestion {
  label: string;
  href: string;
  reason: string;
}

// ─── String utilities ─────────────────────────────────────────────────────────

function joinParts(parts: (string | null | undefined)[], sep = ", "): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .join(sep);
}

function truncateAt(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 1).trimEnd()}…`;
}

// ─── PROJECT: keyword builders ────────────────────────────────────────────────

export function buildProjectPrimaryKeyword(p: ProjectSeoInput): string {
  const location = joinParts([p.location_city, p.location_country]);
  const parts: string[] = [];
  if (p.category) parts.push(p.category.toLowerCase());
  if (location) parts.push(location);
  return parts.length > 0 ? parts.join(" ") : p.title;
}

export function buildProjectSecondaryKeywords(p: ProjectSeoInput): string[] {
  const kw = new Set<string>();
  const location = joinParts([p.location_city, p.location_country]);

  if (location && p.category) {
    kw.add(`${p.category.toLowerCase()} architecture ${location}`);
  }
  if (p.location_country && p.category) {
    kw.add(`${p.category.toLowerCase()} architecture ${p.location_country}`);
  }
  for (const m of p.materials.slice(0, 3)) {
    if (p.category) kw.add(`${m.toLowerCase()} ${p.category.toLowerCase()}`);
    if (p.location_country) kw.add(`${m.toLowerCase()} architecture ${p.location_country}`);
  }
  if (p.year && p.category) {
    kw.add(`${p.category.toLowerCase()} architecture ${p.year}`);
  }
  if (location) kw.add(`architecture ${location}`);

  return [...kw].slice(0, 6);
}

// ─── PROJECT: title + meta ────────────────────────────────────────────────────

export function buildProjectSeoTitle(p: ProjectSeoInput): string {
  const location = joinParts([p.location_city, p.location_country]);
  const parts: string[] = [];

  if (p.category) parts.push(p.category);
  if (location) parts.push(`in ${location}`);
  parts.push(`— ${p.title}`);

  const full = `${parts.join(" ")} | Archtivy`;
  if (full.length <= 70) return full;

  const short = `${p.title} | Archtivy`;
  return short.length <= 70 ? short : truncateAt(short, 70);
}

export function buildProjectMetaDescription(p: ProjectSeoInput): string {
  const qualifiers: string[] = [];
  const location = joinParts([p.location_city, p.location_country]);

  if (location) qualifiers.push(`in ${location}`);
  if (p.year) qualifiers.push(`(${p.year})`);
  if (p.area_sqft) qualifiers.push(`${p.area_sqft.toLocaleString("en-US")} sq ft`);

  const headline = [p.title, ...qualifiers].join(" ");
  const materialPart =
    p.materials.length > 0 ? joinParts(p.materials.slice(0, 2)) : "";
  const parts = [headline, materialPart, "Full project record on Archtivy."].filter(Boolean);

  return truncateAt(parts.join(". "), 160);
}

// ─── PROJECT: FAQ ─────────────────────────────────────────────────────────────

export function generateProjectFaq(p: ProjectSeoInput): FaqItem[] {
  const faqs: FaqItem[] = [];
  const location = joinParts([p.location_city, p.location_country]);

  faqs.push({
    question: `What type of project is ${p.title}?`,
    answer: p.category
      ? `${p.title} is a ${p.category.toLowerCase()} project.`
      : "The project type is not documented in the current listing record.",
  });

  if (location) {
    faqs.push({
      question: `Where is ${p.title} located?`,
      answer: `${p.title} is located in ${location}.`,
    });
  }

  if (p.year) {
    faqs.push({
      question: `When was ${p.title} completed?`,
      answer: `${p.title} was completed in ${p.year}.`,
    });
  }

  if (p.materials.length > 0) {
    faqs.push({
      question: `What materials were used in ${p.title}?`,
      answer: `The project is constructed with ${joinParts(p.materials, ", ")}.`,
    });
    faqs.push({
      question: `Why is ${p.materials[0]} used in this project?`,
      answer: getProjectMaterialRationale(p.materials[0], p.category, p.location_country),
    });
  }

  if (p.area_sqft) {
    faqs.push({
      question: `How large is ${p.title}?`,
      answer: `${p.title} spans ${p.area_sqft.toLocaleString("en-US")} square feet.`,
    });
  }

  return faqs.slice(0, 6);
}

// ─── PROJECT: internal links ──────────────────────────────────────────────────

export function buildProjectInternalLinks(p: ProjectSeoInput): InternalLinkSuggestion[] {
  const links: InternalLinkSuggestion[] = [
    {
      label: "All projects",
      href: "/explore/projects",
      reason: "Primary index — all project detail pages should receive a link from the explore index.",
    },
  ];

  if (p.category) {
    links.push({
      label: `${p.category} projects`,
      href: `/explore/projects?category=${encodeURIComponent(p.category)}`,
      reason: `Category cluster: ${p.category}.`,
    });
  }
  if (p.location_country) {
    links.push({
      label: `Architecture in ${p.location_country}`,
      href: `/explore/projects?country=${encodeURIComponent(p.location_country)}`,
      reason: `Geographic cluster: ${p.location_country}.`,
    });
  }
  if (p.location_city) {
    links.push({
      label: `Projects in ${p.location_city}`,
      href: `/explore/projects?city=${encodeURIComponent(p.location_city)}`,
      reason: `City-level cluster: ${p.location_city}.`,
    });
  }
  for (const m of p.materials.slice(0, 2)) {
    links.push({
      label: `${m} projects`,
      href: `/explore/projects?material=${encodeURIComponent(m)}`,
      reason: `Material cluster: ${m}.`,
    });
  }

  return links;
}

// ─── PRODUCT: keyword builders ────────────────────────────────────────────────

export function buildProductPrimaryKeyword(p: ProductSeoInput): string {
  const parts: string[] = [];
  if (p.brand) parts.push(p.brand);
  parts.push(p.title);
  return parts.join(" ");
}

export function buildProductSecondaryKeywords(p: ProductSeoInput): string[] {
  const kw = new Set<string>();

  if (p.brand) {
    if (p.product_type) kw.add(`${p.brand} ${p.product_type.toLowerCase()}`);
    if (p.category) kw.add(`${p.brand} ${p.category.toLowerCase()}`);
  }
  for (const m of p.materials.slice(0, 2)) {
    if (p.product_type) kw.add(`${m.toLowerCase()} ${p.product_type.toLowerCase()}`);
    if (p.category) kw.add(`${m.toLowerCase()} ${p.category.toLowerCase()}`);
  }
  if (p.product_type) {
    kw.add(`${p.product_type.toLowerCase()} specification`);
    kw.add(`${p.product_type.toLowerCase()} architecture`);
  }

  return [...kw].slice(0, 6);
}

// ─── PRODUCT: title + meta ────────────────────────────────────────────────────

export function buildProductSeoTitle(p: ProductSeoInput): string {
  const parts: string[] = [];
  if (p.brand) parts.push(p.brand);
  parts.push(p.title);

  if (p.product_type) {
    const titleLower = p.title.toLowerCase();
    const typeLower = p.product_type.toLowerCase();
    if (!titleLower.includes(typeLower)) {
      parts.push(`— ${p.product_type}`);
    }
  }
  parts.push("| Archtivy");

  const full = parts.join(" ");
  if (full.length <= 70) return full;
  return truncateAt(`${p.title} | Archtivy`, 70);
}

export function buildProductMetaDescription(p: ProductSeoInput): string {
  const qualifiers: string[] = [];
  if (p.brand) qualifiers.push(`by ${p.brand}`);
  if (p.product_type) qualifiers.push(p.product_type);
  else if (p.category) qualifiers.push(p.category);

  const materialPart =
    p.materials.length > 0 ? joinParts(p.materials.slice(0, 2)) : "";

  const parts = [
    p.title,
    qualifiers.length > 0 ? qualifiers.join(", ") : null,
    materialPart || null,
    "Product specification on Archtivy.",
  ].filter(Boolean) as string[];

  return truncateAt(parts.join(". "), 160);
}

// ─── PRODUCT: FAQ ─────────────────────────────────────────────────────────────

export function generateProductFaq(p: ProductSeoInput): FaqItem[] {
  const faqs: FaqItem[] = [];

  if (p.brand) {
    faqs.push({
      question: `Who manufactures the ${p.title}?`,
      answer: `The ${p.title} is manufactured by ${p.brand}.`,
    });
  }

  faqs.push({
    question: `What category does the ${p.title} belong to?`,
    answer: p.product_type
      ? `The ${p.title} is classified as a ${p.product_type.toLowerCase()}${p.category ? ` within the ${p.category.toLowerCase()} category` : ""}.`
      : p.category
      ? `The ${p.title} belongs to the ${p.category.toLowerCase()} category.`
      : "Category information is not documented in the current listing record.",
  });

  if (p.materials.length > 0) {
    faqs.push({
      question: `What materials is the ${p.title} made from?`,
      answer: `The ${p.title} is constructed from ${joinParts(p.materials, ", ")}.`,
    });
    faqs.push({
      question: `Why is ${p.materials[0]} used in the ${p.title}?`,
      answer: getProductMaterialRationale(p.materials[0], p.product_type),
    });
  }

  if (p.color_options.length > 0) {
    faqs.push({
      question: `What colour options are available for the ${p.title}?`,
      answer: `The ${p.title} is available in: ${joinParts(p.color_options, ", ")}.`,
    });
  }

  if (p.brand) {
    faqs.push({
      question: `Where can I find more ${p.brand} products?`,
      answer: `${p.brand} products indexed on Archtivy are discoverable via the product specification record and associated project credits.`,
    });
  }

  return faqs.slice(0, 6);
}

// ─── PRODUCT: internal links ──────────────────────────────────────────────────

export function buildProductInternalLinks(p: ProductSeoInput): InternalLinkSuggestion[] {
  const links: InternalLinkSuggestion[] = [
    {
      label: "All products",
      href: "/explore/products",
      reason: "Primary index — all product detail pages should receive a link from the explore index.",
    },
  ];

  if (p.brand) {
    links.push({
      label: `${p.brand} products`,
      href: `/explore/products?brand=${encodeURIComponent(p.brand)}`,
      reason: `Brand cluster: ${p.brand}.`,
    });
  }
  if (p.product_type) {
    links.push({
      label: `${p.product_type}s`,
      href: `/explore/products?type=${encodeURIComponent(p.product_type)}`,
      reason: `Product type cluster: ${p.product_type}.`,
    });
  }
  if (p.category) {
    links.push({
      label: p.category,
      href: `/explore/products?category=${encodeURIComponent(p.category)}`,
      reason: `Category cluster: ${p.category}.`,
    });
  }
  for (const m of p.materials.slice(0, 2)) {
    links.push({
      label: `${m} products`,
      href: `/explore/products?material=${encodeURIComponent(m)}`,
      reason: `Material cluster: ${m}.`,
    });
  }

  return links;
}

// ─── Canonical path ───────────────────────────────────────────────────────────

export function buildListingCanonicalPath(
  type: "project" | "product",
  slugOrId: string
): string {
  return type === "project" ? `/projects/${slugOrId}` : `/products/${slugOrId}`;
}

// ─── Material extraction helper ───────────────────────────────────────────────

/**
 * Normalises the `materials` field from ProjectCanonical / ProductCanonical into
 * a plain string array, regardless of whether the canonical model stores them as
 * strings or as objects with a `material_display_name` property.
 */
export function extractMaterialNames(materials: unknown): string[] {
  if (!Array.isArray(materials)) return [];
  return materials.flatMap((m) => {
    if (typeof m === "string" && m.trim()) return [m.trim()];
    if (typeof m === "object" && m !== null) {
      const obj = m as Record<string, unknown>;
      const name =
        obj.material_display_name ?? obj.display_name ?? obj.name ?? obj.label;
      if (typeof name === "string" && name.trim()) return [name.trim()];
    }
    return [];
  });
}

/**
 * Extracts a brand name from the `brands_used` JSONB field on product listings.
 * Returns null when the field is absent or empty.
 */
export function extractBrandName(brandsUsed: unknown): string | null {
  if (!Array.isArray(brandsUsed) || brandsUsed.length === 0) return null;
  const first = brandsUsed[0] as Record<string, unknown>;
  const name = first.name ?? first.display_name ?? first.brand_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

// ─── Material rationale library ───────────────────────────────────────────────

const PROJECT_MATERIAL_RATIONALE: Record<string, string> = {
  "Rammed earth":
    "Rammed earth provides high thermal mass, absorbing solar heat during the day and releasing it slowly at night. This passive thermal behaviour reduces reliance on mechanical systems, making it well-suited to desert and semi-arid climates.",
  Steel:
    "Steel contributes tensile strength, seismic resistance, and structural precision. It is frequently combined with compressive materials such as rammed earth or concrete to form hybrid structural systems suited to regions with active seismicity.",
  Glass:
    "Glass establishes visual and spatial continuity between interior and exterior, and supports passive solar design strategies when combined with appropriate shading and orientation.",
  Concrete:
    "Concrete provides structural durability, compressive strength, and thermal mass. Its formwork flexibility allows a wide range of structural and expressive applications across residential and civic typologies.",
  Timber:
    "Timber offers structural efficiency, thermal insulation, and a lower embodied carbon footprint compared to concrete and steel, making it a considered specification for environmentally responsive projects.",
  Brick:
    "Brick provides thermal mass, load-bearing capacity, and material durability. Its use in residential and civic typologies is documented across climates and construction traditions.",
  CLT: "Cross-laminated timber provides dimensional stability, fire resistance, and structural efficiency. Its prefabricated nature supports precise construction timelines on constrained sites.",
  Stone:
    "Stone provides compressive strength, durability, and thermal mass. In structural and cladding applications it performs well across a wide range of climatic conditions.",
};

function getProjectMaterialRationale(
  material: string,
  category: string | null,
  country: string | null
): string {
  const known = PROJECT_MATERIAL_RATIONALE[material];
  if (known) return known;
  const ctx = joinParts([category?.toLowerCase(), country], " architecture in ");
  return ctx
    ? `${material} is specified as a primary construction material in this ${ctx} project.`
    : `${material} is specified as a primary construction material in this project.`;
}

const PRODUCT_MATERIAL_RATIONALE: Record<string, string> = {
  "Full-grain leather":
    "Full-grain leather retains the complete natural grain of the hide without surface correction. It develops a patina through use and offers greater durability than corrected-grain alternatives, making it a preferred specification for premium furniture.",
  Stone:
    "Stone provides structural rigidity, visual weight, and thermal mass. In furniture and product design it is commonly used for bases and surfaces where durability and material presence are primary specification criteria.",
  Steel:
    "Steel provides structural precision, tensile strength, and an extended service life. In furniture and product design it is used for frames, bases, and load-bearing components.",
  Timber:
    "Timber is specified for structural efficiency, thermal character, and a reduced embodied carbon footprint. In furniture production it is used for frames, surfaces, and structural elements.",
  Marble:
    "Marble is specified for its visual presence, surface hardness, and natural variation. Each slab is unique, making it a considered material choice in high-specification interior products.",
  Glass:
    "Glass is specified for optical clarity, cleanability, and visual lightness. In furniture applications it is used for surfaces, shelving, and structural panels.",
  Brass:
    "Brass offers corrosion resistance, warm visual character, and machinability. In furniture and product design it is used for hardware, accents, and precision structural details.",
  Aluminium:
    "Aluminium provides corrosion resistance, a low weight-to-strength ratio, and design flexibility. It is commonly specified for furniture frames and structural components in contemporary interior products.",
  Walnut:
    "Walnut is a hardwood specified for its fine grain, structural density, and warm tonal character. In furniture production it is used for frames, veneers, and solid-wood surfaces.",
  Oak:
    "Oak is a hardwood prized for its durability, grain definition, and material stability. It is widely specified for furniture frames, surfaces, and flooring in residential and hospitality interiors.",
};

function getProductMaterialRationale(
  material: string,
  productType: string | null
): string {
  const known = PRODUCT_MATERIAL_RATIONALE[material];
  if (known) return known;
  return productType
    ? `${material} is specified as a primary material in this ${productType.toLowerCase()}.`
    : `${material} is specified as a primary construction material in this product.`;
}
