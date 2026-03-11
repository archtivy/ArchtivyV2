/**
 * Product taxonomy v2: Type → Category → Subcategory (frontend-controlled).
 *
 * 13 root types designed for architectural product specification.
 * Stable ids (slugs) — do NOT rename without updating the LEGACY_ALIAS_MAP.
 *
 * Legacy roots (fixtures-fittings, surfaces-materials, appliances) are preserved
 * in LEGACY_ALIAS_MAP for backward compatibility with existing products.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** Slug for the fallback subcategory. When used, product is flagged low-confidence; match score caps subcategory at +10. */
export const PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID = "other-not-specified";
export const PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL = "Other / Not specified";

/** Short alias used in the tree below for readability. */
const FB = PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_LABEL;

// ── Interfaces ─────────────────────────────────────────────────────────────────

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

// ── Taxonomy Tree (13 roots) ───────────────────────────────────────────────────

const TYPES: ProductTaxonomyType[] = [
  /* ──────────────────────────────── 1. FURNITURE ──────────────────────────────── */
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
          { id: "other-not-specified", label: FB },
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
          { id: "conference-table", label: "Conference table" },
          { id: "occasional-table", label: "Occasional table" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "storage",
        label: "Storage & Shelving",
        subcategories: [
          { id: "cabinet", label: "Cabinet" },
          { id: "shelving", label: "Shelving" },
          { id: "wardrobe", label: "Wardrobe" },
          { id: "sideboard", label: "Sideboard" },
          { id: "bookcase", label: "Bookcase" },
          { id: "display-cabinet", label: "Display cabinet" },
          { id: "storage-unit", label: "Storage unit" },
          { id: "filing-cabinet", label: "Filing cabinet" },
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "office-furniture",
        label: "Office Furniture",
        subcategories: [
          { id: "office-desk", label: "Office desk" },
          { id: "task-chair", label: "Task chair" },
          { id: "meeting-table", label: "Meeting table" },
          { id: "reception-desk", label: "Reception desk" },
          { id: "office-storage", label: "Office storage" },
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────────────────────── 2. LIGHTING ───────────────────────────────── */
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
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "linear-strip",
        label: "Architectural & Linear",
        subcategories: [
          { id: "linear-pendant", label: "Linear pendant" },
          { id: "strip-light", label: "Strip light" },
          { id: "cove-lighting", label: "Cove lighting" },
          { id: "linear-recessed", label: "Linear recessed" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "other-lighting",
        label: "Decorative & Specialty",
        subcategories: [
          { id: "decorative", label: "Decorative" },
          { id: "task-lighting", label: "Task lighting" },
          { id: "emergency-lighting", label: "Emergency lighting" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────────────────────── 3. BATHROOM ───────────────────────────────── */
  {
    id: "bathroom",
    label: "Bathroom",
    categories: [
      {
        id: "sanitaryware",
        label: "Sanitaryware",
        subcategories: [
          { id: "toilet", label: "Toilet" },
          { id: "basin", label: "Basin" },
          { id: "bidet", label: "Bidet" },
          { id: "urinal", label: "Urinal" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "bathtubs-showers",
        label: "Bathtubs & Showers",
        subcategories: [
          { id: "bathtub", label: "Bathtub" },
          { id: "shower", label: "Shower" },
          { id: "shower-enclosure", label: "Shower enclosure" },
          { id: "shower-tray", label: "Shower tray" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "bathroom-faucets",
        label: "Bathroom Faucets & Mixers",
        subcategories: [
          { id: "faucet", label: "Faucet" },
          { id: "basin-mixer", label: "Basin mixer" },
          { id: "bath-mixer", label: "Bath mixer" },
          { id: "shower-mixer", label: "Shower mixer" },
          { id: "thermostatic-valve", label: "Thermostatic valve" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "bathroom-accessories",
        label: "Bathroom Accessories",
        subcategories: [
          { id: "towel-rail", label: "Towel rail" },
          { id: "bathroom-accessory", label: "Bathroom accessory" },
          { id: "mirror", label: "Mirror" },
          { id: "grab-bar", label: "Grab bar" },
          { id: "soap-dispenser", label: "Soap dispenser" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "bathroom-furniture",
        label: "Bathroom Furniture",
        subcategories: [
          { id: "vanity-unit", label: "Vanity unit" },
          { id: "mirror-cabinet", label: "Mirror cabinet" },
          { id: "bathroom-cabinet", label: "Bathroom cabinet" },
          { id: "bathroom-shelf", label: "Bathroom shelf" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────────────────────── 4. KITCHEN ────────────────────────────────── */
  {
    id: "kitchen",
    label: "Kitchen",
    categories: [
      {
        id: "kitchen-sinks",
        label: "Kitchen Sinks",
        subcategories: [
          { id: "sink", label: "Sink" },
          { id: "undermount-sink", label: "Undermount sink" },
          { id: "inset-sink", label: "Inset sink" },
          { id: "prep-sink", label: "Prep sink" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "kitchen-faucets",
        label: "Kitchen Faucets",
        subcategories: [
          { id: "kitchen-faucet", label: "Kitchen faucet" },
          { id: "kitchen-mixer", label: "Kitchen mixer" },
          { id: "pot-filler", label: "Pot filler" },
          { id: "tap", label: "Tap" },
          { id: "instant-hot-tap", label: "Instant hot water tap" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "cooking-appliances",
        label: "Cooking Appliances",
        subcategories: [
          { id: "oven", label: "Oven" },
          { id: "hob", label: "Hob" },
          { id: "cooker", label: "Cooker" },
          { id: "range-cooker", label: "Range cooker" },
          { id: "microwave", label: "Microwave" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "ventilation-hoods",
        label: "Ventilation & Hoods",
        subcategories: [
          { id: "hood", label: "Hood" },
          { id: "downdraft", label: "Downdraft" },
          { id: "ceiling-extractor", label: "Ceiling extractor" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "refrigeration",
        label: "Refrigeration",
        subcategories: [
          { id: "refrigerator", label: "Refrigerator" },
          { id: "wine-cooler", label: "Wine cooler" },
          { id: "freezer", label: "Freezer" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "dishwashing",
        label: "Dishwashing",
        subcategories: [
          { id: "dishwasher", label: "Dishwasher" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "kitchen-accessories",
        label: "Kitchen Accessories",
        subcategories: [
          { id: "kitchen-accessory", label: "Kitchen accessory" },
          { id: "kitchen-island", label: "Kitchen island" },
          { id: "pantry-unit", label: "Pantry unit" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────────────────────── 5. FLOORING ───────────────────────────────── */
  {
    id: "flooring",
    label: "Flooring",
    categories: [
      {
        id: "wood-flooring",
        label: "Wood Flooring",
        subcategories: [
          { id: "solid-wood", label: "Solid wood" },
          { id: "engineered-wood", label: "Engineered wood" },
          { id: "parquet", label: "Parquet" },
          { id: "plank", label: "Plank" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "tile-stone-flooring",
        label: "Tile & Stone Flooring",
        subcategories: [
          { id: "floor-tile", label: "Floor tile" },
          { id: "tile-flooring", label: "Tile flooring" },
          { id: "stone-flooring", label: "Stone flooring" },
          { id: "porcelain-floor-tile", label: "Porcelain floor tile" },
          { id: "ceramic-floor-tile", label: "Ceramic floor tile" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "resilient-flooring",
        label: "Resilient Flooring",
        subcategories: [
          { id: "vinyl-lvt", label: "Vinyl / LVT" },
          { id: "linoleum", label: "Linoleum" },
          { id: "rubber-flooring", label: "Rubber flooring" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "carpet-flooring",
        label: "Carpet",
        subcategories: [
          { id: "broadloom", label: "Broadloom" },
          { id: "carpet-tile", label: "Carpet tile" },
          { id: "carpet", label: "Carpet" },
          { id: "natural-fibre", label: "Natural fibre" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "specialty-flooring",
        label: "Specialty Flooring",
        subcategories: [
          { id: "resin-flooring", label: "Resin flooring" },
          { id: "terrazzo-flooring", label: "Terrazzo flooring" },
          { id: "laminate-flooring", label: "Laminate flooring" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "outdoor-flooring",
        label: "Outdoor Flooring",
        subcategories: [
          { id: "outdoor-tile", label: "Outdoor tile" },
          { id: "exterior-paving", label: "Exterior paving" },
          { id: "outdoor-decking", label: "Outdoor decking" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ────────────────────── 6. WALLS, CEILINGS & FACADES ───────────────────────── */
  {
    id: "walls-ceilings-facades",
    label: "Walls, Ceilings & Facades",
    categories: [
      {
        id: "wall-tiles",
        label: "Wall Tiles & Mosaics",
        subcategories: [
          { id: "wall-tile", label: "Wall tile" },
          { id: "porcelain-wall-tile", label: "Porcelain wall tile" },
          { id: "ceramic-tile", label: "Ceramic tile" },
          { id: "porcelain-tile", label: "Porcelain tile" },
          { id: "mosaic", label: "Mosaic" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "wall-panels-cladding",
        label: "Wall Panels & Cladding",
        subcategories: [
          { id: "wall-panel", label: "Wall panel" },
          { id: "stone-cladding", label: "Stone cladding" },
          { id: "wood-cladding", label: "Wood cladding" },
          { id: "metal-panel", label: "Metal panel" },
          { id: "decorative-panel", label: "Decorative panel" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "wallcoverings",
        label: "Wallcoverings",
        subcategories: [
          { id: "wallpaper", label: "Wallpaper" },
          { id: "wall-covering", label: "Wall covering" },
          { id: "textile-wallcovering", label: "Textile wallcovering" },
          { id: "decorative-film", label: "Decorative film" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "brick-masonry",
        label: "Brick & Masonry",
        subcategories: [
          { id: "brick", label: "Brick" },
          { id: "stone-veneer", label: "Stone veneer" },
          { id: "concrete-block", label: "Concrete block" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "facade-systems",
        label: "Facade Systems",
        subcategories: [
          { id: "curtain-wall", label: "Curtain wall" },
          { id: "rainscreen", label: "Rainscreen" },
          { id: "ventilated-facade", label: "Ventilated facade" },
          { id: "composite-panel", label: "Composite panel" },
          { id: "solar-shading", label: "Solar shading" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "ceiling-systems",
        label: "Ceiling Systems",
        subcategories: [
          { id: "suspended-ceiling", label: "Suspended ceiling" },
          { id: "ceiling-panel", label: "Ceiling panel" },
          { id: "ceiling-tile", label: "Ceiling tile" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "acoustic-solutions",
        label: "Acoustic Solutions",
        subcategories: [
          { id: "acoustic-panel", label: "Acoustic panel" },
          { id: "acoustic-ceiling-panel", label: "Acoustic ceiling panel" },
          { id: "sound-absorber", label: "Sound absorber" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ────────────────────────── 7. DOORS & WINDOWS ─────────────────────────────── */
  {
    id: "doors-windows",
    label: "Doors & Windows",
    categories: [
      {
        id: "interior-doors",
        label: "Interior Doors",
        subcategories: [
          { id: "hinged-door", label: "Hinged door" },
          { id: "sliding-door", label: "Sliding door" },
          { id: "pocket-door", label: "Pocket door" },
          { id: "pivot-door", label: "Pivot door" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "exterior-doors",
        label: "Exterior Doors",
        subcategories: [
          { id: "entry-door", label: "Entry door" },
          { id: "patio-door", label: "Patio door" },
          { id: "garage-door", label: "Garage door" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "windows",
        label: "Windows",
        subcategories: [
          { id: "casement-window", label: "Casement window" },
          { id: "sliding-window", label: "Sliding window" },
          { id: "fixed-window", label: "Fixed window" },
          { id: "roof-window", label: "Roof window" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "glass-partitions",
        label: "Glass & Partitions",
        subcategories: [
          { id: "glass-partition", label: "Glass partition" },
          { id: "frameless-glass", label: "Frameless glass" },
          { id: "operable-wall", label: "Operable wall" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "door-window-hardware",
        label: "Door & Window Hardware",
        subcategories: [
          { id: "door-handle", label: "Door handle" },
          { id: "window-handle", label: "Window handle" },
          { id: "hinge", label: "Hinge" },
          { id: "door-fitting", label: "Door fitting" },
          { id: "window-fitting", label: "Window fitting" },
          { id: "door-closer", label: "Door closer" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ────────────────────── 8. SURFACES & COUNTERTOPS ──────────────────────────── */
  {
    id: "surfaces-countertops",
    label: "Surfaces & Countertops",
    categories: [
      {
        id: "natural-stone",
        label: "Natural Stone",
        subcategories: [
          { id: "marble", label: "Marble" },
          { id: "granite", label: "Granite" },
          { id: "limestone", label: "Limestone" },
          { id: "slate", label: "Slate" },
          { id: "stone-worktop", label: "Stone worktop" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "engineered-quartz",
        label: "Engineered Stone & Quartz",
        subcategories: [
          { id: "quartz", label: "Quartz" },
          { id: "quartz-worktop", label: "Quartz worktop" },
          { id: "sintered-stone", label: "Sintered stone" },
          { id: "porcelain-slab", label: "Porcelain slab" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "solid-surface",
        label: "Solid Surface",
        subcategories: [
          { id: "acrylic-solid-surface", label: "Acrylic solid surface" },
          { id: "composite-surface", label: "Composite surface" },
          { id: "solid-surface", label: "Solid surface" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "terrazzo",
        label: "Terrazzo",
        subcategories: [
          { id: "precast-terrazzo", label: "Precast terrazzo" },
          { id: "poured-terrazzo", label: "Poured terrazzo" },
          { id: "terrazzo", label: "Terrazzo" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "concrete-cement",
        label: "Concrete & Cement",
        subcategories: [
          { id: "concrete-surface", label: "Concrete surface" },
          { id: "microcement", label: "Microcement" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "wood-countertops",
        label: "Wood Countertops",
        subcategories: [
          { id: "wood-worktop", label: "Wood worktop" },
          { id: "butcher-block", label: "Butcher block" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "laminate-surfaces",
        label: "Laminate Surfaces",
        subcategories: [
          { id: "laminate", label: "Laminate" },
          { id: "hpl", label: "HPL" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────────────────────── 9. TEXTILES ───────────────────────────────── */
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
          { id: "other-not-specified", label: FB },
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
          { id: "venetian-blind", label: "Venetian blind" },
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "bedding-bath",
        label: "Bedding & Bath",
        subcategories: [
          { id: "bed-linen", label: "Bed linen" },
          { id: "towels", label: "Towels" },
          { id: "bath-mat", label: "Bath mat" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "outdoor-textiles",
        label: "Outdoor Textiles",
        subcategories: [
          { id: "outdoor-fabric", label: "Outdoor fabric" },
          { id: "outdoor-rug", label: "Outdoor rug" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "acoustic-textiles",
        label: "Acoustic Textiles",
        subcategories: [
          { id: "acoustic-textile", label: "Acoustic textile" },
          { id: "acoustic-curtain", label: "Acoustic curtain" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ─────────────────────── 10. BUILDING SYSTEMS (was systems-tech) ────────────── */
  {
    id: "systems-tech",
    label: "Building Systems",
    categories: [
      {
        id: "hvac-climate",
        label: "HVAC & Climate",
        subcategories: [
          { id: "air-conditioning", label: "Air conditioning" },
          { id: "heat-pump", label: "Heat pump" },
          { id: "ventilation", label: "Ventilation" },
          { id: "radiator", label: "Radiator" },
          { id: "underfloor-heating", label: "Underfloor heating" },
          { id: "heating-element", label: "Heating element" },
          { id: "dehumidifier", label: "Dehumidifier" },
          { id: "vent", label: "Vent" },
          { id: "grille", label: "Grille" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "electrical",
        label: "Electrical",
        subcategories: [
          { id: "switch", label: "Switch" },
          { id: "socket", label: "Socket" },
          { id: "dimmer", label: "Dimmer" },
          { id: "distribution", label: "Distribution" },
          { id: "cable-management", label: "Cable management" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "plumbing",
        label: "Plumbing",
        subcategories: [
          { id: "water-heater", label: "Water heater" },
          { id: "boiler", label: "Boiler" },
          { id: "valve", label: "Valve" },
          { id: "pipe-fitting", label: "Pipe fitting" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "home-automation",
        label: "Home Automation",
        subcategories: [
          { id: "smart-home-hub", label: "Smart home hub" },
          { id: "sensor", label: "Sensor" },
          { id: "controller", label: "Controller" },
          { id: "thermostat", label: "Thermostat" },
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "security-access",
        label: "Security & Access",
        subcategories: [
          { id: "security-system", label: "Security system" },
          { id: "intercom", label: "Intercom" },
          { id: "electronic-lock", label: "Electronic lock" },
          { id: "access-control", label: "Access control" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "laundry-appliances",
        label: "Laundry Appliances",
        subcategories: [
          { id: "washing-machine", label: "Washing machine" },
          { id: "dryer", label: "Dryer" },
          { id: "washer-dryer", label: "Washer-dryer" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ─────────────────── 11. OUTDOOR & LANDSCAPE (was outdoor) ─────────────────── */
  {
    id: "outdoor",
    label: "Outdoor & Landscape",
    categories: [
      {
        id: "outdoor-furniture",
        label: "Outdoor Furniture",
        subcategories: [
          { id: "outdoor-seating", label: "Outdoor seating" },
          { id: "outdoor-table", label: "Outdoor table" },
          { id: "outdoor-lounge", label: "Outdoor lounge" },
          { id: "lounge", label: "Lounge" },
          { id: "garden-furniture", label: "Garden furniture" },
          { id: "planter-bench", label: "Planter bench" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "paving-hardscape",
        label: "Paving & Hardscape",
        subcategories: [
          { id: "paving", label: "Paving" },
          { id: "paving-stone", label: "Paving stone" },
          { id: "natural-stone-paving", label: "Natural stone paving" },
          { id: "gravel", label: "Gravel" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "decking",
        label: "Decking",
        subcategories: [
          { id: "wood-decking", label: "Wood decking" },
          { id: "composite-decking", label: "Composite decking" },
          { id: "tile-on-pedestal", label: "Tile-on-pedestal" },
          { id: "decking", label: "Decking" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "garden-landscape",
        label: "Garden & Landscape",
        subcategories: [
          { id: "planter", label: "Planter" },
          { id: "raised-bed", label: "Raised bed" },
          { id: "irrigation", label: "Irrigation" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "fencing-screens",
        label: "Fencing & Screens",
        subcategories: [
          { id: "fencing", label: "Fencing" },
          { id: "privacy-screen", label: "Privacy screen" },
          { id: "gate", label: "Gate" },
          { id: "screen", label: "Screen" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "shade-structures",
        label: "Shade Structures",
        subcategories: [
          { id: "pergola", label: "Pergola" },
          { id: "canopy", label: "Canopy" },
          { id: "awning", label: "Awning" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "other-outdoor",
        label: "Other Outdoor",
        subcategories: [
          { id: "bbq-grill", label: "BBQ / Grill" },
          { id: "heater", label: "Heater" },
          { id: "outdoor-heater", label: "Outdoor heater" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────── 12. HARDWARE & IRONMONGERY (was hardware) ────────────────── */
  {
    id: "hardware",
    label: "Hardware & Ironmongery",
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
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
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
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "architectural-ironmongery",
        label: "Architectural Ironmongery",
        subcategories: [
          { id: "rail", label: "Rail" },
          { id: "kickplate", label: "Kickplate" },
          { id: "letter-plate", label: "Letter plate" },
          { id: "signage", label: "Signage" },
          { id: "other-not-specified", label: FB },
        ],
      },
      {
        id: "other-hardware",
        label: "Other Hardware",
        subcategories: [
          { id: "hook", label: "Hook" },
          { id: "clip", label: "Clip" },
          { id: "fastener", label: "Fastener" },
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },

  /* ──────────────────────────────── 13. OTHER ─────────────────────────────────── */
  {
    id: "other",
    label: "Other",
    categories: [
      {
        id: "unspecified",
        label: "Unspecified",
        subcategories: [
          { id: "other-not-specified", label: FB },
        ],
      },
    ],
  },
];

// ── Primary Exports ────────────────────────────────────────────────────────────

export const PRODUCT_TAXONOMY: ProductTaxonomyType[] = TYPES;

/** Product type labels only (for backward compatibility where display list is needed). */
export const PRODUCT_TYPE_LABELS = TYPES.map((t) => t.label);

/** All type ids (slugs) for validation/URLs. */
export const PRODUCT_TYPE_IDS = TYPES.map((t) => t.id);

// ── Lookup Helpers ─────────────────────────────────────────────────────────────

/** Get type by id (slug). */
export function getTypeById(id: string): ProductTaxonomyType | undefined {
  return TYPES.find((t) => t.id === id);
}

/** Get categories for a product type id. */
export function getCategoriesForType(typeId: string): ProductTaxonomyCategory[] {
  // Try direct lookup first, then resolve legacy alias
  const t = getTypeById(typeId) ?? getTypeById(resolveLegacyType(typeId));
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

// ── Explore Tree Builder ──────────────────────────────────────────────────────

/**
 * Convert the canonical PRODUCT_TAXONOMY into TaxonomyTreeNode[] for Explore UI.
 * This is the single source of truth for the visible product taxonomy tree.
 * Slug paths are built as "type/category/subcategory" to match URL routing.
 */
export interface CanonicalTaxonomyTreeNode {
  id: string;
  slug: string;
  slug_path: string;
  label: string;
  depth: number;
  children: CanonicalTaxonomyTreeNode[];
}

let _cachedTree: CanonicalTaxonomyTreeNode[] | null = null;
let _cachedSlugSet: Set<string> | null = null;

export function getCanonicalProductTree(): CanonicalTaxonomyTreeNode[] {
  if (_cachedTree) return _cachedTree;
  _cachedTree = TYPES.map((type) => ({
    id: type.id,
    slug: type.id,
    slug_path: type.id,
    label: type.label,
    depth: 0,
    children: type.categories.map((cat) => ({
      id: `${type.id}/${cat.id}`,
      slug: cat.id,
      slug_path: `${type.id}/${cat.id}`,
      label: cat.label,
      depth: 1,
      children: cat.subcategories
        .filter((sub) => sub.id !== PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID)
        .map((sub) => ({
          id: `${type.id}/${cat.id}/${sub.id}`,
          slug: sub.id,
          slug_path: `${type.id}/${cat.id}/${sub.id}`,
          label: sub.label,
          depth: 2,
          children: [],
        })),
    })),
  }));
  return _cachedTree;
}

/** Check whether a slug_path exists in the canonical product taxonomy. */
export function isCanonicalProductSlugPath(slugPath: string): boolean {
  if (!_cachedSlugSet) {
    _cachedSlugSet = new Set<string>();
    for (const type of TYPES) {
      _cachedSlugSet.add(type.id);
      for (const cat of type.categories) {
        _cachedSlugSet.add(`${type.id}/${cat.id}`);
        for (const sub of cat.subcategories) {
          if (sub.id !== PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID) {
            _cachedSlugSet.add(`${type.id}/${cat.id}/${sub.id}`);
          }
        }
      }
    }
  }
  return _cachedSlugSet.has(slugPath);
}

// ── Legacy Alias System ────────────────────────────────────────────────────────
//
// Three old root types were retired in taxonomy v2:
//   • fixtures-fittings  → split into bathroom, kitchen, doors-windows, systems-tech, hardware
//   • surfaces-materials → split into flooring, walls-ceilings-facades, surfaces-countertops
//   • appliances         → absorbed into kitchen + systems-tech
//
// Products already stored with old type/category/subcategory values continue to
// resolve correctly via resolveLegacyPath(). No DB migration required.

export interface ResolvedTaxonomyPath {
  type: string;
  category: string;
  subcategory: string;
}

/** Old type ids that no longer exist as root types. */
const RETIRED_TYPE_IDS = new Set(["fixtures-fittings", "surfaces-materials", "appliances"]);

/** Canonical labels for root types (from the v2 tree). Used to correct stale DB labels. */
const CANONICAL_ROOT_LABELS = new Map(TYPES.map((t) => [t.id, t.label]));

/**
 * Filter a flat list of product taxonomy nodes: removes retired roots and their
 * descendants, and corrects labels for kept roots using the canonical v2 tree.
 *
 * Works with any node shape that has { id, depth, slug?, parent_id }.
 * The `slug` field is used for root identification; for nodes without `slug`,
 * `legacy_product_type` is checked as a fallback for depth-0 nodes.
 */
export function filterRetiredProductNodes<
  T extends { id: string; depth: number; parent_id: string | null; slug?: string; label?: string; legacy_product_type?: string | null },
>(nodes: T[]): T[] {
  // Collect IDs of retired root nodes
  const retiredIds = new Set<string>();
  for (const node of nodes) {
    if (node.depth === 0) {
      const slug = node.slug ?? node.legacy_product_type ?? "";
      if (RETIRED_TYPE_IDS.has(slug)) {
        retiredIds.add(node.id);
      }
    }
  }

  // Walk depth-ordered nodes to mark descendants of retired roots
  for (const node of nodes) {
    if (node.parent_id && retiredIds.has(node.parent_id)) {
      retiredIds.add(node.id);
    }
  }

  return nodes
    .filter((n) => !retiredIds.has(n.id))
    .map((n) => {
      // Apply canonical label for kept root nodes
      if (n.depth === 0 && n.label != null) {
        const slug = n.slug ?? n.legacy_product_type ?? "";
        const canonical = CANONICAL_ROOT_LABELS.get(slug);
        if (canonical && n.label !== canonical) {
          return { ...n, label: canonical };
        }
      }
      return n;
    });
}

/** Returns true if the given type id is a retired legacy root. */
export function isLegacyType(typeId: string): boolean {
  return RETIRED_TYPE_IDS.has(typeId);
}

/**
 * Category-level alias map for retired roots.
 * Key: "oldType:oldCategory" → { type, category } in the new tree.
 * Subcategory IDs are preserved as-is (they exist in the new tree).
 */
const LEGACY_CATEGORY_MAP: Record<string, { type: string; category: string }> = {
  // ── fixtures-fittings splits ──
  "fixtures-fittings:bathroom":      { type: "bathroom",     category: "sanitaryware" },
  "fixtures-fittings:kitchen":       { type: "kitchen",      category: "kitchen-sinks" },
  "fixtures-fittings:door-window":   { type: "doors-windows", category: "door-window-hardware" },
  "fixtures-fittings:radiators-hvac": { type: "systems-tech", category: "hvac-climate" },
  "fixtures-fittings:other-fixtures": { type: "hardware",    category: "architectural-ironmongery" },

  // ── surfaces-materials splits ──
  "surfaces-materials:flooring":            { type: "flooring",              category: "tile-stone-flooring" },
  "surfaces-materials:wall-surfaces":       { type: "walls-ceilings-facades", category: "wall-panels-cladding" },
  "surfaces-materials:countertops-worktops": { type: "surfaces-countertops", category: "natural-stone" },
  "surfaces-materials:tiles":               { type: "walls-ceilings-facades", category: "wall-tiles" },
  "surfaces-materials:solid-surfaces":      { type: "surfaces-countertops",  category: "engineered-quartz" },
  "surfaces-materials:other-surfaces":      { type: "walls-ceilings-facades", category: "acoustic-solutions" },

  // ── appliances absorption ──
  "appliances:kitchen-appliances": { type: "kitchen",      category: "cooking-appliances" },
  "appliances:laundry":            { type: "systems-tech", category: "laundry-appliances" },
  "appliances:climate":            { type: "systems-tech", category: "hvac-climate" },
  "appliances:other-appliances":   { type: "systems-tech", category: "plumbing" },
};

/**
 * Subcategory-level overrides for cases where a single old category's
 * subcategories scatter across multiple new categories.
 * Key: "oldType:oldCategory:oldSubcategory" → { type, category, subcategory }
 */
const LEGACY_SUBCATEGORY_MAP: Record<string, ResolvedTaxonomyPath> = {
  // fixtures-fittings:bathroom — subcategories go to different bathroom categories
  "fixtures-fittings:bathroom:faucet":             { type: "bathroom", category: "bathroom-faucets",     subcategory: "faucet" },
  "fixtures-fittings:bathroom:shower":             { type: "bathroom", category: "bathtubs-showers",     subcategory: "shower" },
  "fixtures-fittings:bathroom:bathtub":            { type: "bathroom", category: "bathtubs-showers",     subcategory: "bathtub" },
  "fixtures-fittings:bathroom:toilet":             { type: "bathroom", category: "sanitaryware",         subcategory: "toilet" },
  "fixtures-fittings:bathroom:basin":              { type: "bathroom", category: "sanitaryware",         subcategory: "basin" },
  "fixtures-fittings:bathroom:bathroom-accessory": { type: "bathroom", category: "bathroom-accessories", subcategory: "bathroom-accessory" },
  "fixtures-fittings:bathroom:towel-rail":         { type: "bathroom", category: "bathroom-accessories", subcategory: "towel-rail" },

  // fixtures-fittings:kitchen — subcategories go to different kitchen categories
  "fixtures-fittings:kitchen:kitchen-faucet":   { type: "kitchen", category: "kitchen-faucets",     subcategory: "kitchen-faucet" },
  "fixtures-fittings:kitchen:sink":             { type: "kitchen", category: "kitchen-sinks",       subcategory: "sink" },
  "fixtures-fittings:kitchen:tap":              { type: "kitchen", category: "kitchen-faucets",     subcategory: "tap" },
  "fixtures-fittings:kitchen:kitchen-accessory": { type: "kitchen", category: "kitchen-accessories", subcategory: "kitchen-accessory" },
  "fixtures-fittings:kitchen:pot-filler":       { type: "kitchen", category: "kitchen-faucets",     subcategory: "pot-filler" },

  // surfaces-materials:flooring — subcategories go to specific flooring categories
  "surfaces-materials:flooring:wood-flooring":    { type: "flooring", category: "wood-flooring",       subcategory: "other-not-specified" },
  "surfaces-materials:flooring:tile-flooring":    { type: "flooring", category: "tile-stone-flooring", subcategory: "tile-flooring" },
  "surfaces-materials:flooring:stone-flooring":   { type: "flooring", category: "tile-stone-flooring", subcategory: "stone-flooring" },
  "surfaces-materials:flooring:resin-flooring":   { type: "flooring", category: "specialty-flooring",  subcategory: "resin-flooring" },
  "surfaces-materials:flooring:carpet":           { type: "flooring", category: "carpet-flooring",     subcategory: "carpet" },
  "surfaces-materials:flooring:vinyl-lvt":        { type: "flooring", category: "resilient-flooring",  subcategory: "vinyl-lvt" },
  "surfaces-materials:flooring:laminate-flooring": { type: "flooring", category: "specialty-flooring", subcategory: "laminate-flooring" },

  // surfaces-materials:wall-surfaces — subcategories go to specific walls categories
  "surfaces-materials:wall-surfaces:wall-tile":          { type: "walls-ceilings-facades", category: "wall-tiles",          subcategory: "wall-tile" },
  "surfaces-materials:wall-surfaces:porcelain-wall-tile": { type: "walls-ceilings-facades", category: "wall-tiles",         subcategory: "porcelain-wall-tile" },
  "surfaces-materials:wall-surfaces:wall-panel":         { type: "walls-ceilings-facades", category: "wall-panels-cladding", subcategory: "wall-panel" },
  "surfaces-materials:wall-surfaces:stone-cladding":     { type: "walls-ceilings-facades", category: "wall-panels-cladding", subcategory: "stone-cladding" },
  "surfaces-materials:wall-surfaces:wood-cladding":      { type: "walls-ceilings-facades", category: "wall-panels-cladding", subcategory: "wood-cladding" },
  "surfaces-materials:wall-surfaces:wall-covering":      { type: "walls-ceilings-facades", category: "wallcoverings",       subcategory: "wall-covering" },
  "surfaces-materials:wall-surfaces:brick":              { type: "walls-ceilings-facades", category: "brick-masonry",        subcategory: "brick" },

  // surfaces-materials:tiles — subcategories split between flooring and walls
  "surfaces-materials:tiles:floor-tile":     { type: "flooring",              category: "tile-stone-flooring", subcategory: "floor-tile" },
  "surfaces-materials:tiles:wall-tile":      { type: "walls-ceilings-facades", category: "wall-tiles",         subcategory: "wall-tile" },
  "surfaces-materials:tiles:mosaic":         { type: "walls-ceilings-facades", category: "wall-tiles",         subcategory: "mosaic" },
  "surfaces-materials:tiles:outdoor-tile":   { type: "flooring",              category: "outdoor-flooring",    subcategory: "outdoor-tile" },
  "surfaces-materials:tiles:porcelain-tile": { type: "walls-ceilings-facades", category: "wall-tiles",         subcategory: "porcelain-tile" },
  "surfaces-materials:tiles:ceramic-tile":   { type: "walls-ceilings-facades", category: "wall-tiles",         subcategory: "ceramic-tile" },

  // surfaces-materials:countertops-worktops — subcategories to specific surfaces categories
  "surfaces-materials:countertops-worktops:stone-worktop":  { type: "surfaces-countertops", category: "natural-stone",      subcategory: "stone-worktop" },
  "surfaces-materials:countertops-worktops:solid-surface":  { type: "surfaces-countertops", category: "solid-surface",      subcategory: "solid-surface" },
  "surfaces-materials:countertops-worktops:laminate":       { type: "surfaces-countertops", category: "laminate-surfaces",   subcategory: "laminate" },
  "surfaces-materials:countertops-worktops:wood-worktop":   { type: "surfaces-countertops", category: "wood-countertops",   subcategory: "wood-worktop" },
  "surfaces-materials:countertops-worktops:quartz-worktop": { type: "surfaces-countertops", category: "engineered-quartz",  subcategory: "quartz-worktop" },

  // surfaces-materials:solid-surfaces — subcategories to specific surfaces categories
  "surfaces-materials:solid-surfaces:engineered-stone": { type: "surfaces-countertops", category: "engineered-quartz",  subcategory: "other-not-specified" },
  "surfaces-materials:solid-surfaces:quartz":           { type: "surfaces-countertops", category: "engineered-quartz",  subcategory: "quartz" },
  "surfaces-materials:solid-surfaces:terrazzo":          { type: "surfaces-countertops", category: "terrazzo",           subcategory: "terrazzo" },
  "surfaces-materials:solid-surfaces:concrete-surface":  { type: "surfaces-countertops", category: "concrete-cement",   subcategory: "concrete-surface" },

  // surfaces-materials:other-surfaces — subcategories to walls categories
  "surfaces-materials:other-surfaces:acoustic-panel":   { type: "walls-ceilings-facades", category: "acoustic-solutions", subcategory: "acoustic-panel" },
  "surfaces-materials:other-surfaces:decorative-panel": { type: "walls-ceilings-facades", category: "wall-panels-cladding", subcategory: "decorative-panel" },
  "surfaces-materials:other-surfaces:ceiling-panel":    { type: "walls-ceilings-facades", category: "ceiling-systems",    subcategory: "ceiling-panel" },

  // appliances:kitchen-appliances — subcategories to specific kitchen categories
  "appliances:kitchen-appliances:cooker":       { type: "kitchen", category: "cooking-appliances", subcategory: "cooker" },
  "appliances:kitchen-appliances:oven":         { type: "kitchen", category: "cooking-appliances", subcategory: "oven" },
  "appliances:kitchen-appliances:hob":          { type: "kitchen", category: "cooking-appliances", subcategory: "hob" },
  "appliances:kitchen-appliances:refrigerator": { type: "kitchen", category: "refrigeration",      subcategory: "refrigerator" },
  "appliances:kitchen-appliances:dishwasher":   { type: "kitchen", category: "dishwashing",        subcategory: "dishwasher" },
  "appliances:kitchen-appliances:hood":         { type: "kitchen", category: "ventilation-hoods",   subcategory: "hood" },
  "appliances:kitchen-appliances:wine-cooler":  { type: "kitchen", category: "refrigeration",      subcategory: "wine-cooler" },
  "appliances:kitchen-appliances:microwave":    { type: "kitchen", category: "cooking-appliances", subcategory: "microwave" },

  // appliances:climate — subcategories to building systems
  "appliances:climate:air-conditioning": { type: "systems-tech", category: "hvac-climate",        subcategory: "air-conditioning" },
  "appliances:climate:dehumidifier":     { type: "systems-tech", category: "hvac-climate",        subcategory: "dehumidifier" },
  "appliances:climate:ventilation":      { type: "systems-tech", category: "hvac-climate",        subcategory: "ventilation" },
  "appliances:climate:heat-pump":        { type: "systems-tech", category: "hvac-climate",        subcategory: "heat-pump" },

  // appliances:other-appliances — subcategories to building systems
  "appliances:other-appliances:water-heater": { type: "systems-tech", category: "plumbing", subcategory: "water-heater" },
  "appliances:other-appliances:boiler":       { type: "systems-tech", category: "plumbing", subcategory: "boiler" },

  // systems-tech:other-systems — subcategories to security-access (old category retired)
  "systems-tech:other-systems:security-system": { type: "systems-tech", category: "security-access", subcategory: "security-system" },
  "systems-tech:other-systems:intercom":        { type: "systems-tech", category: "security-access", subcategory: "intercom" },

  // outdoor — landscape subcategories split across new categories
  "outdoor:landscape:paving":  { type: "outdoor", category: "paving-hardscape",  subcategory: "paving" },
  "outdoor:landscape:decking": { type: "outdoor", category: "decking",           subcategory: "decking" },
  "outdoor:landscape:fencing": { type: "outdoor", category: "fencing-screens",   subcategory: "fencing" },
  "outdoor:landscape:screen":  { type: "outdoor", category: "fencing-screens",   subcategory: "screen" },
  "outdoor:landscape:pergola": { type: "outdoor", category: "shade-structures",  subcategory: "pergola" },

  // outdoor:outdoor-lighting — redirect to lighting root
  "outdoor:outdoor-lighting:path-light":   { type: "lighting", category: "outdoor-lighting", subcategory: "path-light" },
  "outdoor:outdoor-lighting:wall-light":   { type: "lighting", category: "outdoor-lighting", subcategory: "other-not-specified" },
  "outdoor:outdoor-lighting:post-light":   { type: "lighting", category: "outdoor-lighting", subcategory: "other-not-specified" },
  "outdoor:outdoor-lighting:garden-light": { type: "lighting", category: "outdoor-lighting", subcategory: "garden-light" },

  // furniture:outdoor-furniture — redirect to outdoor root (old category removed from furniture)
  "furniture:outdoor-furniture:outdoor-seating": { type: "outdoor", category: "outdoor-furniture", subcategory: "outdoor-seating" },
  "furniture:outdoor-furniture:outdoor-table":   { type: "outdoor", category: "outdoor-furniture", subcategory: "outdoor-table" },
  "furniture:outdoor-furniture:lounge":          { type: "outdoor", category: "outdoor-furniture", subcategory: "lounge" },
  "furniture:outdoor-furniture:garden-furniture": { type: "outdoor", category: "outdoor-furniture", subcategory: "garden-furniture" },
  "furniture:outdoor-furniture:planter-bench":   { type: "outdoor", category: "outdoor-furniture", subcategory: "planter-bench" },
};

/**
 * Simple type-level resolution for legacy roots that map 1:1.
 * Only used as a fallback when no category-level alias is found.
 */
const LEGACY_TYPE_FALLBACK: Record<string, string> = {
  "fixtures-fittings":  "bathroom",
  "surfaces-materials": "flooring",
  "appliances":         "kitchen",
};

/**
 * Resolve a legacy type id to its new primary type.
 * Returns the input unchanged if it is not a legacy type.
 */
export function resolveLegacyType(typeId: string): string {
  return LEGACY_TYPE_FALLBACK[typeId] ?? typeId;
}

/**
 * For a canonical slug_path, return the set of legacy product_type column values
 * that map to this category (for backward compat queries on unmapped listings).
 *
 * E.g. "bathroom" → ["bathroom"] (the root slug is the product_type for new listings).
 * For roots that absorbed retired types, also includes those retired type slugs
 * so unmapped listings stored under old product_type values are still matched.
 */
export function getCanonicalLegacyTypes(slugPath: string): string[] {
  const rootSlug = slugPath.split("/")[0];
  const types = [rootSlug];
  for (const [retiredType, target] of Object.entries(LEGACY_TYPE_FALLBACK)) {
    if (target === rootSlug) {
      types.push(retiredType);
    }
  }
  return types;
}

/**
 * Resolve a full legacy taxonomy path { type, category, subcategory } to its
 * new location in the v2 tree. Returns the input unchanged if no alias exists.
 *
 * Resolution order (most specific wins):
 *   1. "type:category:subcategory" in LEGACY_SUBCATEGORY_MAP
 *   2. "type:category" in LEGACY_CATEGORY_MAP (subcategory preserved)
 *   3. type in LEGACY_TYPE_FALLBACK (category + subcategory preserved)
 *   4. No match — return input as-is
 */
export function resolveLegacyPath(
  typeId: string,
  categoryId?: string | null,
  subcategoryId?: string | null,
): ResolvedTaxonomyPath {
  const t = typeId ?? "";
  const c = categoryId ?? "";
  const s = subcategoryId ?? PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID;

  // 1. Exact subcategory match
  const subKey = `${t}:${c}:${s}`;
  if (LEGACY_SUBCATEGORY_MAP[subKey]) {
    return LEGACY_SUBCATEGORY_MAP[subKey];
  }

  // 2. Category-level match (keep subcategory as-is)
  const catKey = `${t}:${c}`;
  if (LEGACY_CATEGORY_MAP[catKey]) {
    const mapped = LEGACY_CATEGORY_MAP[catKey];
    return { type: mapped.type, category: mapped.category, subcategory: s };
  }

  // 3. Type-level fallback
  if (LEGACY_TYPE_FALLBACK[t]) {
    return { type: LEGACY_TYPE_FALLBACK[t], category: c, subcategory: s };
  }

  // 4. No alias — return as-is
  return { type: t, category: c, subcategory: s };
}

/**
 * Get the display label for a type id, resolving legacy aliases.
 * Returns undefined if the type is not found even after resolution.
 */
export function getTypeLabel(typeId: string): string | undefined {
  const direct = getTypeById(typeId);
  if (direct) return direct.label;
  const resolved = resolveLegacyType(typeId);
  return getTypeById(resolved)?.label;
}
