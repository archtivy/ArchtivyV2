/**
 * Product taxonomy: Type → Category → Subcategory (frontend-controlled, no DB tables for MVP).
 * Stable ids (slugs) for type/category/subcategory to avoid text-change issues.
 * Used for filtering, form validation, and match scoring. Taxonomy values are FILTER VALUES only;
 * we do NOT generate static/indexable pages for category or subcategory.
 * SEO: Only product detail pages and sufficiently populated filtered views may be indexed.
 */

/** Slug for the fallback subcategory. When used, product is flagged low-confidence; match score caps subcategory at +10. */
export const PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID = "other-not-specified";
export const PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL = "Other / Not specified";

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*&\s*/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "other";
}

export interface ProductTaxonomySubcategory {
  id: string;
  label: string;
}

export interface ProductTaxonomyCategory {
  id: string;
  label: string;
  subcategories: ProductTaxonomySubcategory[];
}

export interface ProductTaxonomyType {
  id: string;
  label: string;
  categories: ProductTaxonomyCategory[];
}

/** Product types (FINAL — labels must match exactly; ids are stable slugs). */
const TYPES: ProductTaxonomyType[] = [
  {
    id: "furniture",
    label: "Furniture",
    categories: [
      {
        id: "seating",
        label: "Seating",
        subcategories: [
          { id: "dining-chair", label: "Dining chair" },
          { id: "office-chair", label: "Office chair" },
          { id: "armchair", label: "Armchair" },
          { id: "sofa", label: "Sofa" },
          { id: "stool", label: "Stool" },
          { id: "bench", label: "Bench" },
          { id: "bar-stool", label: "Bar stool" },
          { id: "lounge-chair", label: "Lounge chair" },
          { id: "side-chair", label: "Side chair" },
          { id: "accent-chair", label: "Accent chair" },
          { id: "chaise-longue", label: "Chaise longue" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "tables",
        label: "Tables",
        subcategories: [
          { id: "dining-table", label: "Dining table" },
          { id: "coffee-table", label: "Coffee table" },
          { id: "desk", label: "Desk" },
          { id: "side-table", label: "Side table" },
          { id: "console-table", label: "Console table" },
          { id: "work-table", label: "Work table" },
          { id: "outdoor-table", label: "Outdoor table" },
          { id: "conference-table", label: "Conference table" },
          { id: "occasional-table", label: "Occasional table" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "storage",
        label: "Storage",
        subcategories: [
          { id: "cabinet", label: "Cabinet" },
          { id: "shelving", label: "Shelving" },
          { id: "wardrobe", label: "Wardrobe" },
          { id: "sideboard", label: "Sideboard" },
          { id: "bookcase", label: "Bookcase" },
          { id: "display-cabinet", label: "Display cabinet" },
          { id: "storage-unit", label: "Storage unit" },
          { id: "filing-cabinet", label: "Filing cabinet" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "beds-bedroom",
        label: "Beds & Bedroom",
        subcategories: [
          { id: "bed-frame", label: "Bed frame" },
          { id: "headboard", label: "Headboard" },
          { id: "nightstand", label: "Nightstand" },
          { id: "dresser", label: "Dresser" },
          { id: "bedside-table", label: "Bedside table" },
          { id: "vanity", label: "Vanity" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "outdoor-furniture",
        label: "Outdoor Furniture",
        subcategories: [
          { id: "outdoor-seating", label: "Outdoor seating" },
          { id: "outdoor-table", label: "Outdoor table" },
          { id: "lounge", label: "Lounge" },
          { id: "garden-furniture", label: "Garden furniture" },
          { id: "planter-bench", label: "Planter bench" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-furniture",
        label: "Other Furniture",
        subcategories: [
          { id: "screen-room-divider", label: "Screen / Room divider" },
          { id: "stand", label: "Stand" },
          { id: "podium", label: "Podium" },
          { id: "coat-stand", label: "Coat stand" },
          { id: "magazine-rack", label: "Magazine rack" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "lighting",
    label: "Lighting",
    categories: [
      {
        id: "ceiling",
        label: "Ceiling",
        subcategories: [
          { id: "pendant", label: "Pendant" },
          { id: "chandelier", label: "Chandelier" },
          { id: "ceiling-fixture", label: "Ceiling fixture" },
          { id: "downlight", label: "Downlight" },
          { id: "track-lighting", label: "Track lighting" },
          { id: "recessed-light", label: "Recessed light" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "wall",
        label: "Wall",
        subcategories: [
          { id: "wall-sconce", label: "Wall sconce" },
          { id: "wall-lamp", label: "Wall lamp" },
          { id: "picture-light", label: "Picture light" },
          { id: "wall-washer", label: "Wall washer" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "floor-table",
        label: "Floor & Table",
        subcategories: [
          { id: "floor-lamp", label: "Floor lamp" },
          { id: "table-lamp", label: "Table lamp" },
          { id: "desk-lamp", label: "Desk lamp" },
          { id: "task-lamp", label: "Task lamp" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "outdoor-lighting",
        label: "Outdoor Lighting",
        subcategories: [
          { id: "outdoor-wall", label: "Outdoor wall" },
          { id: "path-light", label: "Path light" },
          { id: "garden-light", label: "Garden light" },
          { id: "facade-lighting", label: "Facade lighting" },
          { id: "bollard", label: "Bollard" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "linear-strip",
        label: "Linear & Strip",
        subcategories: [
          { id: "linear-pendant", label: "Linear pendant" },
          { id: "strip-light", label: "Strip light" },
          { id: "cove-lighting", label: "Cove lighting" },
          { id: "linear-recessed", label: "Linear recessed" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-lighting",
        label: "Other Lighting",
        subcategories: [
          { id: "decorative", label: "Decorative" },
          { id: "task-lighting", label: "Task lighting" },
          { id: "emergency-lighting", label: "Emergency lighting" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "fixtures-fittings",
    label: "Fixtures & Fittings",
    categories: [
      {
        id: "bathroom",
        label: "Bathroom",
        subcategories: [
          { id: "faucet", label: "Faucet" },
          { id: "shower", label: "Shower" },
          { id: "bathtub", label: "Bathtub" },
          { id: "toilet", label: "Toilet" },
          { id: "basin", label: "Basin" },
          { id: "bathroom-accessory", label: "Bathroom accessory" },
          { id: "towel-rail", label: "Towel rail" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "kitchen",
        label: "Kitchen",
        subcategories: [
          { id: "kitchen-faucet", label: "Kitchen faucet" },
          { id: "sink", label: "Sink" },
          { id: "tap", label: "Tap" },
          { id: "kitchen-accessory", label: "Kitchen accessory" },
          { id: "pot-filler", label: "Pot filler" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "door-window",
        label: "Door & Window",
        subcategories: [
          { id: "door-handle", label: "Door handle" },
          { id: "window-handle", label: "Window handle" },
          { id: "hinge", label: "Hinge" },
          { id: "door-fitting", label: "Door fitting" },
          { id: "window-fitting", label: "Window fitting" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "radiators-hvac",
        label: "Radiators & HVAC",
        subcategories: [
          { id: "radiator", label: "Radiator" },
          { id: "heating-element", label: "Heating element" },
          { id: "vent", label: "Vent" },
          { id: "grille", label: "Grille" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-fixtures",
        label: "Other Fixtures",
        subcategories: [
          { id: "rail", label: "Rail" },
          { id: "hook", label: "Hook" },
          { id: "bracket", label: "Bracket" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "surfaces-materials",
    label: "Surfaces & Materials",
    categories: [
      {
        id: "flooring",
        label: "Flooring",
        subcategories: [
          { id: "wood-flooring", label: "Wood flooring" },
          { id: "tile-flooring", label: "Tile flooring" },
          { id: "stone-flooring", label: "Stone flooring" },
          { id: "resin-flooring", label: "Resin flooring" },
          { id: "carpet", label: "Carpet" },
          { id: "vinyl-lvt", label: "Vinyl / LVT" },
          { id: "laminate-flooring", label: "Laminate flooring" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "wall-surfaces",
        label: "Wall Surfaces",
        subcategories: [
          { id: "wall-tile", label: "Wall tile" },
          { id: "porcelain-wall-tile", label: "Porcelain wall tile" },
          { id: "wall-panel", label: "Wall panel" },
          { id: "stone-cladding", label: "Stone cladding" },
          { id: "wood-cladding", label: "Wood cladding" },
          { id: "wall-covering", label: "Wall covering" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "countertops-worktops",
        label: "Countertops & Worktops",
        subcategories: [
          { id: "stone-worktop", label: "Stone worktop" },
          { id: "solid-surface", label: "Solid surface" },
          { id: "laminate", label: "Laminate" },
          { id: "wood-worktop", label: "Wood worktop" },
          { id: "quartz-worktop", label: "Quartz worktop" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "tiles",
        label: "Tiles",
        subcategories: [
          { id: "floor-tile", label: "Floor tile" },
          { id: "wall-tile", label: "Wall tile" },
          { id: "mosaic", label: "Mosaic" },
          { id: "outdoor-tile", label: "Outdoor tile" },
          { id: "porcelain-tile", label: "Porcelain tile" },
          { id: "ceramic-tile", label: "Ceramic tile" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "solid-surfaces",
        label: "Solid Surfaces",
        subcategories: [
          { id: "engineered-stone", label: "Engineered stone" },
          { id: "quartz", label: "Quartz" },
          { id: "terrazzo", label: "Terrazzo" },
          { id: "concrete-surface", label: "Concrete surface" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-surfaces",
        label: "Other Surfaces",
        subcategories: [
          { id: "acoustic-panel", label: "Acoustic panel" },
          { id: "decorative-panel", label: "Decorative panel" },
          { id: "ceiling-panel", label: "Ceiling panel" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "textiles",
    label: "Textiles",
    categories: [
      {
        id: "upholstery",
        label: "Upholstery",
        subcategories: [
          { id: "fabric", label: "Fabric" },
          { id: "leather", label: "Leather" },
          { id: "vinyl", label: "Vinyl" },
          { id: "upholstery-fabric", label: "Upholstery fabric" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "curtains-blinds",
        label: "Curtains & Blinds",
        subcategories: [
          { id: "curtain", label: "Curtain" },
          { id: "blind", label: "Blind" },
          { id: "shade", label: "Shade" },
          { id: "screen", label: "Screen" },
          { id: "roller-blind", label: "Roller blind" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "rugs-carpets",
        label: "Rugs & Carpets",
        subcategories: [
          { id: "area-rug", label: "Area rug" },
          { id: "carpet", label: "Carpet" },
          { id: "runner", label: "Runner" },
          { id: "doormat", label: "Doormat" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "bedding-bath",
        label: "Bedding & Bath",
        subcategories: [
          { id: "bed-linen", label: "Bed linen" },
          { id: "towels", label: "Towels" },
          { id: "bath-mat", label: "Bath mat" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-textiles",
        label: "Other Textiles",
        subcategories: [
          { id: "acoustic-textile", label: "Acoustic textile" },
          { id: "outdoor-fabric", label: "Outdoor fabric" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "hardware",
    label: "Hardware",
    categories: [
      {
        id: "handles-knobs",
        label: "Handles & Knobs",
        subcategories: [
          { id: "cabinet-pull", label: "Cabinet pull" },
          { id: "door-knob", label: "Door knob" },
          { id: "lever-handle", label: "Lever handle" },
          { id: "drawer-pull", label: "Drawer pull" },
          { id: "pull-handle", label: "Pull handle" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "hinges-slides",
        label: "Hinges & Slides",
        subcategories: [
          { id: "hinge", label: "Hinge" },
          { id: "drawer-slide", label: "Drawer slide" },
          { id: "pivot", label: "Pivot" },
          { id: "concealed-hinge", label: "Concealed hinge" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "locks-security",
        label: "Locks & Security",
        subcategories: [
          { id: "lock", label: "Lock" },
          { id: "latch", label: "Latch" },
          { id: "cylinder", label: "Cylinder" },
          { id: "electronic-lock", label: "Electronic lock" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "brackets-supports",
        label: "Brackets & Supports",
        subcategories: [
          { id: "bracket", label: "Bracket" },
          { id: "support", label: "Support" },
          { id: "mount", label: "Mount" },
          { id: "shelf-bracket", label: "Shelf bracket" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-hardware",
        label: "Other Hardware",
        subcategories: [
          { id: "hook", label: "Hook" },
          { id: "clip", label: "Clip" },
          { id: "fastener", label: "Fastener" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "appliances",
    label: "Appliances",
    categories: [
      {
        id: "kitchen-appliances",
        label: "Kitchen Appliances",
        subcategories: [
          { id: "cooker", label: "Cooker" },
          { id: "oven", label: "Oven" },
          { id: "hob", label: "Hob" },
          { id: "refrigerator", label: "Refrigerator" },
          { id: "dishwasher", label: "Dishwasher" },
          { id: "hood", label: "Hood" },
          { id: "wine-cooler", label: "Wine cooler" },
          { id: "microwave", label: "Microwave" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "laundry",
        label: "Laundry",
        subcategories: [
          { id: "washing-machine", label: "Washing machine" },
          { id: "dryer", label: "Dryer" },
          { id: "washer-dryer", label: "Washer-dryer" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "climate",
        label: "Climate",
        subcategories: [
          { id: "air-conditioning", label: "Air conditioning" },
          { id: "dehumidifier", label: "Dehumidifier" },
          { id: "ventilation", label: "Ventilation" },
          { id: "heat-pump", label: "Heat pump" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-appliances",
        label: "Other Appliances",
        subcategories: [
          { id: "water-heater", label: "Water heater" },
          { id: "boiler", label: "Boiler" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "systems-tech",
    label: "Systems & Tech",
    categories: [
      {
        id: "home-automation",
        label: "Home Automation",
        subcategories: [
          { id: "smart-home-hub", label: "Smart home hub" },
          { id: "sensor", label: "Sensor" },
          { id: "controller", label: "Controller" },
          { id: "thermostat", label: "Thermostat" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "av-media",
        label: "AV & Media",
        subcategories: [
          { id: "speaker", label: "Speaker" },
          { id: "display", label: "Display" },
          { id: "mount", label: "Mount" },
          { id: "av-receiver", label: "AV receiver" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "electrical",
        label: "Electrical",
        subcategories: [
          { id: "switch", label: "Switch" },
          { id: "socket", label: "Socket" },
          { id: "distribution", label: "Distribution" },
          { id: "cable-management", label: "Cable management" },
          { id: "dimmer", label: "Dimmer" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-systems",
        label: "Other Systems",
        subcategories: [
          { id: "security-system", label: "Security system" },
          { id: "intercom", label: "Intercom" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "outdoor",
    label: "Outdoor",
    categories: [
      {
        id: "outdoor-furniture",
        label: "Outdoor Furniture",
        subcategories: [
          { id: "outdoor-seating", label: "Outdoor seating" },
          { id: "outdoor-table", label: "Outdoor table" },
          { id: "lounge", label: "Lounge" },
          { id: "planter", label: "Planter" },
          { id: "outdoor-lounge", label: "Outdoor lounge" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "outdoor-lighting",
        label: "Outdoor Lighting",
        subcategories: [
          { id: "path-light", label: "Path light" },
          { id: "wall-light", label: "Wall light" },
          { id: "post-light", label: "Post light" },
          { id: "garden-light", label: "Garden light" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "landscape",
        label: "Landscape",
        subcategories: [
          { id: "paving", label: "Paving" },
          { id: "decking", label: "Decking" },
          { id: "fencing", label: "Fencing" },
          { id: "screen", label: "Screen" },
          { id: "pergola", label: "Pergola" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
      {
        id: "other-outdoor",
        label: "Other Outdoor",
        subcategories: [
          { id: "bbq-grill", label: "BBQ / Grill" },
          { id: "heater", label: "Heater" },
          { id: "outdoor-heater", label: "Outdoor heater" },
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
  {
    id: "other",
    label: "Other",
    categories: [
      {
        id: "unspecified",
        label: "Unspecified",
        subcategories: [
          { id: "other-not-specified", label: PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL },
        ],
      },
    ],
  },
];

export const PRODUCT_TAXONOMY: ProductTaxonomyType[] = TYPES;

/** Product type labels only (for backward compatibility where display list is needed). */
export const PRODUCT_TYPE_LABELS = TYPES.map((t) => t.label);

/** All type ids (slugs) for validation/URLs. */
export const PRODUCT_TYPE_IDS = TYPES.map((t) => t.id);

/** Get type by id (slug). */
export function getTypeById(id: string): ProductTaxonomyType | undefined {
  return TYPES.find((t) => t.id === id);
}

/** Get categories for a product type id. */
export function getCategoriesForType(typeId: string): ProductTaxonomyCategory[] {
  const t = getTypeById(typeId);
  return t?.categories ?? [];
}

/** Get subcategories for a type id + category id. */
export function getSubcategoriesForCategory(typeId: string, categoryId: string): ProductTaxonomySubcategory[] {
  const cats = getCategoriesForType(typeId);
  const cat = cats.find((c) => c.id === categoryId);
  return cat?.subcategories ?? [];
}

/** Whether the subcategory id/label is the fallback (low-confidence when used; match score caps sub at +10). */
export function isFallbackSubcategory(subIdOrLabel: string): boolean {
  const s = subIdOrLabel?.trim() ?? "";
  return s === PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID || s === PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL;
}

/** All valid subcategory ids (for validation). */
export function getAllSubcategoryIds(): Set<string> {
  const set = new Set<string>();
  for (const t of TYPES) {
    for (const c of t.categories) {
      for (const s of c.subcategories) set.add(s.id);
    }
  }
  return set;
}
