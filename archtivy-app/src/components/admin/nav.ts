export type AdminNavItem = {
  label: string;
  href: string;
};

export type AdminNavGroup = {
  /** Null for the first group, which needs no heading. */
  heading: string | null;
  items: AdminNavItem[];
};

/**
 * Admin sidebar nav.
 *
 * Grouped rather than a flat list of thirteen. The flat version gave Dashboard
 * and Settings identical visual weight, so there was no way to tell the daily
 * surfaces from the occasional ones without reading every label.
 *
 * Groups are by *what you are doing*, not by entity: Review is where things
 * wait for a decision, Content is inventory you browse and edit, Structure is
 * the vocabulary everything else is filed under.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    heading: null,
    items: [{ label: "Dashboard", href: "/admin" }],
  },
  {
    heading: "Review",
    items: [
      { label: "Claims", href: "/admin/claims" },
      { label: "Leads", href: "/admin/leads" },
      { label: "Magazine", href: "/admin/magazine" },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Profiles", href: "/admin/profiles" },
      { label: "Projects", href: "/admin/projects" },
      { label: "Products", href: "/admin/products" },
      { label: "Featured & Sponsors", href: "/admin/featured" },
    ],
  },
  {
    heading: "Structure",
    items: [
      { label: "Taxonomies", href: "/admin/taxonomies" },
      { label: "SEO", href: "/admin/seo" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Tools", href: "/admin/tools" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

/** Flat list, kept for anything that needs to enumerate every destination. */
export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
