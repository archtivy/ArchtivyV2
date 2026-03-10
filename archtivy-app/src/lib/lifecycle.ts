/**
 * Lifecycle & Collaboration system.
 * Enum values, display labels, badge colors, opportunity detection.
 */

// ─── PROJECT STATUS ─────────────────────────────────────────────────────────

export const PROJECT_STATUS_VALUES = [
  "concept",
  "design_development",
  "under_construction",
  "completed",
  "competition_entry",
  "unbuilt",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  concept: "Concept",
  design_development: "Design Development",
  under_construction: "Under Construction",
  completed: "Completed",
  competition_entry: "Competition Entry",
  unbuilt: "Unbuilt",
};

export const PROJECT_STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  concept:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  design_development:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  under_construction:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  competition_entry:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  unbuilt:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

// ─── PRODUCT STAGE ───────────────────────────────────────────────────────────

export const PRODUCT_STAGE_VALUES = [
  "concept",
  "in_development",
  "prototype",
  "production_ready",
  "in_production",
  "limited_production",
  "custom_made",
  "discontinued",
] as const;

export type ProductStage = (typeof PRODUCT_STAGE_VALUES)[number];

export const PRODUCT_STAGE_LABELS: Record<ProductStage, string> = {
  concept: "Concept",
  in_development: "In Development",
  prototype: "Prototype",
  production_ready: "Production Ready",
  in_production: "In Production",
  limited_production: "Limited Production",
  custom_made: "Custom Made",
  discontinued: "Discontinued",
};

export const PRODUCT_STAGE_BADGE_CLASS: Record<ProductStage, string> = {
  concept:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  in_development:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  prototype:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  production_ready:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  in_production:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  limited_production:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  custom_made:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  discontinued:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
};

// ─── PROJECT COLLABORATION ────────────────────────────────────────────────────

export const PROJECT_COLLAB_VALUES = [
  "open_for_collaboration",
  "seeking_partners",
  "seeking_suppliers",
  "seeking_brands",
  "not_open_for_collaboration",
] as const;

export type ProjectCollaborationStatus =
  (typeof PROJECT_COLLAB_VALUES)[number];

export const PROJECT_COLLAB_LABELS: Record<ProjectCollaborationStatus, string> =
  {
    open_for_collaboration: "Open for Collaboration",
    seeking_partners: "Seeking Partners",
    seeking_suppliers: "Seeking Suppliers",
    seeking_brands: "Seeking Brands",
    not_open_for_collaboration: "Not Open for Collaboration",
  };

// ─── PROJECT LOOKING FOR ─────────────────────────────────────────────────────

export const PROJECT_LOOKING_FOR_OPTIONS = [
  { value: "architect", label: "Architect" },
  { value: "interior_designer", label: "Interior Designer" },
  { value: "lighting_designer", label: "Lighting Designer" },
  { value: "landscape_architect", label: "Landscape Architect" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "furniture_brand", label: "Furniture Brand" },
  { value: "material_supplier", label: "Material Supplier" },
  { value: "fabricator", label: "Fabricator" },
  { value: "developer", label: "Developer" },
  { value: "investor", label: "Investor" },
] as const;

export type ProjectLookingFor =
  (typeof PROJECT_LOOKING_FOR_OPTIONS)[number]["value"];

// ─── PRODUCT COLLABORATION ────────────────────────────────────────────────────

export const PRODUCT_COLLAB_VALUES = [
  "seeking_manufacturer",
  "open_to_manufacturing_partnership",
  "open_to_licensing",
  "seeking_brand_partner",
  "not_open_for_collaboration",
] as const;

export type ProductCollaborationStatus =
  (typeof PRODUCT_COLLAB_VALUES)[number];

export const PRODUCT_COLLAB_LABELS: Record<ProductCollaborationStatus, string> =
  {
    seeking_manufacturer: "Seeking Manufacturer",
    open_to_manufacturing_partnership: "Open to Manufacturing Partnership",
    open_to_licensing: "Open to Licensing",
    seeking_brand_partner: "Seeking Brand Partner",
    not_open_for_collaboration: "Not Open for Collaboration",
  };

// ─── PRODUCT LOOKING FOR ─────────────────────────────────────────────────────

