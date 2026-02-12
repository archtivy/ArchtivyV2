"use server";

import {
  getProjectsCanonicalFiltered,
  getProductsCanonicalFiltered,
  EXPLORE_PAGE_SIZE,
} from "@/lib/db/explore";
import type { ProjectFilters, ProductFilters } from "@/lib/exploreFilters";
import type { ProjectSortOption, ProductSortOption } from "@/lib/exploreFilters";

export async function fetchProjectsPage({
  filters,
  offset = 0,
  sort = "newest",
}: {
  filters: ProjectFilters;
  offset?: number;
  sort?: ProjectSortOption;
}) {
  const { data, total } = await getProjectsCanonicalFiltered({
    filters,
    limit: EXPLORE_PAGE_SIZE,
    offset,
    sort,
  });
  return { data, total };
}

export async function fetchProductsPage({
  filters,
  offset = 0,
  sort = "newest",
}: {
  filters: ProductFilters;
  offset?: number;
  sort?: ProductSortOption;
}) {
  const { data, total } = await getProductsCanonicalFiltered({
    filters,
    limit: EXPLORE_PAGE_SIZE,
    offset,
    sort,
  });
  return { data, total };
}
