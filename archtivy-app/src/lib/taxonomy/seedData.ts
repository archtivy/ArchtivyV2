/**
 * Taxonomy seed data: product + project nodes.
 * Used by the admin backfill/seed action to populate taxonomy_nodes.
 *
 * Each entry maps to a row in taxonomy_nodes. parent_slug_path is resolved
 * at insert time to find the parent UUID.
 */

export interface TaxonomySeedNode {
  domain: "product" | "project" | "material";
  depth: number;
  slug: string;
  slug_path: string;
  label: string;
  parent_slug_path: string | null;
  sort_order: number;
  /** Legacy mapping columns for backfill */
  legacy_product_type?: string;
  legacy_product_category?: string;
  legacy_product_subcategory?: string;
  legacy_project_category?: string;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function sub(
  parentSlugPath: string,
  slug: string,
  label: string,
  sortOrder: number,
  legacy?: {
    product_type?: string;
    product_category?: string;
    product_subcategory?: string;
  }
): TaxonomySeedNode {
  return {
    domain: "product",
    depth: parentSlugPath.split("/").length,
    slug,
    slug_path: `${parentSlugPath}/${slug}`,
    label,
    parent_slug_path: parentSlugPath,
    sort_order: sortOrder,
    legacy_product_type: legacy?.product_type,
    legacy_product_category: legacy?.product_category,
    legacy_product_subcategory: legacy?.product_subcategory,
  };
}

/** Helper for material-domain nodes. */
function msub(
  parentSlugPath: string,
  slug: string,
  label: string,
  sortOrder: number
): TaxonomySeedNode {
  return {
    domain: "material",
    depth: parentSlugPath.split("/").length,
    slug,
    slug_path: `${parentSlugPath}/${slug}`,
    label,
    parent_slug_path: parentSlugPath,
    sort_order: sortOrder,
  };
}

/** Helper for project-domain nodes. */
function psub(
  parentSlugPath: string,
  slug: string,
  label: string,
  sortOrder: number
): TaxonomySeedNode {
  return {
    domain: "project",
    depth: parentSlugPath.split("/").length,
    slug,
    slug_path: `${parentSlugPath}/${slug}`,
    label,
    parent_slug_path: parentSlugPath,
    sort_order: sortOrder,
  };
}

// ─── Product taxonomy nodes ──────────────────────────────────────────────────

// Each top-level type, then its categories and subcategories.
// legacy_* fields map to existing listings.product_type / product_category / product_subcategory values.

export const PRODUCT_SEED_NODES: TaxonomySeedNode[] = [
  // ── Furniture ──────────────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "furniture", slug_path: "furniture", label: "Furniture", parent_slug_path: null, sort_order: 0, legacy_product_type: "furniture" },
  // Seating
  sub("furniture", "seating", "Seating", 0, { product_type: "furniture", product_category: "seating" }),
  sub("furniture/seating", "dining-chair", "Dining chair", 0, { product_type: "furniture", product_category: "seating", product_subcategory: "dining-chair" }),
  sub("furniture/seating", "office-chair", "Office chair", 1, { product_type: "furniture", product_category: "seating", product_subcategory: "office-chair" }),
  sub("furniture/seating", "armchair", "Armchair", 2, { product_type: "furniture", product_category: "seating", product_subcategory: "armchair" }),
  sub("furniture/seating", "sofa", "Sofa", 3, { product_type: "furniture", product_category: "seating", product_subcategory: "sofa" }),
  sub("furniture/seating", "stool", "Stool", 4, { product_type: "furniture", product_category: "seating", product_subcategory: "stool" }),
  sub("furniture/seating", "bench", "Bench", 5, { product_type: "furniture", product_category: "seating", product_subcategory: "bench" }),
  sub("furniture/seating", "bar-stool", "Bar stool", 6, { product_type: "furniture", product_category: "seating", product_subcategory: "bar-stool" }),
  sub("furniture/seating", "lounge-chair", "Lounge chair", 7, { product_type: "furniture", product_category: "seating", product_subcategory: "lounge-chair" }),
  sub("furniture/seating", "side-chair", "Side chair", 8, { product_type: "furniture", product_category: "seating", product_subcategory: "side-chair" }),
  sub("furniture/seating", "accent-chair", "Accent chair", 9, { product_type: "furniture", product_category: "seating", product_subcategory: "accent-chair" }),
  sub("furniture/seating", "chaise-longue", "Chaise longue", 10, { product_type: "furniture", product_category: "seating", product_subcategory: "chaise-longue" }),
  // Tables
  sub("furniture", "tables", "Tables", 1, { product_type: "furniture", product_category: "tables" }),
  sub("furniture/tables", "dining-table", "Dining table", 0, { product_type: "furniture", product_category: "tables", product_subcategory: "dining-table" }),
  sub("furniture/tables", "coffee-table", "Coffee table", 1, { product_type: "furniture", product_category: "tables", product_subcategory: "coffee-table" }),
  sub("furniture/tables", "desk", "Desk", 2, { product_type: "furniture", product_category: "tables", product_subcategory: "desk" }),
  sub("furniture/tables", "side-table", "Side table", 3, { product_type: "furniture", product_category: "tables", product_subcategory: "side-table" }),
  sub("furniture/tables", "console-table", "Console table", 4, { product_type: "furniture", product_category: "tables", product_subcategory: "console-table" }),
  sub("furniture/tables", "work-table", "Work table", 5, { product_type: "furniture", product_category: "tables", product_subcategory: "work-table" }),
  sub("furniture/tables", "outdoor-table", "Outdoor table", 6, { product_type: "furniture", product_category: "tables", product_subcategory: "outdoor-table" }),
  sub("furniture/tables", "conference-table", "Conference table", 7, { product_type: "furniture", product_category: "tables", product_subcategory: "conference-table" }),
  sub("furniture/tables", "occasional-table", "Occasional table", 8, { product_type: "furniture", product_category: "tables", product_subcategory: "occasional-table" }),
  // Storage
  sub("furniture", "storage", "Storage", 2, { product_type: "furniture", product_category: "storage" }),
  sub("furniture/storage", "cabinet", "Cabinet", 0, { product_type: "furniture", product_category: "storage", product_subcategory: "cabinet" }),
  sub("furniture/storage", "shelving", "Shelving", 1, { product_type: "furniture", product_category: "storage", product_subcategory: "shelving" }),
  sub("furniture/storage", "wardrobe", "Wardrobe", 2, { product_type: "furniture", product_category: "storage", product_subcategory: "wardrobe" }),
  sub("furniture/storage", "sideboard", "Sideboard", 3, { product_type: "furniture", product_category: "storage", product_subcategory: "sideboard" }),
  sub("furniture/storage", "bookcase", "Bookcase", 4, { product_type: "furniture", product_category: "storage", product_subcategory: "bookcase" }),
  sub("furniture/storage", "display-cabinet", "Display cabinet", 5, { product_type: "furniture", product_category: "storage", product_subcategory: "display-cabinet" }),
  sub("furniture/storage", "storage-unit", "Storage unit", 6, { product_type: "furniture", product_category: "storage", product_subcategory: "storage-unit" }),
  sub("furniture/storage", "filing-cabinet", "Filing cabinet", 7, { product_type: "furniture", product_category: "storage", product_subcategory: "filing-cabinet" }),
  // Beds & Bedroom
  sub("furniture", "beds-bedroom", "Beds & Bedroom", 3, { product_type: "furniture", product_category: "beds-bedroom" }),
  sub("furniture/beds-bedroom", "bed-frame", "Bed frame", 0, { product_type: "furniture", product_category: "beds-bedroom", product_subcategory: "bed-frame" }),
  sub("furniture/beds-bedroom", "headboard", "Headboard", 1, { product_type: "furniture", product_category: "beds-bedroom", product_subcategory: "headboard" }),
  sub("furniture/beds-bedroom", "nightstand", "Nightstand", 2, { product_type: "furniture", product_category: "beds-bedroom", product_subcategory: "nightstand" }),
  sub("furniture/beds-bedroom", "dresser", "Dresser", 3, { product_type: "furniture", product_category: "beds-bedroom", product_subcategory: "dresser" }),
  sub("furniture/beds-bedroom", "bedside-table", "Bedside table", 4, { product_type: "furniture", product_category: "beds-bedroom", product_subcategory: "bedside-table" }),
  sub("furniture/beds-bedroom", "vanity", "Vanity", 5, { product_type: "furniture", product_category: "beds-bedroom", product_subcategory: "vanity" }),
  // Outdoor Furniture
  sub("furniture", "outdoor-furniture", "Outdoor Furniture", 4, { product_type: "furniture", product_category: "outdoor-furniture" }),
  sub("furniture/outdoor-furniture", "outdoor-seating", "Outdoor seating", 0, { product_type: "furniture", product_category: "outdoor-furniture", product_subcategory: "outdoor-seating" }),
  sub("furniture/outdoor-furniture", "outdoor-table", "Outdoor table", 1, { product_type: "furniture", product_category: "outdoor-furniture", product_subcategory: "outdoor-table" }),
  sub("furniture/outdoor-furniture", "lounge", "Lounge", 2, { product_type: "furniture", product_category: "outdoor-furniture", product_subcategory: "lounge" }),
  sub("furniture/outdoor-furniture", "garden-furniture", "Garden furniture", 3, { product_type: "furniture", product_category: "outdoor-furniture", product_subcategory: "garden-furniture" }),
  sub("furniture/outdoor-furniture", "planter-bench", "Planter bench", 4, { product_type: "furniture", product_category: "outdoor-furniture", product_subcategory: "planter-bench" }),
  // Other Furniture
  sub("furniture", "other-furniture", "Other Furniture", 5, { product_type: "furniture", product_category: "other-furniture" }),
  sub("furniture/other-furniture", "screen-room-divider", "Screen / Room divider", 0, { product_type: "furniture", product_category: "other-furniture", product_subcategory: "screen-room-divider" }),
  sub("furniture/other-furniture", "stand", "Stand", 1, { product_type: "furniture", product_category: "other-furniture", product_subcategory: "stand" }),
  sub("furniture/other-furniture", "podium", "Podium", 2, { product_type: "furniture", product_category: "other-furniture", product_subcategory: "podium" }),
  sub("furniture/other-furniture", "coat-stand", "Coat stand", 3, { product_type: "furniture", product_category: "other-furniture", product_subcategory: "coat-stand" }),
  sub("furniture/other-furniture", "magazine-rack", "Magazine rack", 4, { product_type: "furniture", product_category: "other-furniture", product_subcategory: "magazine-rack" }),

  // ── Lighting ───────────────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "lighting", slug_path: "lighting", label: "Lighting", parent_slug_path: null, sort_order: 1, legacy_product_type: "lighting" },
  sub("lighting", "ceiling", "Ceiling", 0, { product_type: "lighting", product_category: "ceiling" }),
  sub("lighting/ceiling", "pendant", "Pendant", 0, { product_type: "lighting", product_category: "ceiling", product_subcategory: "pendant" }),
  sub("lighting/ceiling", "chandelier", "Chandelier", 1, { product_type: "lighting", product_category: "ceiling", product_subcategory: "chandelier" }),
  sub("lighting/ceiling", "ceiling-fixture", "Ceiling fixture", 2, { product_type: "lighting", product_category: "ceiling", product_subcategory: "ceiling-fixture" }),
  sub("lighting/ceiling", "downlight", "Downlight", 3, { product_type: "lighting", product_category: "ceiling", product_subcategory: "downlight" }),
  sub("lighting/ceiling", "track-lighting", "Track lighting", 4, { product_type: "lighting", product_category: "ceiling", product_subcategory: "track-lighting" }),
  sub("lighting/ceiling", "recessed-light", "Recessed light", 5, { product_type: "lighting", product_category: "ceiling", product_subcategory: "recessed-light" }),
  sub("lighting", "wall", "Wall", 1, { product_type: "lighting", product_category: "wall" }),
  sub("lighting/wall", "wall-sconce", "Wall sconce", 0, { product_type: "lighting", product_category: "wall", product_subcategory: "wall-sconce" }),
  sub("lighting/wall", "wall-lamp", "Wall lamp", 1, { product_type: "lighting", product_category: "wall", product_subcategory: "wall-lamp" }),
  sub("lighting/wall", "picture-light", "Picture light", 2, { product_type: "lighting", product_category: "wall", product_subcategory: "picture-light" }),
  sub("lighting/wall", "wall-washer", "Wall washer", 3, { product_type: "lighting", product_category: "wall", product_subcategory: "wall-washer" }),
  sub("lighting", "floor-table", "Floor & Table", 2, { product_type: "lighting", product_category: "floor-table" }),
  sub("lighting/floor-table", "floor-lamp", "Floor lamp", 0, { product_type: "lighting", product_category: "floor-table", product_subcategory: "floor-lamp" }),
  sub("lighting/floor-table", "table-lamp", "Table lamp", 1, { product_type: "lighting", product_category: "floor-table", product_subcategory: "table-lamp" }),
  sub("lighting/floor-table", "desk-lamp", "Desk lamp", 2, { product_type: "lighting", product_category: "floor-table", product_subcategory: "desk-lamp" }),
  sub("lighting/floor-table", "task-lamp", "Task lamp", 3, { product_type: "lighting", product_category: "floor-table", product_subcategory: "task-lamp" }),
  sub("lighting", "outdoor-lighting", "Outdoor Lighting", 3, { product_type: "lighting", product_category: "outdoor-lighting" }),
  sub("lighting/outdoor-lighting", "outdoor-wall", "Outdoor wall", 0, { product_type: "lighting", product_category: "outdoor-lighting", product_subcategory: "outdoor-wall" }),
  sub("lighting/outdoor-lighting", "path-light", "Path light", 1, { product_type: "lighting", product_category: "outdoor-lighting", product_subcategory: "path-light" }),
  sub("lighting/outdoor-lighting", "garden-light", "Garden light", 2, { product_type: "lighting", product_category: "outdoor-lighting", product_subcategory: "garden-light" }),
  sub("lighting/outdoor-lighting", "facade-lighting", "Facade lighting", 3, { product_type: "lighting", product_category: "outdoor-lighting", product_subcategory: "facade-lighting" }),
  sub("lighting/outdoor-lighting", "bollard", "Bollard", 4, { product_type: "lighting", product_category: "outdoor-lighting", product_subcategory: "bollard" }),
  sub("lighting", "linear-strip", "Linear & Strip", 4, { product_type: "lighting", product_category: "linear-strip" }),
  sub("lighting/linear-strip", "linear-pendant", "Linear pendant", 0, { product_type: "lighting", product_category: "linear-strip", product_subcategory: "linear-pendant" }),
  sub("lighting/linear-strip", "strip-light", "Strip light", 1, { product_type: "lighting", product_category: "linear-strip", product_subcategory: "strip-light" }),
  sub("lighting/linear-strip", "cove-lighting", "Cove lighting", 2, { product_type: "lighting", product_category: "linear-strip", product_subcategory: "cove-lighting" }),
  sub("lighting/linear-strip", "linear-recessed", "Linear recessed", 3, { product_type: "lighting", product_category: "linear-strip", product_subcategory: "linear-recessed" }),
  sub("lighting", "other-lighting", "Other Lighting", 5, { product_type: "lighting", product_category: "other-lighting" }),
  sub("lighting/other-lighting", "decorative", "Decorative", 0, { product_type: "lighting", product_category: "other-lighting", product_subcategory: "decorative" }),
  sub("lighting/other-lighting", "task-lighting", "Task lighting", 1, { product_type: "lighting", product_category: "other-lighting", product_subcategory: "task-lighting" }),
  sub("lighting/other-lighting", "emergency-lighting", "Emergency lighting", 2, { product_type: "lighting", product_category: "other-lighting", product_subcategory: "emergency-lighting" }),

  // ── Fixtures & Fittings ────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "fixtures-fittings", slug_path: "fixtures-fittings", label: "Fixtures & Fittings", parent_slug_path: null, sort_order: 2, legacy_product_type: "fixtures-fittings" },
  sub("fixtures-fittings", "bathroom", "Bathroom", 0, { product_type: "fixtures-fittings", product_category: "bathroom" }),
  sub("fixtures-fittings/bathroom", "faucet", "Faucet", 0, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "faucet" }),
  sub("fixtures-fittings/bathroom", "shower", "Shower", 1, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "shower" }),
  sub("fixtures-fittings/bathroom", "bathtub", "Bathtub", 2, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "bathtub" }),
  sub("fixtures-fittings/bathroom", "toilet", "Toilet", 3, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "toilet" }),
  sub("fixtures-fittings/bathroom", "basin", "Basin", 4, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "basin" }),
  sub("fixtures-fittings/bathroom", "bathroom-accessory", "Bathroom accessory", 5, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "bathroom-accessory" }),
  sub("fixtures-fittings/bathroom", "towel-rail", "Towel rail", 6, { product_type: "fixtures-fittings", product_category: "bathroom", product_subcategory: "towel-rail" }),
  sub("fixtures-fittings", "kitchen", "Kitchen", 1, { product_type: "fixtures-fittings", product_category: "kitchen" }),
  sub("fixtures-fittings/kitchen", "kitchen-faucet", "Kitchen faucet", 0, { product_type: "fixtures-fittings", product_category: "kitchen", product_subcategory: "kitchen-faucet" }),
  sub("fixtures-fittings/kitchen", "sink", "Sink", 1, { product_type: "fixtures-fittings", product_category: "kitchen", product_subcategory: "sink" }),
  sub("fixtures-fittings/kitchen", "tap", "Tap", 2, { product_type: "fixtures-fittings", product_category: "kitchen", product_subcategory: "tap" }),
  sub("fixtures-fittings/kitchen", "kitchen-accessory", "Kitchen accessory", 3, { product_type: "fixtures-fittings", product_category: "kitchen", product_subcategory: "kitchen-accessory" }),
  sub("fixtures-fittings/kitchen", "pot-filler", "Pot filler", 4, { product_type: "fixtures-fittings", product_category: "kitchen", product_subcategory: "pot-filler" }),
  sub("fixtures-fittings", "door-window", "Door & Window", 2, { product_type: "fixtures-fittings", product_category: "door-window" }),
  sub("fixtures-fittings/door-window", "door-handle", "Door handle", 0, { product_type: "fixtures-fittings", product_category: "door-window", product_subcategory: "door-handle" }),
  sub("fixtures-fittings/door-window", "window-handle", "Window handle", 1, { product_type: "fixtures-fittings", product_category: "door-window", product_subcategory: "window-handle" }),
  sub("fixtures-fittings/door-window", "hinge", "Hinge", 2, { product_type: "fixtures-fittings", product_category: "door-window", product_subcategory: "hinge" }),
  sub("fixtures-fittings/door-window", "door-fitting", "Door fitting", 3, { product_type: "fixtures-fittings", product_category: "door-window", product_subcategory: "door-fitting" }),
  sub("fixtures-fittings/door-window", "window-fitting", "Window fitting", 4, { product_type: "fixtures-fittings", product_category: "door-window", product_subcategory: "window-fitting" }),
  sub("fixtures-fittings", "radiators-hvac", "Radiators & HVAC", 3, { product_type: "fixtures-fittings", product_category: "radiators-hvac" }),
  sub("fixtures-fittings/radiators-hvac", "radiator", "Radiator", 0, { product_type: "fixtures-fittings", product_category: "radiators-hvac", product_subcategory: "radiator" }),
  sub("fixtures-fittings/radiators-hvac", "heating-element", "Heating element", 1, { product_type: "fixtures-fittings", product_category: "radiators-hvac", product_subcategory: "heating-element" }),
  sub("fixtures-fittings/radiators-hvac", "vent", "Vent", 2, { product_type: "fixtures-fittings", product_category: "radiators-hvac", product_subcategory: "vent" }),
  sub("fixtures-fittings/radiators-hvac", "grille", "Grille", 3, { product_type: "fixtures-fittings", product_category: "radiators-hvac", product_subcategory: "grille" }),
  sub("fixtures-fittings", "other-fixtures", "Other Fixtures", 4, { product_type: "fixtures-fittings", product_category: "other-fixtures" }),
  sub("fixtures-fittings/other-fixtures", "rail", "Rail", 0, { product_type: "fixtures-fittings", product_category: "other-fixtures", product_subcategory: "rail" }),
  sub("fixtures-fittings/other-fixtures", "hook", "Hook", 1, { product_type: "fixtures-fittings", product_category: "other-fixtures", product_subcategory: "hook" }),
  sub("fixtures-fittings/other-fixtures", "bracket", "Bracket", 2, { product_type: "fixtures-fittings", product_category: "other-fixtures", product_subcategory: "bracket" }),

  // ── Surfaces & Materials ───────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "surfaces-materials", slug_path: "surfaces-materials", label: "Surfaces & Materials", parent_slug_path: null, sort_order: 3, legacy_product_type: "surfaces-materials" },
  sub("surfaces-materials", "flooring", "Flooring", 0, { product_type: "surfaces-materials", product_category: "flooring" }),
  sub("surfaces-materials/flooring", "wood-flooring", "Wood flooring", 0, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "wood-flooring" }),
  sub("surfaces-materials/flooring", "tile-flooring", "Tile flooring", 1, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "tile-flooring" }),
  sub("surfaces-materials/flooring", "stone-flooring", "Stone flooring", 2, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "stone-flooring" }),
  sub("surfaces-materials/flooring", "resin-flooring", "Resin flooring", 3, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "resin-flooring" }),
  sub("surfaces-materials/flooring", "carpet", "Carpet", 4, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "carpet" }),
  sub("surfaces-materials/flooring", "vinyl-lvt", "Vinyl / LVT", 5, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "vinyl-lvt" }),
  sub("surfaces-materials/flooring", "laminate-flooring", "Laminate flooring", 6, { product_type: "surfaces-materials", product_category: "flooring", product_subcategory: "laminate-flooring" }),
  sub("surfaces-materials", "wall-surfaces", "Wall Surfaces", 1, { product_type: "surfaces-materials", product_category: "wall-surfaces" }),
  sub("surfaces-materials/wall-surfaces", "wall-tile", "Wall tile", 0, { product_type: "surfaces-materials", product_category: "wall-surfaces", product_subcategory: "wall-tile" }),
  sub("surfaces-materials/wall-surfaces", "porcelain-wall-tile", "Porcelain wall tile", 1, { product_type: "surfaces-materials", product_category: "wall-surfaces", product_subcategory: "porcelain-wall-tile" }),
  sub("surfaces-materials/wall-surfaces", "wall-panel", "Wall panel", 2, { product_type: "surfaces-materials", product_category: "wall-surfaces", product_subcategory: "wall-panel" }),
  sub("surfaces-materials/wall-surfaces", "stone-cladding", "Stone cladding", 3, { product_type: "surfaces-materials", product_category: "wall-surfaces", product_subcategory: "stone-cladding" }),
  sub("surfaces-materials/wall-surfaces", "wood-cladding", "Wood cladding", 4, { product_type: "surfaces-materials", product_category: "wall-surfaces", product_subcategory: "wood-cladding" }),
  sub("surfaces-materials/wall-surfaces", "wall-covering", "Wall covering", 5, { product_type: "surfaces-materials", product_category: "wall-surfaces", product_subcategory: "wall-covering" }),
  sub("surfaces-materials", "countertops-worktops", "Countertops & Worktops", 2, { product_type: "surfaces-materials", product_category: "countertops-worktops" }),
  sub("surfaces-materials/countertops-worktops", "stone-worktop", "Stone worktop", 0, { product_type: "surfaces-materials", product_category: "countertops-worktops", product_subcategory: "stone-worktop" }),
  sub("surfaces-materials/countertops-worktops", "solid-surface", "Solid surface", 1, { product_type: "surfaces-materials", product_category: "countertops-worktops", product_subcategory: "solid-surface" }),
  sub("surfaces-materials/countertops-worktops", "laminate", "Laminate", 2, { product_type: "surfaces-materials", product_category: "countertops-worktops", product_subcategory: "laminate" }),
  sub("surfaces-materials/countertops-worktops", "wood-worktop", "Wood worktop", 3, { product_type: "surfaces-materials", product_category: "countertops-worktops", product_subcategory: "wood-worktop" }),
  sub("surfaces-materials/countertops-worktops", "quartz-worktop", "Quartz worktop", 4, { product_type: "surfaces-materials", product_category: "countertops-worktops", product_subcategory: "quartz-worktop" }),
  sub("surfaces-materials", "tiles", "Tiles", 3, { product_type: "surfaces-materials", product_category: "tiles" }),
  sub("surfaces-materials/tiles", "floor-tile", "Floor tile", 0, { product_type: "surfaces-materials", product_category: "tiles", product_subcategory: "floor-tile" }),
  sub("surfaces-materials/tiles", "wall-tile", "Wall tile", 1, { product_type: "surfaces-materials", product_category: "tiles", product_subcategory: "wall-tile" }),
  sub("surfaces-materials/tiles", "mosaic", "Mosaic", 2, { product_type: "surfaces-materials", product_category: "tiles", product_subcategory: "mosaic" }),
  sub("surfaces-materials/tiles", "outdoor-tile", "Outdoor tile", 3, { product_type: "surfaces-materials", product_category: "tiles", product_subcategory: "outdoor-tile" }),
  sub("surfaces-materials/tiles", "porcelain-tile", "Porcelain tile", 4, { product_type: "surfaces-materials", product_category: "tiles", product_subcategory: "porcelain-tile" }),
  sub("surfaces-materials/tiles", "ceramic-tile", "Ceramic tile", 5, { product_type: "surfaces-materials", product_category: "tiles", product_subcategory: "ceramic-tile" }),
  sub("surfaces-materials", "solid-surfaces", "Solid Surfaces", 4, { product_type: "surfaces-materials", product_category: "solid-surfaces" }),
  sub("surfaces-materials/solid-surfaces", "engineered-stone", "Engineered stone", 0, { product_type: "surfaces-materials", product_category: "solid-surfaces", product_subcategory: "engineered-stone" }),
  sub("surfaces-materials/solid-surfaces", "quartz", "Quartz", 1, { product_type: "surfaces-materials", product_category: "solid-surfaces", product_subcategory: "quartz" }),
  sub("surfaces-materials/solid-surfaces", "terrazzo", "Terrazzo", 2, { product_type: "surfaces-materials", product_category: "solid-surfaces", product_subcategory: "terrazzo" }),
  sub("surfaces-materials/solid-surfaces", "concrete-surface", "Concrete surface", 3, { product_type: "surfaces-materials", product_category: "solid-surfaces", product_subcategory: "concrete-surface" }),
  sub("surfaces-materials", "other-surfaces", "Other Surfaces", 5, { product_type: "surfaces-materials", product_category: "other-surfaces" }),
  sub("surfaces-materials/other-surfaces", "acoustic-panel", "Acoustic panel", 0, { product_type: "surfaces-materials", product_category: "other-surfaces", product_subcategory: "acoustic-panel" }),
  sub("surfaces-materials/other-surfaces", "decorative-panel", "Decorative panel", 1, { product_type: "surfaces-materials", product_category: "other-surfaces", product_subcategory: "decorative-panel" }),
  sub("surfaces-materials/other-surfaces", "ceiling-panel", "Ceiling panel", 2, { product_type: "surfaces-materials", product_category: "other-surfaces", product_subcategory: "ceiling-panel" }),
  // NEW: Ceiling Surfaces
  sub("surfaces-materials", "ceiling-surfaces", "Ceiling Surfaces", 6),
  sub("surfaces-materials/ceiling-surfaces", "ceiling-tile", "Ceiling tile", 0),
  sub("surfaces-materials/ceiling-surfaces", "suspended-ceiling", "Suspended ceiling", 1),
  sub("surfaces-materials/ceiling-surfaces", "acoustic-ceiling", "Acoustic ceiling", 2),
  sub("surfaces-materials/ceiling-surfaces", "stretch-ceiling", "Stretch ceiling", 3),
  // NEW: Glass
  sub("surfaces-materials", "glass", "Glass", 7),
  sub("surfaces-materials/glass", "glass-partition", "Glass partition", 0),
  sub("surfaces-materials/glass", "structural-glass", "Structural glass", 1),
  sub("surfaces-materials/glass", "decorative-glass", "Decorative glass", 2),
  sub("surfaces-materials/glass", "glass-balustrade", "Glass balustrade", 3),
  // NOTE: Foam moved to material domain (Plastic & Polymer family). See MATERIAL_SEED_NODES.
  // Insulation products remain under Building Systems → Insulation & Waterproofing.
  // Legacy "insulation-foam" slug under surfaces-materials is redirected.

  // ── Textiles ───────────────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "textiles", slug_path: "textiles", label: "Textiles", parent_slug_path: null, sort_order: 4, legacy_product_type: "textiles" },
  sub("textiles", "upholstery", "Upholstery", 0, { product_type: "textiles", product_category: "upholstery" }),
  sub("textiles/upholstery", "fabric", "Fabric", 0, { product_type: "textiles", product_category: "upholstery", product_subcategory: "fabric" }),
  sub("textiles/upholstery", "leather", "Leather", 1, { product_type: "textiles", product_category: "upholstery", product_subcategory: "leather" }),
  sub("textiles/upholstery", "vinyl", "Vinyl", 2, { product_type: "textiles", product_category: "upholstery", product_subcategory: "vinyl" }),
  sub("textiles/upholstery", "upholstery-fabric", "Upholstery fabric", 3, { product_type: "textiles", product_category: "upholstery", product_subcategory: "upholstery-fabric" }),
  sub("textiles", "curtains-blinds", "Curtains & Blinds", 1, { product_type: "textiles", product_category: "curtains-blinds" }),
  sub("textiles/curtains-blinds", "curtain", "Curtain", 0, { product_type: "textiles", product_category: "curtains-blinds", product_subcategory: "curtain" }),
  sub("textiles/curtains-blinds", "blind", "Blind", 1, { product_type: "textiles", product_category: "curtains-blinds", product_subcategory: "blind" }),
  sub("textiles/curtains-blinds", "shade", "Shade", 2, { product_type: "textiles", product_category: "curtains-blinds", product_subcategory: "shade" }),
  sub("textiles/curtains-blinds", "screen", "Screen", 3, { product_type: "textiles", product_category: "curtains-blinds", product_subcategory: "screen" }),
  sub("textiles/curtains-blinds", "roller-blind", "Roller blind", 4, { product_type: "textiles", product_category: "curtains-blinds", product_subcategory: "roller-blind" }),
  sub("textiles", "rugs-carpets", "Rugs & Carpets", 2, { product_type: "textiles", product_category: "rugs-carpets" }),
  sub("textiles/rugs-carpets", "area-rug", "Area rug", 0, { product_type: "textiles", product_category: "rugs-carpets", product_subcategory: "area-rug" }),
  sub("textiles/rugs-carpets", "carpet", "Carpet", 1, { product_type: "textiles", product_category: "rugs-carpets", product_subcategory: "carpet" }),
  sub("textiles/rugs-carpets", "runner", "Runner", 2, { product_type: "textiles", product_category: "rugs-carpets", product_subcategory: "runner" }),
  sub("textiles/rugs-carpets", "doormat", "Doormat", 3, { product_type: "textiles", product_category: "rugs-carpets", product_subcategory: "doormat" }),
  sub("textiles", "bedding-bath", "Bedding & Bath", 3, { product_type: "textiles", product_category: "bedding-bath" }),
  sub("textiles/bedding-bath", "bed-linen", "Bed linen", 0, { product_type: "textiles", product_category: "bedding-bath", product_subcategory: "bed-linen" }),
  sub("textiles/bedding-bath", "towels", "Towels", 1, { product_type: "textiles", product_category: "bedding-bath", product_subcategory: "towels" }),
  sub("textiles/bedding-bath", "bath-mat", "Bath mat", 2, { product_type: "textiles", product_category: "bedding-bath", product_subcategory: "bath-mat" }),
  sub("textiles", "other-textiles", "Other Textiles", 4, { product_type: "textiles", product_category: "other-textiles" }),
  sub("textiles/other-textiles", "acoustic-textile", "Acoustic textile", 0, { product_type: "textiles", product_category: "other-textiles", product_subcategory: "acoustic-textile" }),
  sub("textiles/other-textiles", "outdoor-fabric", "Outdoor fabric", 1, { product_type: "textiles", product_category: "other-textiles", product_subcategory: "outdoor-fabric" }),

  // ── Hardware ───────────────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "hardware", slug_path: "hardware", label: "Hardware", parent_slug_path: null, sort_order: 5, legacy_product_type: "hardware" },
  sub("hardware", "handles-knobs", "Handles & Knobs", 0, { product_type: "hardware", product_category: "handles-knobs" }),
  sub("hardware/handles-knobs", "cabinet-pull", "Cabinet pull", 0, { product_type: "hardware", product_category: "handles-knobs", product_subcategory: "cabinet-pull" }),
  sub("hardware/handles-knobs", "door-knob", "Door knob", 1, { product_type: "hardware", product_category: "handles-knobs", product_subcategory: "door-knob" }),
  sub("hardware/handles-knobs", "lever-handle", "Lever handle", 2, { product_type: "hardware", product_category: "handles-knobs", product_subcategory: "lever-handle" }),
  sub("hardware/handles-knobs", "drawer-pull", "Drawer pull", 3, { product_type: "hardware", product_category: "handles-knobs", product_subcategory: "drawer-pull" }),
  sub("hardware/handles-knobs", "pull-handle", "Pull handle", 4, { product_type: "hardware", product_category: "handles-knobs", product_subcategory: "pull-handle" }),
  sub("hardware", "hinges-slides", "Hinges & Slides", 1, { product_type: "hardware", product_category: "hinges-slides" }),
  sub("hardware/hinges-slides", "hinge", "Hinge", 0, { product_type: "hardware", product_category: "hinges-slides", product_subcategory: "hinge" }),
  sub("hardware/hinges-slides", "drawer-slide", "Drawer slide", 1, { product_type: "hardware", product_category: "hinges-slides", product_subcategory: "drawer-slide" }),
  sub("hardware/hinges-slides", "pivot", "Pivot", 2, { product_type: "hardware", product_category: "hinges-slides", product_subcategory: "pivot" }),
  sub("hardware/hinges-slides", "concealed-hinge", "Concealed hinge", 3, { product_type: "hardware", product_category: "hinges-slides", product_subcategory: "concealed-hinge" }),
  sub("hardware", "locks-security", "Locks & Security", 2, { product_type: "hardware", product_category: "locks-security" }),
  sub("hardware/locks-security", "lock", "Lock", 0, { product_type: "hardware", product_category: "locks-security", product_subcategory: "lock" }),
  sub("hardware/locks-security", "latch", "Latch", 1, { product_type: "hardware", product_category: "locks-security", product_subcategory: "latch" }),
  sub("hardware/locks-security", "cylinder", "Cylinder", 2, { product_type: "hardware", product_category: "locks-security", product_subcategory: "cylinder" }),
  sub("hardware/locks-security", "electronic-lock", "Electronic lock", 3, { product_type: "hardware", product_category: "locks-security", product_subcategory: "electronic-lock" }),
  sub("hardware", "brackets-supports", "Brackets & Supports", 3, { product_type: "hardware", product_category: "brackets-supports" }),
  sub("hardware/brackets-supports", "bracket", "Bracket", 0, { product_type: "hardware", product_category: "brackets-supports", product_subcategory: "bracket" }),
  sub("hardware/brackets-supports", "support", "Support", 1, { product_type: "hardware", product_category: "brackets-supports", product_subcategory: "support" }),
  sub("hardware/brackets-supports", "mount", "Mount", 2, { product_type: "hardware", product_category: "brackets-supports", product_subcategory: "mount" }),
  sub("hardware/brackets-supports", "shelf-bracket", "Shelf bracket", 3, { product_type: "hardware", product_category: "brackets-supports", product_subcategory: "shelf-bracket" }),
  sub("hardware", "other-hardware", "Other Hardware", 4, { product_type: "hardware", product_category: "other-hardware" }),
  sub("hardware/other-hardware", "hook", "Hook", 0, { product_type: "hardware", product_category: "other-hardware", product_subcategory: "hook" }),
  sub("hardware/other-hardware", "clip", "Clip", 1, { product_type: "hardware", product_category: "other-hardware", product_subcategory: "clip" }),
  sub("hardware/other-hardware", "fastener", "Fastener", 2, { product_type: "hardware", product_category: "other-hardware", product_subcategory: "fastener" }),

  // ── Appliances ─────────────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "appliances", slug_path: "appliances", label: "Appliances", parent_slug_path: null, sort_order: 6, legacy_product_type: "appliances" },
  sub("appliances", "kitchen-appliances", "Kitchen Appliances", 0, { product_type: "appliances", product_category: "kitchen-appliances" }),
  sub("appliances/kitchen-appliances", "cooker", "Cooker", 0, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "cooker" }),
  sub("appliances/kitchen-appliances", "oven", "Oven", 1, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "oven" }),
  sub("appliances/kitchen-appliances", "hob", "Hob", 2, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "hob" }),
  sub("appliances/kitchen-appliances", "refrigerator", "Refrigerator", 3, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "refrigerator" }),
  sub("appliances/kitchen-appliances", "dishwasher", "Dishwasher", 4, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "dishwasher" }),
  sub("appliances/kitchen-appliances", "hood", "Hood", 5, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "hood" }),
  sub("appliances/kitchen-appliances", "wine-cooler", "Wine cooler", 6, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "wine-cooler" }),
  sub("appliances/kitchen-appliances", "microwave", "Microwave", 7, { product_type: "appliances", product_category: "kitchen-appliances", product_subcategory: "microwave" }),
  sub("appliances", "laundry", "Laundry", 1, { product_type: "appliances", product_category: "laundry" }),
  sub("appliances/laundry", "washing-machine", "Washing machine", 0, { product_type: "appliances", product_category: "laundry", product_subcategory: "washing-machine" }),
  sub("appliances/laundry", "dryer", "Dryer", 1, { product_type: "appliances", product_category: "laundry", product_subcategory: "dryer" }),
  sub("appliances/laundry", "washer-dryer", "Washer-dryer", 2, { product_type: "appliances", product_category: "laundry", product_subcategory: "washer-dryer" }),
  sub("appliances", "climate", "Climate", 2, { product_type: "appliances", product_category: "climate" }),
  sub("appliances/climate", "air-conditioning", "Air conditioning", 0, { product_type: "appliances", product_category: "climate", product_subcategory: "air-conditioning" }),
  sub("appliances/climate", "dehumidifier", "Dehumidifier", 1, { product_type: "appliances", product_category: "climate", product_subcategory: "dehumidifier" }),
  sub("appliances/climate", "ventilation", "Ventilation", 2, { product_type: "appliances", product_category: "climate", product_subcategory: "ventilation" }),
  sub("appliances/climate", "heat-pump", "Heat pump", 3, { product_type: "appliances", product_category: "climate", product_subcategory: "heat-pump" }),
  sub("appliances", "other-appliances", "Other Appliances", 3, { product_type: "appliances", product_category: "other-appliances" }),
  sub("appliances/other-appliances", "water-heater", "Water heater", 0, { product_type: "appliances", product_category: "other-appliances", product_subcategory: "water-heater" }),
  sub("appliances/other-appliances", "boiler", "Boiler", 1, { product_type: "appliances", product_category: "other-appliances", product_subcategory: "boiler" }),

  // ── Building Systems (renamed from Systems & Tech, merges Mechanical & Electrical) ──
  // All mechanical, electrical, structural, facade, insulation, HVAC, plumbing, fire safety,
  // acoustic, partition, staircase, and elevator systems live here. No separate top-level family.
  { domain: "product", depth: 0, slug: "building-systems", slug_path: "building-systems", label: "Building Systems", parent_slug_path: null, sort_order: 7, legacy_product_type: "systems-tech" },
  // Structural Systems
  sub("building-systems", "structural-systems", "Structural Systems", 0),
  sub("building-systems/structural-systems", "steel-structure", "Steel structure", 0),
  sub("building-systems/structural-systems", "concrete-structure", "Concrete structure", 1),
  sub("building-systems/structural-systems", "timber-frame", "Timber frame", 2),
  sub("building-systems/structural-systems", "foundation-system", "Foundation system", 3),
  // Facade Systems
  sub("building-systems", "facade-systems", "Facade Systems", 1),
  sub("building-systems/facade-systems", "curtain-wall", "Curtain wall", 0),
  sub("building-systems/facade-systems", "rainscreen", "Rainscreen", 1),
  sub("building-systems/facade-systems", "cladding-system", "Cladding system", 2),
  sub("building-systems/facade-systems", "shading-system", "Shading system", 3),
  // Insulation & Waterproofing (product taxonomy — spray foam insulation lives here too)
  sub("building-systems", "insulation-waterproofing", "Insulation & Waterproofing", 2),
  sub("building-systems/insulation-waterproofing", "spray-foam-insulation", "Spray foam insulation", 0),
  sub("building-systems/insulation-waterproofing", "rigid-board-insulation", "Rigid board insulation", 1),
  sub("building-systems/insulation-waterproofing", "batt-insulation", "Batt insulation", 2),
  sub("building-systems/insulation-waterproofing", "waterproofing-membrane", "Waterproofing membrane", 3),
  sub("building-systems/insulation-waterproofing", "vapour-barrier", "Vapour barrier", 4),
  // HVAC
  sub("building-systems", "hvac", "HVAC", 3),
  sub("building-systems/hvac", "air-handling-unit", "Air handling unit", 0),
  sub("building-systems/hvac", "chiller", "Chiller", 1),
  sub("building-systems/hvac", "heat-recovery", "Heat recovery", 2),
  sub("building-systems/hvac", "ductwork", "Ductwork", 3),
  sub("building-systems/hvac", "underfloor-heating", "Underfloor heating", 4),
  // Plumbing
  sub("building-systems", "plumbing", "Plumbing", 4),
  sub("building-systems/plumbing", "pipework", "Pipework", 0),
  sub("building-systems/plumbing", "water-supply", "Water supply", 1),
  sub("building-systems/plumbing", "drainage", "Drainage", 2),
  sub("building-systems/plumbing", "water-treatment", "Water treatment", 3),
  // Electrical & Smart (preserves legacy mappings from systems-tech/electrical)
  sub("building-systems", "electrical-smart", "Electrical & Smart", 5, { product_type: "systems-tech", product_category: "electrical" }),
  sub("building-systems/electrical-smart", "switch", "Switch", 0, { product_type: "systems-tech", product_category: "electrical", product_subcategory: "switch" }),
  sub("building-systems/electrical-smart", "socket", "Socket", 1, { product_type: "systems-tech", product_category: "electrical", product_subcategory: "socket" }),
  sub("building-systems/electrical-smart", "distribution", "Distribution", 2, { product_type: "systems-tech", product_category: "electrical", product_subcategory: "distribution" }),
  sub("building-systems/electrical-smart", "cable-management", "Cable management", 3, { product_type: "systems-tech", product_category: "electrical", product_subcategory: "cable-management" }),
  sub("building-systems/electrical-smart", "dimmer", "Dimmer", 4, { product_type: "systems-tech", product_category: "electrical", product_subcategory: "dimmer" }),
  sub("building-systems/electrical-smart", "smart-home-hub", "Smart home hub", 5, { product_type: "systems-tech", product_category: "home-automation", product_subcategory: "smart-home-hub" }),
  sub("building-systems/electrical-smart", "sensor", "Sensor", 6, { product_type: "systems-tech", product_category: "home-automation", product_subcategory: "sensor" }),
  sub("building-systems/electrical-smart", "controller", "Controller", 7, { product_type: "systems-tech", product_category: "home-automation", product_subcategory: "controller" }),
  sub("building-systems/electrical-smart", "thermostat", "Thermostat", 8, { product_type: "systems-tech", product_category: "home-automation", product_subcategory: "thermostat" }),
  // Fire Safety
  sub("building-systems", "fire-safety", "Fire Safety", 6),
  sub("building-systems/fire-safety", "fire-alarm", "Fire alarm", 0),
  sub("building-systems/fire-safety", "sprinkler-system", "Sprinkler system", 1),
  sub("building-systems/fire-safety", "fire-door", "Fire door", 2),
  sub("building-systems/fire-safety", "fire-rated-glass", "Fire-rated glass", 3),
  sub("building-systems/fire-safety", "smoke-extraction", "Smoke extraction", 4),
  // Acoustic Systems
  sub("building-systems", "acoustic-systems", "Acoustic Systems", 7),
  sub("building-systems/acoustic-systems", "acoustic-wall-panel", "Acoustic wall panel", 0),
  sub("building-systems/acoustic-systems", "acoustic-ceiling-system", "Acoustic ceiling system", 1),
  sub("building-systems/acoustic-systems", "sound-insulation", "Sound insulation", 2),
  sub("building-systems/acoustic-systems", "vibration-isolation", "Vibration isolation", 3),
  // Partitions
  sub("building-systems", "partitions", "Partitions", 8),
  sub("building-systems/partitions", "demountable-partition", "Demountable partition", 0),
  sub("building-systems/partitions", "operable-wall", "Operable wall", 1),
  sub("building-systems/partitions", "glass-partition-system", "Glass partition system", 2),
  sub("building-systems/partitions", "toilet-partition", "Toilet partition", 3),
  // Staircase Systems
  sub("building-systems", "staircase-systems", "Staircase Systems", 9),
  sub("building-systems/staircase-systems", "prefab-staircase", "Prefab staircase", 0),
  sub("building-systems/staircase-systems", "spiral-staircase", "Spiral staircase", 1),
  sub("building-systems/staircase-systems", "stair-railing", "Stair railing", 2),
  sub("building-systems/staircase-systems", "stair-nosing", "Stair nosing", 3),
  // Elevator / Lift
  sub("building-systems", "elevator-lift", "Elevator / Lift", 10),
  sub("building-systems/elevator-lift", "passenger-elevator", "Passenger elevator", 0),
  sub("building-systems/elevator-lift", "freight-elevator", "Freight elevator", 1),
  sub("building-systems/elevator-lift", "platform-lift", "Platform lift", 2),
  sub("building-systems/elevator-lift", "escalator", "Escalator", 3),
  sub("building-systems/elevator-lift", "dumbwaiter", "Dumbwaiter", 4),
  // Security (preserves legacy mappings from systems-tech/other-systems)
  sub("building-systems", "security", "Security", 11, { product_type: "systems-tech", product_category: "other-systems" }),
  sub("building-systems/security", "security-system", "Security system", 0, { product_type: "systems-tech", product_category: "other-systems", product_subcategory: "security-system" }),
  sub("building-systems/security", "intercom", "Intercom", 1, { product_type: "systems-tech", product_category: "other-systems", product_subcategory: "intercom" }),
  sub("building-systems/security", "access-control", "Access control", 2),
  sub("building-systems/security", "cctv", "CCTV", 3),
  // AV & Media (preserves legacy)
  sub("building-systems", "av-media", "AV & Media", 12, { product_type: "systems-tech", product_category: "av-media" }),
  sub("building-systems/av-media", "speaker", "Speaker", 0, { product_type: "systems-tech", product_category: "av-media", product_subcategory: "speaker" }),
  sub("building-systems/av-media", "display", "Display", 1, { product_type: "systems-tech", product_category: "av-media", product_subcategory: "display" }),
  sub("building-systems/av-media", "mount", "Mount", 2, { product_type: "systems-tech", product_category: "av-media", product_subcategory: "mount" }),
  sub("building-systems/av-media", "av-receiver", "AV receiver", 3, { product_type: "systems-tech", product_category: "av-media", product_subcategory: "av-receiver" }),

  // ── Outdoor ────────────────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "outdoor", slug_path: "outdoor", label: "Outdoor", parent_slug_path: null, sort_order: 8, legacy_product_type: "outdoor" },
  sub("outdoor", "outdoor-furniture", "Outdoor Furniture", 0, { product_type: "outdoor", product_category: "outdoor-furniture" }),
  sub("outdoor/outdoor-furniture", "outdoor-seating", "Outdoor seating", 0, { product_type: "outdoor", product_category: "outdoor-furniture", product_subcategory: "outdoor-seating" }),
  sub("outdoor/outdoor-furniture", "outdoor-table", "Outdoor table", 1, { product_type: "outdoor", product_category: "outdoor-furniture", product_subcategory: "outdoor-table" }),
  sub("outdoor/outdoor-furniture", "lounge", "Lounge", 2, { product_type: "outdoor", product_category: "outdoor-furniture", product_subcategory: "lounge" }),
  sub("outdoor/outdoor-furniture", "planter", "Planter", 3, { product_type: "outdoor", product_category: "outdoor-furniture", product_subcategory: "planter" }),
  sub("outdoor/outdoor-furniture", "outdoor-lounge", "Outdoor lounge", 4, { product_type: "outdoor", product_category: "outdoor-furniture", product_subcategory: "outdoor-lounge" }),
  sub("outdoor", "outdoor-lighting", "Outdoor Lighting", 1, { product_type: "outdoor", product_category: "outdoor-lighting" }),
  sub("outdoor/outdoor-lighting", "path-light", "Path light", 0, { product_type: "outdoor", product_category: "outdoor-lighting", product_subcategory: "path-light" }),
  sub("outdoor/outdoor-lighting", "wall-light", "Wall light", 1, { product_type: "outdoor", product_category: "outdoor-lighting", product_subcategory: "wall-light" }),
  sub("outdoor/outdoor-lighting", "post-light", "Post light", 2, { product_type: "outdoor", product_category: "outdoor-lighting", product_subcategory: "post-light" }),
  sub("outdoor/outdoor-lighting", "garden-light", "Garden light", 3, { product_type: "outdoor", product_category: "outdoor-lighting", product_subcategory: "garden-light" }),
  sub("outdoor", "landscape", "Landscape", 2, { product_type: "outdoor", product_category: "landscape" }),
  sub("outdoor/landscape", "paving", "Paving", 0, { product_type: "outdoor", product_category: "landscape", product_subcategory: "paving" }),
  sub("outdoor/landscape", "decking", "Decking", 1, { product_type: "outdoor", product_category: "landscape", product_subcategory: "decking" }),
  sub("outdoor/landscape", "fencing", "Fencing", 2, { product_type: "outdoor", product_category: "landscape", product_subcategory: "fencing" }),
  sub("outdoor/landscape", "screen", "Screen", 3, { product_type: "outdoor", product_category: "landscape", product_subcategory: "screen" }),
  sub("outdoor/landscape", "pergola", "Pergola", 4, { product_type: "outdoor", product_category: "landscape", product_subcategory: "pergola" }),
  sub("outdoor", "other-outdoor", "Other Outdoor", 3, { product_type: "outdoor", product_category: "other-outdoor" }),
  sub("outdoor/other-outdoor", "bbq-grill", "BBQ / Grill", 0, { product_type: "outdoor", product_category: "other-outdoor", product_subcategory: "bbq-grill" }),
  sub("outdoor/other-outdoor", "heater", "Heater", 1, { product_type: "outdoor", product_category: "other-outdoor", product_subcategory: "heater" }),
  sub("outdoor/other-outdoor", "outdoor-heater", "Outdoor heater", 2, { product_type: "outdoor", product_category: "other-outdoor", product_subcategory: "outdoor-heater" }),

  // ── Decor & Accessories (expanded) ─────────────────────────────────────────
  { domain: "product", depth: 0, slug: "decor-accessories", slug_path: "decor-accessories", label: "Decor & Accessories", parent_slug_path: null, sort_order: 9, legacy_product_type: "decor-accessories" },
  sub("decor-accessories", "mirrors", "Mirrors", 0),
  sub("decor-accessories/mirrors", "wall-mirror", "Wall mirror", 0),
  sub("decor-accessories/mirrors", "floor-mirror", "Floor mirror", 1),
  sub("decor-accessories/mirrors", "vanity-mirror", "Vanity mirror", 2),
  sub("decor-accessories/mirrors", "decorative-mirror", "Decorative mirror", 3),
  sub("decor-accessories", "wall-art", "Wall Art", 1),
  sub("decor-accessories/wall-art", "print", "Print", 0),
  sub("decor-accessories/wall-art", "sculpture", "Sculpture", 1),
  sub("decor-accessories/wall-art", "wall-hanging", "Wall hanging", 2),
  sub("decor-accessories/wall-art", "tapestry", "Tapestry", 3),
  sub("decor-accessories", "decorative-objects", "Decorative Objects", 2),
  sub("decor-accessories/decorative-objects", "vase", "Vase", 0),
  sub("decor-accessories/decorative-objects", "bowl", "Bowl", 1),
  sub("decor-accessories/decorative-objects", "candle-holder", "Candle holder", 2),
  sub("decor-accessories/decorative-objects", "figurine", "Figurine", 3),
  sub("decor-accessories/decorative-objects", "tray", "Tray", 4),
  sub("decor-accessories", "clocks", "Clocks", 3),
  sub("decor-accessories/clocks", "wall-clock", "Wall clock", 0),
  sub("decor-accessories/clocks", "table-clock", "Table clock", 1),
  sub("decor-accessories/clocks", "mantel-clock", "Mantel clock", 2),
  sub("decor-accessories", "cushions-throws", "Cushions & Throws", 4),
  sub("decor-accessories/cushions-throws", "cushion", "Cushion", 0),
  sub("decor-accessories/cushions-throws", "throw", "Throw", 1),
  sub("decor-accessories/cushions-throws", "pillow", "Pillow", 2),

  // ── Office & Workspace (NEW family) ────────────────────────────────────────
  { domain: "product", depth: 0, slug: "office-workspace", slug_path: "office-workspace", label: "Office & Workspace", parent_slug_path: null, sort_order: 10 },
  sub("office-workspace", "office-furniture", "Office Furniture", 0),
  sub("office-workspace/office-furniture", "office-desk", "Office desk", 0),
  sub("office-workspace/office-furniture", "office-storage", "Office storage", 1),
  sub("office-workspace/office-furniture", "reception-desk", "Reception desk", 2),
  sub("office-workspace/office-furniture", "office-screen", "Office screen", 3),
  sub("office-workspace", "acoustic-solutions", "Acoustic Solutions", 1),
  sub("office-workspace/acoustic-solutions", "acoustic-pod", "Acoustic pod", 0),
  sub("office-workspace/acoustic-solutions", "phone-booth", "Phone booth", 1),
  sub("office-workspace/acoustic-solutions", "acoustic-divider", "Acoustic divider", 2),
  sub("office-workspace/acoustic-solutions", "sound-masking", "Sound masking", 3),
  sub("office-workspace", "partitions-screens", "Partitions & Screens", 2),
  sub("office-workspace/partitions-screens", "office-partition", "Office partition", 0),
  sub("office-workspace/partitions-screens", "movable-wall", "Movable wall", 1),
  sub("office-workspace/partitions-screens", "privacy-screen", "Privacy screen", 2),
  sub("office-workspace", "conference-collaboration", "Conference & Collaboration", 3),
  sub("office-workspace/conference-collaboration", "whiteboard", "Whiteboard", 0),
  sub("office-workspace/conference-collaboration", "projector-screen", "Projector screen", 1),
  sub("office-workspace/conference-collaboration", "video-conferencing", "Video conferencing", 2),
  sub("office-workspace/conference-collaboration", "collaboration-table", "Collaboration table", 3),

  // ── Other (catch-all) ──────────────────────────────────────────────────────
  { domain: "product", depth: 0, slug: "other", slug_path: "other", label: "Other", parent_slug_path: null, sort_order: 11, legacy_product_type: "other" },
];

