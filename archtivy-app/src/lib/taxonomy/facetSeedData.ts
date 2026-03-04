/**
 * Facet seed data: flat tag dimensions for listings.
 * Used by the admin seed action to populate facets + facet_values.
 */

export interface FacetSeed {
  slug: string;
  label: string;
  description: string;
  applies_to: ("product" | "project")[];
  is_multi_select: boolean;
  sort_order: number;
  values: { slug: string; label: string; sort_order: number }[];
}

export const FACET_SEEDS: FacetSeed[] = [
  {
    slug: "room-type",
    label: "Room Type",
    description: "Where this product is typically used",
    applies_to: ["product"],
    is_multi_select: true,
    sort_order: 0,
    values: [
      { slug: "living-room", label: "Living Room", sort_order: 0 },
      { slug: "bedroom", label: "Bedroom", sort_order: 1 },
      { slug: "bathroom", label: "Bathroom", sort_order: 2 },
      { slug: "kitchen", label: "Kitchen", sort_order: 3 },
      { slug: "dining-room", label: "Dining Room", sort_order: 4 },
      { slug: "office", label: "Office", sort_order: 5 },
      { slug: "hallway", label: "Hallway", sort_order: 6 },
      { slug: "outdoor", label: "Outdoor", sort_order: 7 },
      { slug: "commercial-space", label: "Commercial Space", sort_order: 8 },
      { slug: "public-space", label: "Public Space", sort_order: 9 },
      { slug: "other", label: "Other", sort_order: 10 },
    ],
  },
  {
    slug: "architectural-element",
    label: "Architectural Element",
    description: "Architectural elements this project relates to",
    applies_to: ["project"],
    is_multi_select: true,
    sort_order: 1,
    values: [
      { slug: "wall", label: "Wall", sort_order: 0 },
      { slug: "floor", label: "Floor", sort_order: 1 },
      { slug: "ceiling", label: "Ceiling", sort_order: 2 },
      { slug: "staircase", label: "Staircase", sort_order: 3 },
      { slug: "facade", label: "Facade", sort_order: 4 },
      { slug: "column", label: "Column", sort_order: 5 },
      { slug: "window", label: "Window", sort_order: 6 },
      { slug: "door", label: "Door", sort_order: 7 },
      { slug: "partition", label: "Partition", sort_order: 8 },
      { slug: "roof", label: "Roof", sort_order: 9 },
    ],
  },
  {
    slug: "finish-texture",
    label: "Finish / Texture",
    description: "Surface finish or texture of the product",
    applies_to: ["product"],
    is_multi_select: true,
    sort_order: 2,
    values: [
      { slug: "matte", label: "Matte", sort_order: 0 },
      { slug: "glossy", label: "Glossy", sort_order: 1 },
      { slug: "satin", label: "Satin", sort_order: 2 },
      { slug: "textured", label: "Textured", sort_order: 3 },
      { slug: "brushed", label: "Brushed", sort_order: 4 },
      { slug: "polished", label: "Polished", sort_order: 5 },
      { slug: "raw", label: "Raw", sort_order: 6 },
      { slug: "patina", label: "Patina", sort_order: 7 },
      { slug: "hammered", label: "Hammered", sort_order: 8 },
      { slug: "etched", label: "Etched", sort_order: 9 },
    ],
  },
  {
    slug: "sustainability",
    label: "Sustainability",
    description: "Environmental certifications and sustainability features",
    applies_to: ["product"],
    is_multi_select: true,
    sort_order: 3,
    values: [
      { slug: "recycled-content", label: "Recycled Content", sort_order: 0 },
      { slug: "fsc-certified", label: "FSC Certified", sort_order: 1 },
      { slug: "low-voc", label: "Low VOC", sort_order: 2 },
      { slug: "cradle-to-cradle", label: "Cradle to Cradle", sort_order: 3 },
      { slug: "energy-star", label: "Energy Star", sort_order: 4 },
      { slug: "greenguard", label: "GREENGUARD", sort_order: 5 },
      { slug: "biodegradable", label: "Biodegradable", sort_order: 6 },
      { slug: "locally-sourced", label: "Locally Sourced", sort_order: 7 },
    ],
  },
  {
    slug: "design-style",
    label: "Design Style",
    description: "Aesthetic or design movement",
    applies_to: ["product", "project"],
    is_multi_select: true,
    sort_order: 4,
    values: [
      { slug: "minimalist", label: "Minimalist", sort_order: 0 },
      { slug: "mid-century-modern", label: "Mid-Century Modern", sort_order: 1 },
      { slug: "scandinavian", label: "Scandinavian", sort_order: 2 },
      { slug: "industrial", label: "Industrial", sort_order: 3 },
      { slug: "art-deco", label: "Art Deco", sort_order: 4 },
      { slug: "contemporary", label: "Contemporary", sort_order: 5 },
      { slug: "traditional", label: "Traditional", sort_order: 6 },
      { slug: "rustic", label: "Rustic", sort_order: 7 },
      { slug: "biophilic", label: "Biophilic", sort_order: 8 },
      { slug: "brutalist", label: "Brutalist", sort_order: 9 },
      { slug: "japanese", label: "Japanese", sort_order: 10 },
      { slug: "mediterranean", label: "Mediterranean", sort_order: 11 },
    ],
  },
  {
    slug: "color-family",
    label: "Color Family",
    description: "Primary color family of the product",
    applies_to: ["product"],
    is_multi_select: true,
    sort_order: 5,
    values: [
      { slug: "black", label: "Black", sort_order: 0 },
      { slug: "white", label: "White", sort_order: 1 },
      { slug: "gray", label: "Gray", sort_order: 2 },
      { slug: "silver", label: "Silver", sort_order: 3 },
      { slug: "brown", label: "Brown", sort_order: 4 },
      { slug: "beige", label: "Beige", sort_order: 5 },
      { slug: "wood", label: "Wood", sort_order: 6 },
      { slug: "natural", label: "Natural", sort_order: 7 },
      { slug: "blue", label: "Blue", sort_order: 8 },
      { slug: "green", label: "Green", sort_order: 9 },
      { slug: "red", label: "Red", sort_order: 10 },
      { slug: "yellow", label: "Yellow", sort_order: 11 },
      { slug: "orange", label: "Orange", sort_order: 12 },
      { slug: "brass", label: "Brass", sort_order: 13 },
      { slug: "copper", label: "Copper", sort_order: 14 },
      { slug: "gold", label: "Gold", sort_order: 15 },
      { slug: "chrome", label: "Chrome", sort_order: 16 },
      { slug: "other", label: "Other", sort_order: 17 },
    ],
  },
];

