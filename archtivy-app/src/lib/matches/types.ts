/**
 * Types for Archtivy Matches Engine.
 * project_id = listings.id where type='project'; product_id = products.id.
 */

export const EMBEDDING_DIM = 1536;

export type ImageSource = "project" | "product";

export interface ImageAiRow {
  image_id: string;
  source: ImageSource;
  embedding: number[] | null;
  attrs: ImageAttrs;
  confidence: number;
  updated_at: string;
}

export interface ImageAttrs {
  category?: string[];
  material?: string[];
  color?: string[];
  context?: string[];
  [key: string]: unknown;
}

export type MatchTier = "verified" | "possible" | "strong" | "likely";

export interface MatchRow {
  project_id: string;
  product_id: string;
  score: number;
  tier: MatchTier;
  reasons: MatchReason[];
  evidence_image_ids: string[];
  updated_at: string;
}

export interface MatchReason {
  type: "embedding" | "attribute" | "frequency";
  score?: number;
  matches?: string[];
}

export interface ProjectImageRef {
  image_id: string;
  project_id: string;
  url: string;
}

export interface ProductImageRef {
  image_id: string;
  product_id: string;
  url: string;
}
