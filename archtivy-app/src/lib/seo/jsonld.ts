import { getAbsoluteUrl } from "@/lib/canonical";
import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";

/**
 * Serializes a JSON-LD object to a string safe for inline <script> tags.
 * JSON.stringify alone doesn't escape <, >, & — a description containing
 * "</script>" would break the script block. Unicode escapes are valid JSON.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * JSON-LD builder for project detail pages.
 * Schema: CreativeWork — covers architecture projects, interior designs, etc.
 */
export function buildProjectJsonLd(
  project: ProjectCanonical,
  url: string
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    url,
  };

  const desc = typeof project.description === "string" ? project.description.trim() : "";
  if (desc) ld.description = desc.slice(0, 500);

  if (project.cover?.startsWith("http")) ld.image = project.cover;

  if (project.created_at) ld.datePublished = project.created_at.slice(0, 10);
  if (project.updated_at) ld.dateModified = project.updated_at.slice(0, 10);

  if (project.owner?.displayName) {
    const creatorUrl = project.owner.username
      ? getAbsoluteUrl(`/u/${project.owner.username}`)
      : project.owner.profileId
        ? getAbsoluteUrl(`/u/id/${project.owner.profileId}`)
        : undefined;
    ld.creator = {
      "@type": "Person",
      name: project.owner.displayName,
      ...(creatorUrl ? { url: creatorUrl } : {}),
    };
  }

  const city = project.location?.city;
  const country = project.location?.country;
  const locationName = [city, country].filter(Boolean).join(", ");
  if (locationName) {
    ld.locationCreated = { "@type": "Place", name: locationName };
  }

  return ld;
}

/**
 * JSON-LD builder for product detail pages.
 * Schema: Product — covers building materials, furniture, lighting, etc.
 */
export function buildProductJsonLd(
  product: ProductCanonical,
  brandName: string | null,
  brandHref: string | null,
  url: string
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url,
  };

  const desc = typeof product.description === "string" ? product.description.trim() : "";
  if (desc) ld.description = desc.slice(0, 500);

  if (product.cover?.startsWith("http")) ld.image = product.cover;

  if (brandName) {
    const brandUrl = brandHref ? getAbsoluteUrl(brandHref) : undefined;
    ld.brand = {
      "@type": "Organization",
      name: brandName,
      ...(brandUrl ? { url: brandUrl } : {}),
    };
  }

  return ld;
}

/** Minimal profile shape used by the JSON-LD builder (avoids importing the full Profile type). */
export interface ProfileJsonLdInput {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  bio: string | null;
  location_city: string | null;
  location_country: string | null;
  location_visibility?: "public" | "private";
  website: string | null;
}

/**
 * JSON-LD builder for public profile pages.
 * Schema: Person (designers) or Organization (brands).
 */
export function buildProfileJsonLd(
  profile: ProfileJsonLdInput,
  url: string
): Record<string, unknown> {
  const isOrg = profile.role === "brand";
  const name = profile.display_name?.trim() || profile.username?.trim() || "Profile";

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isOrg ? "Organization" : "Person",
    name,
    url,
  };

  if (profile.avatar_url?.startsWith("http")) ld.image = profile.avatar_url;

  const bio = profile.bio?.trim();
  if (bio) ld.description = bio.slice(0, 500);

  if (profile.website) {
    ld.sameAs = profile.website.startsWith("http")
      ? profile.website
      : `https://${profile.website}`;
  }

  // Omit location when private
  if (profile.location_visibility !== "private") {
    const loc = [profile.location_city, profile.location_country].filter(Boolean).join(", ");
    if (loc) ld.address = { "@type": "PostalAddress", addressLocality: loc };
  }

  return ld;
}
