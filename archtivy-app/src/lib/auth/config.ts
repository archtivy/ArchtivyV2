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

export const DESIGNER_TITLES = [
  "Architect",
  "Interior Designer",
  "Landscape Architect",
  "Urban Planner",
  "Lighting Designer",
  "Industrial Designer",
  "Product Designer",
  "Furniture Designer",
  "Engineer / Structural",
  "Visualization / 3D Artist",
  "Photographer",
  "Studio",
  "Other",
] as const;

export type DesignerTitle = (typeof DESIGNER_TITLES)[number];

export const BRAND_TYPES = [
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
  "Other",
] as const;

export type BrandType = (typeof BRAND_TYPES)[number];

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
