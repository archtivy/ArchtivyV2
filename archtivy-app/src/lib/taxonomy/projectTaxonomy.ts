/**
 * Project taxonomy: Building Type → Subcategory (frontend-controlled).
 *
 * 14 root building types with subcategories for project specification.
 * Mirrors the seed data in seedData.ts — serves as a static fallback
 * when the DB taxonomy is incomplete or unavailable.
 */

export interface ProjectSubcategory {
  id: string;
  label: string;
}

export interface ProjectBuildingType {
  id: string;
  label: string;
  /** Maps to listings.category for legacy compatibility. */
  legacyCategory: string | null;
  subcategories: ProjectSubcategory[];
}

const BUILDING_TYPES: ProjectBuildingType[] = [
  {
    id: "residential",
    label: "Residential",
    legacyCategory: "Residential",
    subcategories: [
      { id: "single-family-house", label: "Single-Family House" },
      { id: "apartment", label: "Apartment" },
      { id: "villa", label: "Villa" },
      { id: "townhouse", label: "Townhouse" },
      { id: "housing-complex", label: "Housing Complex" },
      { id: "loft-studio", label: "Loft / Studio" },
      { id: "penthouse", label: "Penthouse" },
      { id: "co-living", label: "Co-Living" },
      { id: "prefab-house", label: "Prefab House" },
      { id: "micro-unit", label: "Micro Unit" },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    legacyCategory: "Commercial",
    subcategories: [
      { id: "office-building", label: "Office Building" },
      { id: "co-working", label: "Co-Working" },
      { id: "headquarters", label: "Headquarters" },
      { id: "retail-store", label: "Retail Store" },
      { id: "showroom", label: "Showroom" },
      { id: "shopping-mall", label: "Shopping Mall" },
      { id: "mixed-use", label: "Mixed-Use" },
      { id: "market-hall", label: "Market Hall" },
      { id: "warehouse-logistics", label: "Warehouse / Logistics" },
    ],
  },
  {
    id: "hospitality",
    label: "Hospitality",
    legacyCategory: "Hospitality",
    subcategories: [
      { id: "hotel", label: "Hotel" },
      { id: "boutique-hotel", label: "Boutique Hotel" },
      { id: "resort", label: "Resort" },
      { id: "hostel", label: "Hostel" },
      { id: "restaurant", label: "Restaurant" },
      { id: "bar-lounge", label: "Bar / Lounge" },
      { id: "cafe", label: "Cafe" },
      { id: "spa-wellness", label: "Spa / Wellness" },
      { id: "convention-center", label: "Convention Center" },
    ],
  },
  {
    id: "retail",
    label: "Retail",
    legacyCategory: "Retail",
    subcategories: [
      { id: "boutique", label: "Boutique" },
      { id: "flagship-store", label: "Flagship Store" },
      { id: "pop-up-shop", label: "Pop-Up Shop" },
      { id: "department-store", label: "Department Store" },
      { id: "grocery-supermarket", label: "Grocery / Supermarket" },
      { id: "showroom-gallery", label: "Showroom / Gallery" },
      { id: "kiosk", label: "Kiosk" },
    ],
  },
  {
    id: "office",
    label: "Office",
    legacyCategory: "Office",
    subcategories: [
      { id: "corporate-office", label: "Corporate Office" },
      { id: "co-working-space", label: "Co-Working Space" },
      { id: "creative-studio", label: "Creative Studio" },
      { id: "tech-office", label: "Tech Office" },
      { id: "home-office", label: "Home Office" },
      { id: "executive-suite", label: "Executive Suite" },
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    legacyCategory: "Healthcare",
    subcategories: [
      { id: "hospital", label: "Hospital" },
      { id: "clinic", label: "Clinic" },
      { id: "rehabilitation", label: "Rehabilitation Center" },
      { id: "elderly-care", label: "Elderly Care" },
      { id: "laboratory", label: "Laboratory" },
      { id: "veterinary-clinic", label: "Veterinary Clinic" },
    ],
  },
  {
    id: "education",
    label: "Education",
    legacyCategory: "Education",
    subcategories: [
      { id: "school", label: "School" },
      { id: "university", label: "University" },
      { id: "kindergarten", label: "Kindergarten" },
      { id: "research-facility", label: "Research Facility" },
      { id: "student-housing", label: "Student Housing" },
      { id: "campus-master-plan", label: "Campus Master Plan" },
    ],
  },
  {
    id: "cultural",
    label: "Cultural",
    legacyCategory: "Cultural",
    subcategories: [
      { id: "museum", label: "Museum" },
      { id: "art-gallery", label: "Art Gallery" },
      { id: "theater", label: "Theater" },
      { id: "concert-hall", label: "Concert Hall" },
      { id: "cultural-center", label: "Cultural Center" },
      { id: "exhibition-space", label: "Exhibition Space" },
      { id: "library", label: "Library" },
      { id: "memorial-monument", label: "Memorial / Monument" },
      { id: "pavilion", label: "Pavilion" },
    ],
  },
  {
    id: "public-civic",
    label: "Public / Civic",
    legacyCategory: "Public / Civic",
    subcategories: [
      { id: "government-building", label: "Government Building" },
      { id: "courthouse", label: "Courthouse" },
      { id: "embassy", label: "Embassy" },
      { id: "fire-station", label: "Fire Station" },
      { id: "community-center", label: "Community Center" },
      { id: "religious-building", label: "Religious Building" },
      { id: "cemetery", label: "Cemetery" },
    ],
  },
  {
    id: "landscape-urban",
    label: "Landscape / Urban",
    legacyCategory: "Landscape / Urban",
    subcategories: [
      { id: "park", label: "Park" },
      { id: "plaza", label: "Plaza" },
      { id: "urban-master-plan", label: "Urban Master Plan" },
      { id: "waterfront", label: "Waterfront" },
      { id: "streetscape", label: "Streetscape" },
      { id: "garden", label: "Garden" },
      { id: "rooftop-landscape", label: "Rooftop Landscape" },
      { id: "playground", label: "Playground" },
    ],
  },
  {
    id: "interior",
    label: "Interior",
    legacyCategory: "Interior",
    subcategories: [
      { id: "residential-interior", label: "Residential Interior" },
      { id: "commercial-interior", label: "Commercial Interior" },
      { id: "hospitality-interior", label: "Hospitality Interior" },
      { id: "retail-interior", label: "Retail Interior" },
      { id: "workplace-interior", label: "Workplace Interior" },
      { id: "exhibition-set-design", label: "Exhibition / Set Design" },
    ],
  },
  {
    id: "other",
    label: "Other",
    legacyCategory: "Other",
    subcategories: [
      { id: "temporary-pop-up", label: "Temporary / Pop-Up" },
      { id: "experimental", label: "Experimental" },
      { id: "competition-entry", label: "Competition Entry" },
      { id: "unbuilt-conceptual", label: "Unbuilt / Conceptual" },
      { id: "adaptive-reuse", label: "Adaptive Reuse" },
      { id: "renovation-restoration", label: "Renovation / Restoration" },
    ],
  },
  {
    id: "sports-recreation",
    label: "Sports & Recreation",
    legacyCategory: null,
    subcategories: [
      { id: "stadium", label: "Stadium" },
      { id: "arena", label: "Arena" },
      { id: "sports-center", label: "Sports Center" },
      { id: "swimming-pool", label: "Swimming Pool" },
      { id: "tennis-padel", label: "Tennis / Padel" },
      { id: "climbing-hall", label: "Climbing Hall" },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    legacyCategory: null,
    subcategories: [
      { id: "bridge", label: "Bridge" },
      { id: "airport-terminal", label: "Airport / Terminal" },
      { id: "train-station", label: "Train Station" },
      { id: "metro-station", label: "Metro Station" },
      { id: "bus-terminal", label: "Bus Terminal" },
      { id: "port-marina", label: "Port / Marina" },
      { id: "parking-structure", label: "Parking Structure" },
      { id: "power-plant", label: "Power Plant" },
    ],
  },
];

export const PROJECT_TAXONOMY: ProjectBuildingType[] = BUILDING_TYPES;

export function getSubcategoriesForBuildingType(
  buildingTypeId: string
): ProjectSubcategory[] {
  const bt = BUILDING_TYPES.find((t) => t.id === buildingTypeId);
  return bt?.subcategories ?? [];
}

export function getBuildingTypeById(
  id: string
): ProjectBuildingType | undefined {
  return BUILDING_TYPES.find((t) => t.id === id);
}
