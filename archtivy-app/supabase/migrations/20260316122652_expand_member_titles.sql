-- Safe additive migration: expand member_titles with new professional roles.
-- Does NOT modify or delete existing rows.
-- Uses ON CONFLICT to skip duplicates if titles already exist.
--
-- All professional titles (designers, engineers, construction) map to 'designer'.
-- Only manufacturer/brand titles map to 'brand'.
-- UI grouping is handled in frontend code, not by maps_to_role.

-- ── Designer titles (new additions) ──
INSERT INTO member_titles (label, maps_to_role, sort_order, is_active) VALUES
  ('Architectural Designer', 'designer', 15, true),
  ('Urban Designer', 'designer', 25, true),
  ('Bathroom Furniture Designer', 'designer', 55, true),
  ('Technical Drawing Specialist', 'designer', 65, true)
ON CONFLICT (label) DO NOTHING;

-- ── Engineer titles (maps_to_role = 'designer' for DB constraint compat) ──
INSERT INTO member_titles (label, maps_to_role, sort_order, is_active) VALUES
  ('Structural Engineer', 'designer', 100, true),
  ('Civil Engineer', 'designer', 110, true),
  ('Mechanical Engineer', 'designer', 120, true),
  ('Electrical Engineer', 'designer', 130, true),
  ('Environmental Engineer', 'designer', 140, true),
  ('Façade Engineer', 'designer', 150, true),
  ('Building Systems Engineer', 'designer', 160, true)
ON CONFLICT (label) DO NOTHING;

-- ── Construction / Project Delivery (maps_to_role = 'designer' for DB constraint compat) ──
INSERT INTO member_titles (label, maps_to_role, sort_order, is_active) VALUES
  ('General Contractor', 'designer', 200, true),
  ('Construction Company', 'designer', 210, true),
  ('Builder', 'designer', 220, true),
  ('Developer', 'designer', 230, true),
  ('Project Manager', 'designer', 240, true),
  ('Landscape Contractor', 'designer', 250, true),
  ('Pool Designer', 'designer', 260, true),
  ('Pool Contractor', 'designer', 270, true),
  ('Façade Contractor', 'designer', 280, true),
  ('Engineering Firm', 'designer', 290, true)
ON CONFLICT (label) DO NOTHING;

-- ── Brand titles (new additions) ──
INSERT INTO member_titles (label, maps_to_role, sort_order, is_active) VALUES
  ('Ceramics & Tiles', 'brand', 350, true),
  ('Stone & Marble', 'brand', 355, true),
  ('Kitchens & Wardrobes', 'brand', 360, true),
  ('Outdoor Furniture', 'brand', 365, true),
  ('Decorative Elements', 'brand', 370, true),
  ('Textiles', 'brand', 375, true),
  ('Doors & Windows', 'brand', 400, true),
  ('Flooring', 'brand', 410, true),
  ('Wall Systems', 'brand', 420, true),
  ('Ceiling Systems', 'brand', 430, true),
  ('Roofing Systems', 'brand', 440, true),
  ('Facade Systems', 'brand', 450, true),
  ('Wood Products', 'brand', 460, true),
  ('Concrete Products', 'brand', 470, true),
  ('Metal Systems', 'brand', 480, true),
  ('Architectural Fabrication', 'brand', 490, true),
  ('Custom Fabrication', 'brand', 500, true)
ON CONFLICT (label) DO NOTHING;
