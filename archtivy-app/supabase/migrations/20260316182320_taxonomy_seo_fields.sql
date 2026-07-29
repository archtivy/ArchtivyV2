-- Additive migration: add SEO columns to taxonomy_nodes.
-- Does NOT modify or delete existing columns/data.

ALTER TABLE taxonomy_nodes
  ADD COLUMN IF NOT EXISTS seo_title        text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS intro_text       text,
  ADD COLUMN IF NOT EXISTS featured_image   text;

COMMENT ON COLUMN taxonomy_nodes.seo_title        IS 'Custom page <title> for this taxonomy page. Falls back to label if NULL.';
COMMENT ON COLUMN taxonomy_nodes.meta_description  IS 'Custom meta description for this taxonomy page. Falls back to description if NULL.';
COMMENT ON COLUMN taxonomy_nodes.intro_text        IS 'Editorial intro text rendered above listings on the taxonomy page.';
COMMENT ON COLUMN taxonomy_nodes.featured_image    IS 'URL of a featured/hero image for this taxonomy page (OG image, hero).';