// ─── Project taxonomy nodes ──────────────────────────────────────────────────

export const PROJECT_SEED_NODES: TaxonomySeedNode[] = [
  // ── Roots (keep original 12 + 2 new) ──────────────────────────────────────
  { domain: "project", depth: 0, slug: "residential", slug_path: "residential", label: "Residential", parent_slug_path: null, sort_order: 0, legacy_project_category: "Residential" },
  { domain: "project", depth: 0, slug: "commercial", slug_path: "commercial", label: "Commercial", parent_slug_path: null, sort_order: 1, legacy_project_category: "Commercial" },
  { domain: "project", depth: 0, slug: "hospitality", slug_path: "hospitality", label: "Hospitality", parent_slug_path: null, sort_order: 2, legacy_project_category: "Hospitality" },
  { domain: "project", depth: 0, slug: "retail", slug_path: "retail", label: "Retail", parent_slug_path: null, sort_order: 3, legacy_project_category: "Retail" },
  { domain: "project", depth: 0, slug: "office", slug_path: "office", label: "Office", parent_slug_path: null, sort_order: 4, legacy_project_category: "Office" },
  { domain: "project", depth: 0, slug: "healthcare", slug_path: "healthcare", label: "Healthcare", parent_slug_path: null, sort_order: 5, legacy_project_category: "Healthcare" },
  { domain: "project", depth: 0, slug: "education", slug_path: "education", label: "Education", parent_slug_path: null, sort_order: 6, legacy_project_category: "Education" },
  { domain: "project", depth: 0, slug: "cultural", slug_path: "cultural", label: "Cultural", parent_slug_path: null, sort_order: 7, legacy_project_category: "Cultural" },
  { domain: "project", depth: 0, slug: "public-civic", slug_path: "public-civic", label: "Public / Civic", parent_slug_path: null, sort_order: 8, legacy_project_category: "Public / Civic" },
  { domain: "project", depth: 0, slug: "landscape-urban", slug_path: "landscape-urban", label: "Landscape / Urban", parent_slug_path: null, sort_order: 9, legacy_project_category: "Landscape / Urban" },
  { domain: "project", depth: 0, slug: "interior", slug_path: "interior", label: "Interior", parent_slug_path: null, sort_order: 10, legacy_project_category: "Interior" },
  { domain: "project", depth: 0, slug: "other", slug_path: "other", label: "Other", parent_slug_path: null, sort_order: 11, legacy_project_category: "Other" },
  { domain: "project", depth: 0, slug: "sports-recreation", slug_path: "sports-recreation", label: "Sports & Recreation", parent_slug_path: null, sort_order: 12 },
  { domain: "project", depth: 0, slug: "infrastructure", slug_path: "infrastructure", label: "Infrastructure", parent_slug_path: null, sort_order: 13 },

  // ── Residential subtypes ──────────────────────────────────────────────────
  psub("residential", "single-family-house", "Single-Family House", 0),
  psub("residential", "apartment", "Apartment", 1),
  psub("residential", "villa", "Villa", 2),
  psub("residential", "townhouse", "Townhouse", 3),
  psub("residential", "housing-complex", "Housing Complex", 4),
  psub("residential", "loft-studio", "Loft / Studio", 5),
  psub("residential", "penthouse", "Penthouse", 6),
  psub("residential", "co-living", "Co-Living", 7),
  psub("residential", "prefab-house", "Prefab House", 8),
  psub("residential", "micro-unit", "Micro Unit", 9),

  // ── Commercial subtypes ───────────────────────────────────────────────────
  psub("commercial", "office-building", "Office Building", 0),
  psub("commercial", "co-working", "Co-Working", 1),
  psub("commercial", "headquarters", "Headquarters", 2),
  psub("commercial", "retail-store", "Retail Store", 3),
  psub("commercial", "showroom", "Showroom", 4),
  psub("commercial", "shopping-mall", "Shopping Mall", 5),
  psub("commercial", "mixed-use", "Mixed-Use", 6),
  psub("commercial", "market-hall", "Market Hall", 7),
  psub("commercial", "warehouse-logistics", "Warehouse / Logistics", 8),

  // ── Hospitality subtypes ──────────────────────────────────────────────────
  psub("hospitality", "hotel", "Hotel", 0),
  psub("hospitality", "boutique-hotel", "Boutique Hotel", 1),
  psub("hospitality", "resort", "Resort", 2),
  psub("hospitality", "hostel", "Hostel", 3),
  psub("hospitality", "restaurant", "Restaurant", 4),
  psub("hospitality", "bar-lounge", "Bar / Lounge", 5),
  psub("hospitality", "cafe", "Cafe", 6),
  psub("hospitality", "spa-wellness", "Spa / Wellness", 7),
  psub("hospitality", "convention-center", "Convention Center", 8),

  // ── Retail subtypes ───────────────────────────────────────────────────────
  psub("retail", "boutique", "Boutique", 0),
  psub("retail", "flagship-store", "Flagship Store", 1),
  psub("retail", "pop-up-shop", "Pop-Up Shop", 2),
  psub("retail", "department-store", "Department Store", 3),
  psub("retail", "grocery-supermarket", "Grocery / Supermarket", 4),
  psub("retail", "showroom-gallery", "Showroom / Gallery", 5),
  psub("retail", "kiosk", "Kiosk", 6),

  // ── Office subtypes ───────────────────────────────────────────────────────
  psub("office", "corporate-office", "Corporate Office", 0),
  psub("office", "co-working-space", "Co-Working Space", 1),
  psub("office", "creative-studio", "Creative Studio", 2),
  psub("office", "tech-office", "Tech Office", 3),
  psub("office", "home-office", "Home Office", 4),
  psub("office", "executive-suite", "Executive Suite", 5),

  // ── Healthcare subtypes ───────────────────────────────────────────────────
  psub("healthcare", "hospital", "Hospital", 0),
  psub("healthcare", "clinic", "Clinic", 1),
  psub("healthcare", "rehabilitation", "Rehabilitation Center", 2),
  psub("healthcare", "elderly-care", "Elderly Care", 3),
  psub("healthcare", "laboratory", "Laboratory", 4),
  psub("healthcare", "veterinary-clinic", "Veterinary Clinic", 5),

  // ── Education subtypes ────────────────────────────────────────────────────
  psub("education", "school", "School", 0),
  psub("education", "university", "University", 1),
  psub("education", "kindergarten", "Kindergarten", 2),
  psub("education", "research-facility", "Research Facility", 3),
  psub("education", "student-housing", "Student Housing", 4),
  psub("education", "campus-master-plan", "Campus Master Plan", 5),

  // ── Cultural subtypes ─────────────────────────────────────────────────────
  psub("cultural", "museum", "Museum", 0),
  psub("cultural", "art-gallery", "Art Gallery", 1),
  psub("cultural", "theater", "Theater", 2),
  psub("cultural", "concert-hall", "Concert Hall", 3),
  psub("cultural", "cultural-center", "Cultural Center", 4),
  psub("cultural", "exhibition-space", "Exhibition Space", 5),
  psub("cultural", "library", "Library", 6),
  psub("cultural", "memorial-monument", "Memorial / Monument", 7),
  psub("cultural", "pavilion", "Pavilion", 8),

  // ── Public / Civic subtypes ───────────────────────────────────────────────
  psub("public-civic", "government-building", "Government Building", 0),
  psub("public-civic", "courthouse", "Courthouse", 1),
  psub("public-civic", "embassy", "Embassy", 2),
  psub("public-civic", "fire-station", "Fire Station", 3),
  psub("public-civic", "community-center", "Community Center", 4),
  psub("public-civic", "religious-building", "Religious Building", 5),
  psub("public-civic", "cemetery", "Cemetery", 6),

  // ── Landscape / Urban subtypes ────────────────────────────────────────────
  psub("landscape-urban", "park", "Park", 0),
  psub("landscape-urban", "plaza", "Plaza", 1),
  psub("landscape-urban", "urban-master-plan", "Urban Master Plan", 2),
  psub("landscape-urban", "waterfront", "Waterfront", 3),
  psub("landscape-urban", "streetscape", "Streetscape", 4),
  psub("landscape-urban", "garden", "Garden", 5),
  psub("landscape-urban", "rooftop-landscape", "Rooftop Landscape", 6),
  psub("landscape-urban", "playground", "Playground", 7),

  // ── Interior subtypes ─────────────────────────────────────────────────────
  psub("interior", "residential-interior", "Residential Interior", 0),
  psub("interior", "commercial-interior", "Commercial Interior", 1),
  psub("interior", "hospitality-interior", "Hospitality Interior", 2),
  psub("interior", "retail-interior", "Retail Interior", 3),
  psub("interior", "workplace-interior", "Workplace Interior", 4),
  psub("interior", "exhibition-set-design", "Exhibition / Set Design", 5),

  // ── Other subtypes ────────────────────────────────────────────────────────
  psub("other", "temporary-pop-up", "Temporary / Pop-Up", 0),
  psub("other", "experimental", "Experimental", 1),
  psub("other", "competition-entry", "Competition Entry", 2),
  psub("other", "unbuilt-conceptual", "Unbuilt / Conceptual", 3),
  psub("other", "adaptive-reuse", "Adaptive Reuse", 4),
  psub("other", "renovation-restoration", "Renovation / Restoration", 5),

  // ── Sports & Recreation subtypes ──────────────────────────────────────────
  psub("sports-recreation", "stadium", "Stadium", 0),
  psub("sports-recreation", "arena", "Arena", 1),
  psub("sports-recreation", "sports-center", "Sports Center", 2),
  psub("sports-recreation", "swimming-pool", "Swimming Pool", 3),
  psub("sports-recreation", "tennis-padel", "Tennis / Padel", 4),
  psub("sports-recreation", "climbing-hall", "Climbing Hall", 5),

  // ── Infrastructure subtypes ───────────────────────────────────────────────
  psub("infrastructure", "bridge", "Bridge", 0),
  psub("infrastructure", "airport-terminal", "Airport / Terminal", 1),
  psub("infrastructure", "train-station", "Train Station", 2),
  psub("infrastructure", "metro-station", "Metro Station", 3),
  psub("infrastructure", "bus-terminal", "Bus Terminal", 4),
  psub("infrastructure", "port-marina", "Port / Marina", 5),
  psub("infrastructure", "parking-structure", "Parking Structure", 6),
  psub("infrastructure", "power-plant", "Power Plant", 7),
];

