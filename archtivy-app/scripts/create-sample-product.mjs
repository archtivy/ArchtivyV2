import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnvFromDotEnv(dotEnvPath) {
  if (!fs.existsSync(dotEnvPath)) return;
  const raw = fs.readFileSync(dotEnvPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!key) continue;
    if (process.env[key] == null) process.env[key] = val;
  }
}

const repoRoot = path.resolve(process.cwd());
loadEnvFromDotEnv(path.join(repoRoot, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const TITLE =
  "Frameless Tempered Glass Shower Panel with Stainless Steel Brackets";

const DESCRIPTION = `Elevate contemporary bathrooms with a frameless shower panel designed for clean architectural lines and minimal visual hardware. This panel is fabricated from premium tempered glass for enhanced safety and long-term durability, delivering a crisp, transparent finish that complements modern interiors. Discreet stainless steel brackets provide secure, corrosion-resistant support while maintaining a refined, floating appearance. Ideal for high-end residential and hospitality applications, the system integrates seamlessly with stone, concrete, and tile palettes and supports an open, light-filled layout. Precision edges and a balanced bracket profile make installation straightforward while preserving the minimalist aesthetic designers expect in modern architectural interiors. Manufactured for consistent clarity and stability, it’s a reliable specification choice where performance and restraint matter. Based in Los Angeles, United States.`;

const YEAR = 2026;

const REQUIRED_MATERIAL_NAMES = ["Glass", "Tempered Glass", "Stainless Steel"];

function slugFromTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 70);
}

async function ensureUniqueProductSlug(baseSlug) {
  let slug = baseSlug || "product";
  let n = 1;
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`slug check failed: ${error.message}`);
    if (!data) return slug;
    slug = `${baseSlug}-${++n}`;
  }
}

function pickCategory(existing) {
  const lc = existing.map((c) => c.toLowerCase());
  const prefs = ["bath", "shower", "fixture", "interior", "hardware"];
  for (const pref of prefs) {
    const idx = lc.findIndex((c) => c.includes(pref));
    if (idx !== -1) return existing[idx];
  }
  // reasonable fallback if no categories exist yet
  return "Bathroom Fixtures";
}

async function main() {
  // Find material ids by exact name (display_name must be materials.name)
  const { data: mats, error: matsErr } = await supabase
    .from("materials")
    .select("id,name,slug")
    .in("name", REQUIRED_MATERIAL_NAMES);

  if (matsErr) throw new Error(`materials lookup failed: ${matsErr.message}`);

  const byName = new Map((mats ?? []).map((m) => [m.name, m]));
  const missing = REQUIRED_MATERIAL_NAMES.filter((n) => !byName.has(n));
  if (missing.length) {
    throw new Error(`Missing required materials in public.materials: ${missing.join(", ")}`);
  }
  const materialIds = REQUIRED_MATERIAL_NAMES.map((n) => byName.get(n).id);

  // Find closest existing category
  const { data: catRows, error: catErr } = await supabase
    .from("products")
    .select("category")
    .not("category", "is", null)
    .limit(200);
  if (catErr) throw new Error(`category lookup failed: ${catErr.message}`);
  const categories = Array.from(
    new Set((catRows ?? []).map((r) => (r.category ?? "").trim()).filter(Boolean))
  );
  const category = pickCategory(categories);

  const slug = await ensureUniqueProductSlug(slugFromTitle(TITLE));

  // Insert product row
  const { data: inserted, error: insErr } = await supabase
    .from("products")
    .insert({
      slug,
      title: TITLE,
      subtitle: DESCRIPTION.slice(0, 160),
      description: DESCRIPTION,
      category,
      year: YEAR,
      material_type: "Shower Panel",
      color: null,
      brand_profile_id: null,
      cover_image_url: null,
      team_members: [],
    })
    .select("id,slug")
    .single();

  if (insErr || !inserted) throw new Error(`product insert failed: ${insErr?.message ?? "no row returned"}`);

  const productId = inserted.id;
  const insertedSlug = inserted.slug ?? slug ?? productId;

  // Add 3 placeholder images
  const imgBase = "https://placehold.co/1200x900/png";
  const images = [
    { src: `${imgBase}?text=Frameless+Shower+Panel+01`, alt: "Frameless glass shower panel – view 1", sort_order: 0 },
    { src: `${imgBase}?text=Stainless+Steel+Brackets+02`, alt: "Stainless steel bracket detail – view 2", sort_order: 1 },
    { src: `${imgBase}?text=Tempered+Glass+Panel+03`, alt: "Tempered glass panel – view 3", sort_order: 2 },
  ];
  const { error: imgErr } = await supabase.from("product_images").insert(
    images.map((i) => ({ product_id: productId, ...i }))
  );
  if (imgErr) throw new Error(`product_images insert failed: ${imgErr.message}`);

  // Link materials (replace any existing)
  await supabase.from("product_material_links").delete().eq("product_id", productId);
  const { error: linkErr } = await supabase.from("product_material_links").insert(
    materialIds.map((material_id) => ({ product_id: productId, material_id }))
  );
  if (linkErr) throw new Error(`product_material_links insert failed: ${linkErr.message}`);

  // Set cover image from first gallery image
  const { error: coverErr } = await supabase
    .from("products")
    .update({ cover_image_url: images[0].src })
    .eq("id", productId);
  if (coverErr) throw new Error(`cover update failed: ${coverErr.message}`);

  console.log("Created sample product:");
  console.log(`- id: ${productId}`);
  console.log(`- slug: ${insertedSlug}`);
  console.log(`- detail: /products/${insertedSlug}`);
  console.log(`- materials: ${REQUIRED_MATERIAL_NAMES.join(", ")}`);
  console.log(`- category: ${category}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

