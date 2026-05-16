import type { UserFoodConstraints } from "./foodConstraints";
import { isDishAllowedForUser } from "./foodConstraints";
import type { MealSlot } from "./catalogMeta";
import type { CatalogDish } from "./catalogTypes";
import {
  FALLBACK_BREAKFAST,
  FALLBACK_DINNER,
  FALLBACK_LUNCH,
  FALLBACK_SNACK,
} from "./fallbackCatalog";

const MIN_POOL_SIZE = 4;

/** Фильтрация каталога по ограничениям анкеты. */
export function filterCatalogForConstraints(
  catalog: CatalogDish[],
  constraints: UserFoodConstraints,
  slot: MealSlot,
): CatalogDish[] {
  return catalog.filter((item) => isDishAllowedForUser(item, slot, constraints));
}

function mergeUnique(...pools: CatalogDish[][]): CatalogDish[] {
  const seen = new Set<string>();
  const out: CatalogDish[] = [];
  for (const pool of pools) {
    for (const item of pool) {
      if (seen.has(item.diversityKey)) continue;
      seen.add(item.diversityKey);
      out.push(item);
    }
  }
  return out;
}

/** Если после фильтра мало вариантов — добавить безопасные универсальные блюда. */
export function ensureCatalogPoolSize(
  filtered: CatalogDish[],
  constraints: UserFoodConstraints,
  slot: MealSlot,
): CatalogDish[] {
  if (filtered.length >= MIN_POOL_SIZE) {
    return filtered;
  }

  const fallbacks =
    slot === "breakfast"
      ? FALLBACK_BREAKFAST
      : slot === "lunch"
        ? FALLBACK_LUNCH
        : slot === "dinner"
          ? FALLBACK_DINNER
          : FALLBACK_SNACK;

  const safeFallbacks = filterCatalogForConstraints(
    fallbacks,
    constraints,
    slot,
  );

  return mergeUnique(filtered, safeFallbacks);
}