// ─── Material taxonomy nodes ────────────────────────────────────────────────

export const MATERIAL_SEED_NODES: TaxonomySeedNode[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // 1. Wood
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "wood", slug_path: "wood", label: "Wood", parent_slug_path: null, sort_order: 0 },

  msub("wood", "hardwood", "Hardwood", 0),
  msub("wood/hardwood", "oak", "Oak", 0),
  msub("wood/hardwood", "walnut", "Walnut", 1),
  msub("wood/hardwood", "maple", "Maple", 2),
  msub("wood/hardwood", "cherry", "Cherry", 3),
  msub("wood/hardwood", "ash", "Ash", 4),
  msub("wood/hardwood", "birch", "Birch", 5),
  msub("wood/hardwood", "teak", "Teak", 6),
  msub("wood/hardwood", "mahogany", "Mahogany", 7),
  msub("wood/hardwood", "beech", "Beech", 8),
  msub("wood/hardwood", "elm", "Elm", 9),

  msub("wood", "softwood", "Softwood", 1),
  msub("wood/softwood", "pine", "Pine", 0),
  msub("wood/softwood", "cedar", "Cedar", 1),
  msub("wood/softwood", "spruce", "Spruce", 2),
  msub("wood/softwood", "douglas-fir", "Douglas Fir", 3),
  msub("wood/softwood", "larch", "Larch", 4),
  msub("wood/softwood", "hemlock", "Hemlock", 5),

  msub("wood", "engineered-wood", "Engineered Wood", 2),
  msub("wood/engineered-wood", "plywood", "Plywood", 0),
  msub("wood/engineered-wood", "mdf", "MDF", 1),
  msub("wood/engineered-wood", "particleboard", "Particleboard", 2),
  msub("wood/engineered-wood", "osb", "OSB", 3),
  msub("wood/engineered-wood", "clt", "CLT (Cross-Laminated Timber)", 4),
  msub("wood/engineered-wood", "glulam", "Glulam", 5),
  msub("wood/engineered-wood", "lvl", "LVL (Laminated Veneer Lumber)", 6),

  msub("wood", "bamboo", "Bamboo", 3),
  msub("wood", "cork", "Cork", 4),

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Metal
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "metal", slug_path: "metal", label: "Metal", parent_slug_path: null, sort_order: 1 },

  msub("metal", "steel", "Steel", 0),
  msub("metal/steel", "carbon-steel", "Carbon Steel", 0),
  msub("metal/steel", "stainless-steel", "Stainless Steel", 1),
  msub("metal/steel", "corten-steel", "Corten Steel", 2),
  msub("metal/steel", "galvanized-steel", "Galvanized Steel", 3),

  msub("metal", "aluminum", "Aluminum", 1),
  msub("metal/aluminum", "anodized-aluminum", "Anodized Aluminum", 0),
  msub("metal/aluminum", "brushed-aluminum", "Brushed Aluminum", 1),
  msub("metal/aluminum", "cast-aluminum", "Cast Aluminum", 2),

  msub("metal", "copper", "Copper", 2),
  msub("metal/copper", "raw-copper", "Raw Copper", 0),
  msub("metal/copper", "patinated-copper", "Patinated Copper", 1),
  msub("metal/copper", "copper-alloy", "Copper Alloy", 2),

  msub("metal", "brass", "Brass", 3),
  msub("metal", "bronze", "Bronze", 4),

  msub("metal", "iron", "Iron", 5),
  msub("metal/iron", "cast-iron", "Cast Iron", 0),
  msub("metal/iron", "wrought-iron", "Wrought Iron", 1),

  msub("metal", "zinc", "Zinc", 6),
  msub("metal", "titanium", "Titanium", 7),

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Stone
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "stone", slug_path: "stone", label: "Stone", parent_slug_path: null, sort_order: 2 },

  msub("stone", "marble", "Marble", 0),
  msub("stone/marble", "carrara", "Carrara", 0),
  msub("stone/marble", "calacatta", "Calacatta", 1),
  msub("stone/marble", "nero-marquina", "Nero Marquina", 2),
  msub("stone/marble", "statuario", "Statuario", 3),

  msub("stone", "granite", "Granite", 1),
  msub("stone/granite", "black-granite", "Black Granite", 0),
  msub("stone/granite", "white-granite", "White Granite", 1),
  msub("stone/granite", "gray-granite", "Gray Granite", 2),

  msub("stone", "limestone", "Limestone", 2),
  msub("stone", "travertine", "Travertine", 3),
  msub("stone", "slate", "Slate", 4),
  msub("stone", "sandstone", "Sandstone", 5),
  msub("stone", "quartzite", "Quartzite", 6),
  msub("stone", "onyx", "Onyx", 7),
  msub("stone", "basalt", "Basalt", 8),
  msub("stone", "terrazzo", "Terrazzo", 9),

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Concrete & Cement
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "concrete-cement", slug_path: "concrete-cement", label: "Concrete & Cement", parent_slug_path: null, sort_order: 3 },

  msub("concrete-cement", "cast-concrete", "Cast Concrete", 0),
  msub("concrete-cement/cast-concrete", "precast", "Precast Concrete", 0),
  msub("concrete-cement/cast-concrete", "in-situ", "In-Situ Concrete", 1),
  msub("concrete-cement/cast-concrete", "uhpc", "UHPC", 2),

  msub("concrete-cement", "fiber-cement", "Fiber Cement", 1),
  msub("concrete-cement", "micro-cement", "Micro-Cement", 2),
  msub("concrete-cement", "grc", "GRC (Glass Reinforced Concrete)", 3),
  msub("concrete-cement", "polished-concrete", "Polished Concrete", 4),
  msub("concrete-cement", "exposed-aggregate", "Exposed Aggregate", 5),

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Glass
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "glass", slug_path: "glass", label: "Glass", parent_slug_path: null, sort_order: 4 },

  msub("glass", "float-glass", "Float Glass", 0),
  msub("glass", "tempered-glass", "Tempered Glass", 1),
  msub("glass", "laminated-glass", "Laminated Glass", 2),
  msub("glass", "low-e-glass", "Low-E Glass", 3),
  msub("glass", "frosted-glass", "Frosted / Acid-Etched Glass", 4),
  msub("glass", "stained-glass", "Stained Glass", 5),
  msub("glass", "glass-block", "Glass Block", 6),
  msub("glass", "borosilicate", "Borosilicate", 7),
  msub("glass", "dichroic-glass", "Dichroic Glass", 8),
  msub("glass", "smart-glass", "Smart Glass (Electrochromic)", 9),

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Ceramic & Tile
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "ceramic-tile", slug_path: "ceramic-tile", label: "Ceramic & Tile", parent_slug_path: null, sort_order: 5 },

  msub("ceramic-tile", "porcelain", "Porcelain", 0),
  msub("ceramic-tile", "ceramic", "Ceramic", 1),
  msub("ceramic-tile", "terracotta", "Terracotta", 2),
  msub("ceramic-tile", "stoneware", "Stoneware", 3),
  msub("ceramic-tile", "zellige", "Zellige", 4),
  msub("ceramic-tile", "mosaic", "Mosaic", 5),
  msub("ceramic-tile", "clinker-brick", "Clinker Brick", 6),
  msub("ceramic-tile", "encaustic-tile", "Encaustic Tile", 7),
  msub("ceramic-tile", "large-format-slab", "Large-Format Slab", 8),

  // ══════════════════════════════════════════════════════════════════════════
  // 7. Brick & Masonry
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "brick-masonry", slug_path: "brick-masonry", label: "Brick & Masonry", parent_slug_path: null, sort_order: 6 },

  msub("brick-masonry", "clay-brick", "Clay Brick", 0),
  msub("brick-masonry/clay-brick", "facing-brick", "Facing Brick", 0),
  msub("brick-masonry/clay-brick", "engineering-brick", "Engineering Brick", 1),
  msub("brick-masonry/clay-brick", "fire-brick", "Fire Brick", 2),

  msub("brick-masonry", "concrete-block", "Concrete Block", 1),
  msub("brick-masonry", "natural-stone-masonry", "Natural Stone Masonry", 2),
  msub("brick-masonry", "adobe", "Adobe", 3),
  msub("brick-masonry", "rammed-earth", "Rammed Earth", 4),

  // ══════════════════════════════════════════════════════════════════════════
  // 8. Textile & Fabric
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "textile-fabric", slug_path: "textile-fabric", label: "Textile & Fabric", parent_slug_path: null, sort_order: 7 },

  msub("textile-fabric", "natural-fiber", "Natural Fiber", 0),
  msub("textile-fabric/natural-fiber", "cotton", "Cotton", 0),
  msub("textile-fabric/natural-fiber", "linen", "Linen", 1),
  msub("textile-fabric/natural-fiber", "wool", "Wool", 2),
  msub("textile-fabric/natural-fiber", "silk", "Silk", 3),
  msub("textile-fabric/natural-fiber", "hemp", "Hemp", 4),
  msub("textile-fabric/natural-fiber", "jute", "Jute", 5),

  msub("textile-fabric", "synthetic-fiber", "Synthetic Fiber", 1),
  msub("textile-fabric/synthetic-fiber", "polyester", "Polyester", 0),
  msub("textile-fabric/synthetic-fiber", "nylon-fabric", "Nylon Fabric", 1),
  msub("textile-fabric/synthetic-fiber", "acrylic-fabric", "Acrylic Fabric", 2),
  msub("textile-fabric/synthetic-fiber", "microfiber", "Microfiber", 3),

  msub("textile-fabric", "blended-fabric", "Blended Fabric", 2),

  msub("textile-fabric", "leather", "Leather", 3),
  msub("textile-fabric/leather", "full-grain", "Full-Grain Leather", 0),
  msub("textile-fabric/leather", "top-grain", "Top-Grain Leather", 1),
  msub("textile-fabric/leather", "suede", "Suede", 2),
  msub("textile-fabric/leather", "vegan-leather", "Vegan Leather", 3),

  msub("textile-fabric", "technical-textile", "Technical Textile", 4),
  msub("textile-fabric/technical-textile", "acoustic-fabric", "Acoustic Fabric", 0),
  msub("textile-fabric/technical-textile", "fire-retardant-fabric", "Fire-Retardant Fabric", 1),
  msub("textile-fabric/technical-textile", "uv-resistant-fabric", "UV-Resistant Fabric", 2),
  msub("textile-fabric/technical-textile", "outdoor-fabric", "Outdoor Fabric", 3),

  msub("textile-fabric", "felt", "Felt", 5),
  msub("textile-fabric", "woven", "Woven", 6),

  // ══════════════════════════════════════════════════════════════════════════
  // 9. Plastic & Polymer (existing — keep + expand)
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "plastic-polymer", slug_path: "plastic-polymer", label: "Plastic & Polymer", parent_slug_path: null, sort_order: 8 },

  msub("plastic-polymer", "foam", "Foam", 0),
  msub("plastic-polymer/foam", "polyurethane-foam", "Polyurethane Foam", 0),
  msub("plastic-polymer/foam", "memory-foam", "Memory Foam", 1),
  msub("plastic-polymer/foam", "acoustic-foam", "Acoustic Foam", 2),
  msub("plastic-polymer/foam", "eva-foam", "EVA Foam", 3),
  msub("plastic-polymer/foam", "melamine-foam", "Melamine Foam", 4),
  msub("plastic-polymer/foam", "spray-foam", "Spray Foam", 5),

  msub("plastic-polymer", "acrylic", "Acrylic", 1),
  msub("plastic-polymer", "polycarbonate", "Polycarbonate", 2),
  msub("plastic-polymer", "abs", "ABS", 3),
  msub("plastic-polymer", "nylon", "Nylon", 4),
  msub("plastic-polymer", "silicone", "Silicone", 5),
  msub("plastic-polymer", "resin", "Resin", 6),
  msub("plastic-polymer", "fiberglass", "Fiberglass", 7),
  msub("plastic-polymer", "pvc", "PVC", 8),
  msub("plastic-polymer", "hdpe", "HDPE", 9),
  msub("plastic-polymer", "polypropylene", "Polypropylene", 10),
  // New additions
  msub("plastic-polymer", "solid-surface", "Solid Surface (Corian)", 11),
  msub("plastic-polymer", "phenolic", "Phenolic", 12),
  msub("plastic-polymer", "hpl-laminate", "HPL Laminate", 13),
  msub("plastic-polymer", "etfe", "ETFE", 14),
  msub("plastic-polymer", "ptfe", "PTFE (Teflon)", 15),
  msub("plastic-polymer", "rubber", "Rubber", 16),
  msub("plastic-polymer", "vinyl", "Vinyl", 17),
  msub("plastic-polymer", "epoxy", "Epoxy", 18),

  // ══════════════════════════════════════════════════════════════════════════
  // 10. Paint & Coating
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "paint-coating", slug_path: "paint-coating", label: "Paint & Coating", parent_slug_path: null, sort_order: 9 },

  msub("paint-coating", "latex-acrylic-paint", "Latex / Acrylic Paint", 0),
  msub("paint-coating", "oil-based-paint", "Oil-Based Paint", 1),
  msub("paint-coating", "lime-wash", "Lime Wash", 2),
  msub("paint-coating", "epoxy-coating", "Epoxy Coating", 3),
  msub("paint-coating", "powder-coating", "Powder Coating", 4),
  msub("paint-coating", "lacquer", "Lacquer", 5),
  msub("paint-coating", "wood-stain", "Wood Stain", 6),
  msub("paint-coating", "varnish", "Varnish", 7),
  msub("paint-coating", "plaster-stucco", "Plaster / Stucco", 8),
  msub("paint-coating", "venetian-plaster", "Venetian Plaster", 9),

  // ══════════════════════════════════════════════════════════════════════════
  // 11. Composite
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "composite", slug_path: "composite", label: "Composite", parent_slug_path: null, sort_order: 10 },

  msub("composite", "carbon-fiber", "Carbon Fiber", 0),
  msub("composite", "frp", "Fiber-Reinforced Polymer (FRP)", 1),
  msub("composite", "wpc", "Wood-Plastic Composite (WPC)", 2),
  msub("composite", "sintered-stone", "Sintered Stone", 3),
  msub("composite", "engineered-quartz", "Engineered Quartz", 4),
  msub("composite", "ultra-compact-surface", "Ultra-Compact Surface (Dekton)", 5),
  msub("composite", "paper-composite", "Paper Composite (Richlite)", 6),

  // ══════════════════════════════════════════════════════════════════════════
  // 12. Insulation
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "insulation", slug_path: "insulation", label: "Insulation", parent_slug_path: null, sort_order: 11 },

  msub("insulation", "mineral-wool", "Mineral Wool", 0),
  msub("insulation/mineral-wool", "rock-wool", "Rock Wool", 0),
  msub("insulation/mineral-wool", "glass-wool", "Glass Wool", 1),

  msub("insulation", "cellulose-insulation", "Cellulose Insulation", 1),
  msub("insulation", "aerogel", "Aerogel", 2),
  msub("insulation", "vacuum-panel", "Vacuum Insulation Panel", 3),
  msub("insulation", "pir-pur-board", "PIR / PUR Board", 4),
  msub("insulation", "xps-eps", "XPS / EPS", 5),
  msub("insulation", "hemp-insulation", "Hemp Insulation", 6),
  msub("insulation", "sheep-wool-insulation", "Sheep Wool Insulation", 7),

  // ══════════════════════════════════════════════════════════════════════════
  // 13. Adhesive & Sealant
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "adhesive-sealant", slug_path: "adhesive-sealant", label: "Adhesive & Sealant", parent_slug_path: null, sort_order: 12 },

  msub("adhesive-sealant", "construction-adhesive", "Construction Adhesive", 0),
  msub("adhesive-sealant", "epoxy-adhesive", "Epoxy Adhesive", 1),
  msub("adhesive-sealant", "silicone-sealant", "Silicone Sealant", 2),
  msub("adhesive-sealant", "polyurethane-sealant", "Polyurethane Sealant", 3),
  msub("adhesive-sealant", "acrylic-sealant", "Acrylic Sealant", 4),
  msub("adhesive-sealant", "mortar-grout", "Mortar / Grout", 5),

  // ══════════════════════════════════════════════════════════════════════════
  // 14. Gypsum & Plaster
  // ══════════════════════════════════════════════════════════════════════════
  { domain: "material", depth: 0, slug: "gypsum-plaster", slug_path: "gypsum-plaster", label: "Gypsum & Plaster", parent_slug_path: null, sort_order: 13 },

  msub("gypsum-plaster", "gypsum-board", "Gypsum Board / Drywall", 0),
  msub("gypsum-plaster", "plaster-of-paris", "Plaster of Paris", 1),
  msub("gypsum-plaster", "lime-plaster", "Lime Plaster", 2),
  msub("gypsum-plaster", "clay-plaster", "Clay Plaster", 3),
  msub("gypsum-plaster", "acoustic-plaster", "Acoustic Plaster", 4),
  msub("gypsum-plaster", "fibrous-plaster", "Fibrous Plaster", 5),
];

