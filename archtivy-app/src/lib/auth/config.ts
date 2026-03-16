/**
 * Whether Clerk env vars are set (auth is configured).
 * When false, sign-in/sign-up pages show "Auth not configured" instead of crashing.
 */
export function isClerkConfigured(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;
  return Boolean(
    pk &&
      sk &&
      pk !== "pk_test_xxxx" &&
      pk !== "pk_live_xxxx" &&
      !sk.startsWith("sk_xxxx")
  );
}

export type ProfileRole = "designer" | "brand" | "reader" | "admin";

/**
 * All professional titles available under role="designer".
 * Flat array for DB compatibility — existing values must remain unchanged.
 * UI components use DESIGNER_TITLE_GROUPS for grouped display.
 */
export const DESIGNER_TITLES = [
  // ── Designers ──
  "Architect",
  "Architectural Designer",
  "Interior Designer",
  "Landscape Architect",
  "Urban Designer",
  "Urban Planner",
  "Furniture Designer",
  "Lighting Designer",
  "Product Designer",
  "Industrial Designer",
  "Bathroom Furniture Designer",
  "Photographer",
  "Visualization / 3D Artist",
  "Technical Drawing Specialist",
  // ── Engineers ──
  "Structural Engineer",
  "Civil Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Environmental Engineer",
  "Façade Engineer",
  "Building Systems Engineer",
  "Engineer / Structural",
  // ── Construction / Project Delivery ──
  "General Contractor",
  "Construction Company",
  "Builder",
  "Developer",
  "Project Manager",
  "Landscape Contractor",
  "Pool Designer",
  "Pool Contractor",
  "Façade Contractor",
  "Engineering Firm",
  // ── Other ──
  "Studio",
  "Other",
] as const;

export type DesignerTitle = (typeof DESIGNER_TITLES)[number];

/** Grouped structure for UI display (onboarding, profile edit, admin forms). */
export const DESIGNER_TITLE_GROUPS: { label: string; titles: readonly string[] }[] = [
  {
    label: "Designers",
    titles: [
      "Architect",
      "Architectural Designer",
      "Interior Designer",
      "Landscape Architect",
      "Urban Designer",
      "Urban Planner",
      "Furniture Designer",
      "Lighting Designer",
      "Product Designer",
      "Industrial Designer",
      "Bathroom Furniture Designer",
      "Photographer",
      "Visualization / 3D Artist",
      "Technical Drawing Specialist",
    ],
  },
  {
    label: "Engineers",
    titles: [
      "Structural Engineer",
      "Civil Engineer",
      "Mechanical Engineer",
      "Electrical Engineer",
      "Environmental Engineer",
      "Façade Engineer",
      "Building Systems Engineer",
    ],
  },
  {
    label: "Construction / Project Delivery",
    titles: [
      "General Contractor",
      "Construction Company",
      "Builder",
      "Developer",
      "Project Manager",
      "Landscape Contractor",
      "Pool Designer",
      "Pool Contractor",
      "Façade Contractor",
      "Engineering Firm",
    ],
  },
  {
    label: "Other",
    titles: ["Studio", "Other"],
  },
];

/**
 * All brand/manufacturer types under role="brand".
 * Existing values must remain unchanged for backward compatibility.
 * UI components use BRAND_TYPE_GROUPS for grouped display.
 */
export const BRAND_TYPES = [
  // ── Existing ──
  "Manufacturer",
  "Material Brand",
  "Furniture Brand",
  "Lighting Brand",
  "Kitchen & Bath Brand",
  "Surfaces & Finishes",
  "Outdoor & Landscape Products",
  "Systems & Building Tech",
  "Supplier / Distributor",
  "Showroom / Retailer",
  "Artisan / Maker",
  // ── New categories ──
  "Ceramics & Tiles",
  "Stone & Marble",
  "Kitchens & Wardrobes",
  "Outdoor Furniture",
  "Decorative Elements",
  "Textiles",
  "Doors & Windows",
  "Flooring",
  "Wall Systems",
  "Ceiling Systems",
  "Roofing Systems",
  "Facade Systems",
  "Wood Products",
  "Concrete Products",
  "Metal Systems",
  "Architectural Fabrication",
  "Custom Fabrication",
  "Other",
] as const;

export type BrandType = (typeof BRAND_TYPES)[number];

/** Grouped structure for UI display. */
export const BRAND_TYPE_GROUPS: { label: string; types: readonly string[] }[] = [
  {
    label: "Furniture & Interiors",
    types: [
      "Furniture Brand",
      "Outdoor Furniture",
      "Lighting Brand",
      "Kitchen & Bath Brand",
      "Kitchens & Wardrobes",
      "Decorative Elements",
      "Textiles",
    ],
  },
  {
    label: "Materials & Surfaces",
    types: [
      "Material Brand",
      "Surfaces & Finishes",
      "Ceramics & Tiles",
      "Stone & Marble",
      "Flooring",
      "Wood Products",
      "Concrete Products",
    ],
  },
  {
    label: "Building Systems",
    types: [
      "Systems & Building Tech",
      "Doors & Windows",
      "Wall Systems",
      "Ceiling Systems",
      "Roofing Systems",
      "Facade Systems",
      "Metal Systems",
    ],
  },
  {
    label: "Fabrication & Supply",
    types: [
      "Manufacturer",
      "Architectural Fabrication",
      "Custom Fabrication",
      "Artisan / Maker",
      "Supplier / Distributor",
      "Showroom / Retailer",
      "Outdoor & Landscape Products",
    ],
  },
  {
    label: "Other",
    types: ["Other"],
  },
];

export const READER_TYPES = [
  "Student",
  "Academic",
  "Professional",
  "Journalist / Media",
  "Enthusiast",
  "Other",
] as const;

export type ReaderType = (typeof READER_TYPES)[number];

/** Project categories for Add Project form (required). */
export const PROJECT_CATEGORIES = [
  "Residential",
  "Commercial",
  "Hospitality",
  "Retail",
  "Office",
  "Healthcare",
  "Education",
  "Cultural",
  "Public / Civic",
  "Landscape / Urban",
  "Interior",
  "Other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

/** Product types for Add Product form (required). */
export const PRODUCT_TYPES = [
  "Furniture",
  "Lighting",
  "Fixtures & Fittings",
  "Surfaces & Materials",
  "Textiles",
  "Hardware",
  "Appliances",
  "Systems & Tech",
  "Outdoor",
  "Other",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];
