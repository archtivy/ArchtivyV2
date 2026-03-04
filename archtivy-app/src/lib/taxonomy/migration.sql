-- Premium Taxonomy System — Database Migration
-- Run this against your Supabase project (SQL Editor or CLI).
-- All operations are additive — no existing tables or columns are modified.

-- ─── 1A. taxonomy_nodes — hierarchical taxonomy tree ────────────────────────

CREATE TABLE IF NOT EXISTS taxonomy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL CHECK (domain IN ('product', 'project', 'material', 'style')),
  parent_id UUID REFERENCES taxonomy_nodes(id) ON DELETE SET NULL,
  depth INT NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 3),
  slug TEXT NOT NULL,
  slug_path TEXT NOT NULL,
  label TEXT NOT NULL,
  label_plural TEXT,
  description TEXT,
  icon_key TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  legacy_product_type TEXT,
  legacy_product_category TEXT,
  legacy_product_subcategory TEXT,
  legacy_project_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (domain, slug_path)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_domain ON taxonomy_nodes(domain);
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_parent ON taxonomy_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_slug_path ON taxonomy_nodes(slug_path);
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_legacy_product ON taxonomy_nodes(legacy_product_type, legacy_product_category, legacy_product_subcategory);
CREATE INDEX IF NOT EXISTS idx_taxonomy_nodes_legacy_project ON taxonomy_nodes(legacy_project_category);

-- ─── 1B. listing_taxonomy_node — many-to-many (listing ↔ taxonomy node) ─────

CREATE TABLE IF NOT EXISTS listing_taxonomy_node (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  taxonomy_node_id UUID NOT NULL REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, taxonomy_node_id)
);

CREATE INDEX IF NOT EXISTS idx_ltn_listing ON listing_taxonomy_node(listing_id);
CREATE INDEX IF NOT EXISTS idx_ltn_node ON listing_taxonomy_node(taxonomy_node_id);

-- ─── 1C. facets + facet_values — flat tag dimensions ────────────────────────

CREATE TABLE IF NOT EXISTS facets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  applies_to TEXT[] NOT NULL DEFAULT '{"product","project"}',
  is_multi_select BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facet_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facet_id UUID NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facet_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_facet_values_facet ON facet_values(facet_id);

-- ─── 1D. listing_facets — listing ↔ facet value link ────────────────────────

CREATE TABLE IF NOT EXISTS listing_facets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  facet_value_id UUID NOT NULL REFERENCES facet_values(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, facet_value_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_facets_listing ON listing_facets(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_facets_value ON listing_facets(facet_value_id);

-- ─── 1E. search_synonyms — keyword → taxonomy node / facet value mapping ────

CREATE TABLE IF NOT EXISTS search_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  taxonomy_node_id UUID REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
  facet_value_id UUID REFERENCES facet_values(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (taxonomy_node_id IS NOT NULL OR facet_value_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_search_synonyms_term ON search_synonyms(lower(term));

-- ─── 1F. taxonomy_redirects — SEO-safe slug changes ─────────────────────────

CREATE TABLE IF NOT EXISTS taxonomy_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_slug_path TEXT NOT NULL UNIQUE,
  new_slug_path TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 1G. Add taxonomy_node_id to listings (nullable) ────────────────────────

ALTER TABLE listings ADD COLUMN IF NOT EXISTS taxonomy_node_id UUID REFERENCES taxonomy_nodes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_listings_taxonomy_node ON listings(taxonomy_node_id);

-- ─── Enable RLS (policies depend on your setup; start permissive) ───────────

ALTER TABLE taxonomy_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_taxonomy_node ENABLE ROW LEVEL SECURITY;
ALTER TABLE facets ENABLE ROW LEVEL SECURITY;
ALTER TABLE facet_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_facets ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_redirects ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (matches existing pattern)
CREATE POLICY "Service role full access" ON taxonomy_nodes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON listing_taxonomy_node FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON facets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON facet_values FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON listing_facets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON search_synonyms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON taxonomy_redirects FOR ALL USING (true) WITH CHECK (true);

-- Public read access for taxonomy reference tables
CREATE POLICY "Public read taxonomy_nodes" ON taxonomy_nodes FOR SELECT USING (true);
CREATE POLICY "Public read facets" ON facets FOR SELECT USING (true);
CREATE POLICY "Public read facet_values" ON facet_values FOR SELECT USING (true);
CREATE POLICY "Public read search_synonyms" ON search_synonyms FOR SELECT USING (true);
CREATE POLICY "Public read taxonomy_redirects" ON taxonomy_redirects FOR SELECT USING (true);