// ─── Taxonomy redirect seeds ────────────────────────────────────────────────
// Redirect old slug paths to their new location after the correction patch.

export interface TaxonomyRedirectSeed {
  old_slug_path: string;
  new_slug_path: string;
  domain: string;
}

export const REDIRECT_SEED_DATA: TaxonomyRedirectSeed[] = [
  // Foam moved from surfaces-materials/insulation-foam → material domain plastic-polymer/foam
  { old_slug_path: "surfaces-materials/insulation-foam", new_slug_path: "plastic-polymer/foam", domain: "product" },
  { old_slug_path: "surfaces-materials/insulation-foam/spray-foam", new_slug_path: "plastic-polymer/foam/spray-foam", domain: "product" },
  { old_slug_path: "surfaces-materials/insulation-foam/rigid-foam", new_slug_path: "plastic-polymer/foam/polyurethane-foam", domain: "product" },
  { old_slug_path: "surfaces-materials/insulation-foam/acoustic-foam-panel", new_slug_path: "plastic-polymer/foam/acoustic-foam", domain: "product" },
  // systems-tech → building-systems rename
  { old_slug_path: "systems-tech", new_slug_path: "building-systems", domain: "product" },
  { old_slug_path: "systems-tech/electrical", new_slug_path: "building-systems/electrical-smart", domain: "product" },
  { old_slug_path: "systems-tech/home-automation", new_slug_path: "building-systems/electrical-smart", domain: "product" },
  { old_slug_path: "systems-tech/av-media", new_slug_path: "building-systems/av-media", domain: "product" },
  { old_slug_path: "systems-tech/other-systems", new_slug_path: "building-systems/security", domain: "product" },
];

/** All seed nodes combined. */
export const ALL_SEED_NODES: TaxonomySeedNode[] = [
  ...PRODUCT_SEED_NODES,
  ...PROJECT_SEED_NODES,
  ...MATERIAL_SEED_NODES,
];
