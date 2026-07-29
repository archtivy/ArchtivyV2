-- Lifecycle & Collaboration system fields on listings table
-- Run this migration in Supabase SQL editor before deploying the code changes.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS project_status              TEXT,
  ADD COLUMN IF NOT EXISTS product_stage               TEXT,
  ADD COLUMN IF NOT EXISTS project_collaboration_status TEXT,
  ADD COLUMN IF NOT EXISTS project_looking_for          JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_collaboration_status TEXT,
  ADD COLUMN IF NOT EXISTS product_looking_for          JSONB DEFAULT '[]'::jsonb;

-- Optional: add check constraints for enum safety
ALTER TABLE listings
  ADD CONSTRAINT chk_project_status CHECK (
    project_status IS NULL OR project_status IN (
      'concept', 'design_development', 'under_construction',
      'completed', 'competition_entry', 'unbuilt'
    )
  ),
  ADD CONSTRAINT chk_product_stage CHECK (
    product_stage IS NULL OR product_stage IN (
      'concept', 'in_development', 'prototype', 'production_ready',
      'in_production', 'limited_production', 'custom_made', 'discontinued'
    )
  ),
  ADD CONSTRAINT chk_project_collaboration_status CHECK (
    project_collaboration_status IS NULL OR project_collaboration_status IN (
      'open_for_collaboration', 'seeking_partners', 'seeking_suppliers',
      'seeking_brands', 'not_open_for_collaboration'
    )
  ),
  ADD CONSTRAINT chk_product_collaboration_status CHECK (
    product_collaboration_status IS NULL OR product_collaboration_status IN (
      'seeking_manufacturer', 'open_to_manufacturing_partnership',
      'open_to_licensing', 'seeking_brand_partner', 'not_open_for_collaboration'
    )
  );

-- Index for opportunities feed query
CREATE INDEX IF NOT EXISTS idx_listings_project_status ON listings (project_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_product_stage  ON listings (product_stage)  WHERE deleted_at IS NULL;