/** Synonym seed data: common alternative terms → taxonomy slug_path or facet_value. */
export interface SynonymSeed {
  term: string;
  /** Target taxonomy node slug_path (mutually exclusive with facet_value_slug). */
  taxonomy_slug_path?: string;
  /** Target facet slug + value slug (mutually exclusive with taxonomy_slug_path). */
  facet_slug?: string;
  facet_value_slug?: string;
}

export const SYNONYM_SEEDS: SynonymSeed[] = [
  // Furniture synonyms
  { term: "couch", taxonomy_slug_path: "furniture/seating/sofa" },
  { term: "settee", taxonomy_slug_path: "furniture/seating/sofa" },
  { term: "loveseat", taxonomy_slug_path: "furniture/seating/sofa" },
  { term: "recliner", taxonomy_slug_path: "furniture/seating/armchair" },
  { term: "barstool", taxonomy_slug_path: "furniture/seating/bar-stool" },
  { term: "credenza", taxonomy_slug_path: "furniture/storage/sideboard" },
  { term: "buffet", taxonomy_slug_path: "furniture/storage/sideboard" },
  { term: "bureau", taxonomy_slug_path: "furniture/beds-bedroom/dresser" },
  { term: "chest of drawers", taxonomy_slug_path: "furniture/beds-bedroom/dresser" },
  // Surfaces synonyms
  { term: "worktop", taxonomy_slug_path: "surfaces-materials/countertops-worktops" },
  { term: "countertop", taxonomy_slug_path: "surfaces-materials/countertops-worktops" },
  { term: "benchtop", taxonomy_slug_path: "surfaces-materials/countertops-worktops" },
  { term: "parquet", taxonomy_slug_path: "surfaces-materials/flooring/wood-flooring" },
  { term: "hardwood floor", taxonomy_slug_path: "surfaces-materials/flooring/wood-flooring" },
  { term: "LVT", taxonomy_slug_path: "surfaces-materials/flooring/vinyl-lvt" },
  { term: "luxury vinyl", taxonomy_slug_path: "surfaces-materials/flooring/vinyl-lvt" },
  // Fixtures synonyms
  { term: "tap", taxonomy_slug_path: "fixtures-fittings/bathroom/faucet" },
  { term: "WC", taxonomy_slug_path: "fixtures-fittings/bathroom/toilet" },
  { term: "lavatory", taxonomy_slug_path: "fixtures-fittings/bathroom/toilet" },
  { term: "washbasin", taxonomy_slug_path: "fixtures-fittings/bathroom/basin" },
  // Lighting synonyms
  { term: "luminaire", taxonomy_slug_path: "lighting" },
  { term: "sconce", taxonomy_slug_path: "lighting/wall/wall-sconce" },
  { term: "spotlight", taxonomy_slug_path: "lighting/ceiling/downlight" },
  { term: "LED strip", taxonomy_slug_path: "lighting/linear-strip/strip-light" },
  // Hardware synonyms
  { term: "smart lock", taxonomy_slug_path: "building-systems/security/access-control" },
  { term: "deadbolt", taxonomy_slug_path: "hardware/locks-security/lock" },
  // Systems synonyms
  { term: "thermostat", taxonomy_slug_path: "building-systems/home-automation/thermostat" },
  { term: "smart home", taxonomy_slug_path: "building-systems/home-automation" },
  // Style facet synonyms
  { term: "modern", facet_slug: "design-style", facet_value_slug: "contemporary" },
  { term: "scandi", facet_slug: "design-style", facet_value_slug: "scandinavian" },
  { term: "mid-century", facet_slug: "design-style", facet_value_slug: "mid-century-modern" },
  { term: "wabi-sabi", facet_slug: "design-style", facet_value_slug: "japanese" },
  { term: "eco-friendly", facet_slug: "sustainability", facet_value_slug: "recycled-content" },
  { term: "sustainable", facet_slug: "sustainability", facet_value_slug: "recycled-content" },
];