export const PRODUCT_LOOKING_FOR_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "fabricator", label: "Fabricator" },
  { value: "brand_partner", label: "Brand Partner" },
  { value: "distributor", label: "Distributor" },
  { value: "retail_partner", label: "Retail Partner" },
  { value: "licensing_partner", label: "Licensing Partner" },
] as const;

export type ProductLookingFor =
  (typeof PRODUCT_LOOKING_FOR_OPTIONS)[number]["value"];

// ─── OPPORTUNITY DETECTION ────────────────────────────────────────────────────

export type OpportunityType =
  | "design_opportunity"
  | "construction_opportunity"
  | "collaboration_opportunity"
  | "concept_design"
  | "industry_signal";

export interface DetectedOpportunity {
  type: OpportunityType;
  label: string;
  description: string;
}

export function detectProjectOpportunities(
  project_status: string | null,
  collaboration_status: string | null
): DetectedOpportunity[] {
  const out: DetectedOpportunity[] = [];

  if (project_status === "under_construction") {
    out.push({
      type: "construction_opportunity",
      label: "Construction Opportunity",
      description: "Project entering construction phase",
    });
  } else if (project_status === "concept") {
    out.push({
      type: "concept_design",
      label: "Concept Architecture",
      description: "New experimental project proposal",
    });
  } else if (project_status === "design_development") {
    out.push({
      type: "industry_signal",
      label: "Design Development",
      description: "Project in active design development",
    });
  }

  if (
    collaboration_status &&
    collaboration_status !== "not_open_for_collaboration"
  ) {
    out.push({
      type: "collaboration_opportunity",
      label: "Collaboration Opportunity",
      description:
        PROJECT_COLLAB_LABELS[
          collaboration_status as ProjectCollaborationStatus
        ] ?? collaboration_status,
    });
  }

  return out;
}

export function detectProductOpportunities(
  product_stage: string | null,
  collaboration_status: string | null
): DetectedOpportunity[] {
  const out: DetectedOpportunity[] = [];

  if (
    (product_stage === "concept" || product_stage === "prototype") &&
    collaboration_status === "seeking_manufacturer"
  ) {
    out.push({
      type: "design_opportunity",
      label: "Design Opportunity",
      description: `${product_stage === "prototype" ? "Prototype" : "Concept"} design seeking manufacturer`,
    });
  } else if (product_stage === "concept" || product_stage === "prototype") {
    out.push({
      type: "design_opportunity",
      label: "Design Opportunity",
      description: `${product_stage === "prototype" ? "Prototype" : "Concept"} product design`,
    });
  } else if (product_stage === "in_development") {
    out.push({
      type: "industry_signal",
      label: "In Development",
      description: "Product currently in development",
    });
  }

  if (
    collaboration_status &&
    collaboration_status !== "not_open_for_collaboration" &&
    out.length === 0
  ) {
    out.push({
      type: "collaboration_opportunity",
      label: "Collaboration Opportunity",
      description:
        PRODUCT_COLLAB_LABELS[
          collaboration_status as ProductCollaborationStatus
        ] ?? collaboration_status,
    });
  }

  return out;
}

/** True if a listing should appear in the Opportunities feed. */
export function isOpportunity(listing: {
  type: string;
  project_status?: string | null;
  product_stage?: string | null;
  project_collaboration_status?: string | null;
  product_collaboration_status?: string | null;
}): boolean {
  if (listing.type === "project") {
    const s = listing.project_status;
    if (s === "under_construction" || s === "concept" || s === "design_development")
      return true;
    if (
      listing.project_collaboration_status &&
      listing.project_collaboration_status !== "not_open_for_collaboration"
    )
      return true;
  }
  if (listing.type === "product") {
    const s = listing.product_stage;
    if (s === "concept" || s === "prototype" || s === "in_development")
      return true;
    if (
      listing.product_collaboration_status &&
      listing.product_collaboration_status !== "not_open_for_collaboration"
    )
      return true;
  }
  return false;
}

export const OPPORTUNITY_TYPE_BADGE_CLASS: Record<string, string> = {
  design_opportunity:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  construction_opportunity:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  collaboration_opportunity:
    "bg-[#002abf]/10 text-[#002abf] dark:bg-[#002abf]/20 dark:text-blue-300",
  concept_design:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  industry_signal:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
