/**
 * Minimal tests for parse and serialize. Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/explore/filters/parse.test.ts
 * Or with Node 18+: node --experimental-vm-modules node_modules/ts-node/dist/bin.js src/lib/explore/filters/parse.test.ts
 */

import { parseExploreFilters } from "./parse";
import { filtersToQueryString, countActiveFilters } from "./query";
import { DEFAULT_EXPLORE_FILTERS } from "./schema";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Parse: empty params -> defaults
const empty = parseExploreFilters({}, "projects");
assert(empty.category.length === 0, "empty category");
assert(empty.sort === "newest", "default sort");
assert(empty.year === null, "empty year");

// Parse: category comma-separated
const withCategory = parseExploreFilters({ category: "Residential,Commercial" }, "projects");
assert(withCategory.category.includes("Residential"), "category Residential");
assert(withCategory.category.includes("Commercial"), "category Commercial");

// Parse: invalid year -> null
const badYear = parseExploreFilters({ year: "abc" }, "projects");
assert(badYear.year === null, "invalid year becomes null");

// Parse: valid year
const goodYear = parseExploreFilters({ year: "2023" }, "projects");
assert(goodYear.year === 2023, "valid year");

// Serialize: filters to query string
const qs = filtersToQueryString(
  { ...DEFAULT_EXPLORE_FILTERS, category: ["A", "B"], year: 2022 },
  "projects"
);
assert(qs.get("category") === "A,B", "category serialized");
assert(qs.get("year") === "2022", "year serialized");

// Count active filters
const n = countActiveFilters(
  { ...DEFAULT_EXPLORE_FILTERS, category: ["A"], materials: ["m1", "m2"] },
  "projects"
);
assert(n >= 3, "count active (category + 2 materials)");

console.log("parse/serialize tests passed");
export {};
