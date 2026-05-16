import type { BreakfastType, CatalogDish, ProteinType } from "./catalogTypes";
import {
  enrichDish,
  isFishDish,
  isSyrnikiDish,
  isTvorogBakeDish,
  type MealSlot,
} from "./catalogMeta";
import {
  applyPickToDay,
  canAddToDay,
  countMealFamilyInSlotWindow,
  countSnackProfileInWindow,
  createDayMealState,
  getSnackProfileKey,
  MAX_DAIRY_MAIN_PER_DAY,
  MAX_EGG_MEALS_PER_DAY,
  MAX_LEGUMES_PER_14_DAYS,
  MAX_SNACK_PROFILE_PER_7_DAYS,
  shouldThrottleDairy,
  type DayMealState,
  type SnackProfileKey,
} from "./dayBalance";
import type { UserFoodConstraints } from "./foodConstraints";
import {
  getProgramHummusUses,
  isDishAllowedForUser,
  isHummusProgramLimitReached,
  isHummusText,
  MAX_HUMMUS_PER_PROGRAM,
  registerHummusUse,
  resetProgramHummusUses,
} from "./foodConstraints";
import {
  getProgramRabbitUses,
  isRabbitProgramLimitReached,
  isRabbitText,
  MAX_RABBIT_PER_PROGRAM,
  registerRabbitUse,
  resetProgramRabbitUses,
} from "./smartReplacement";
import type { ProteinKey } from "./mealProtein";
import {
  BREAKFAST_CATALOG,
  DINNER_CATALOG,
  LUNCH_CATALOG,
  SNACK_CATALOG,
} from "./menuCatalogData";

export type { CatalogDish, BreakfastType } from "./catalogTypes";
export {
  BREAKFAST_CATALOG,
  LUNCH_CATALOG,
  DINNER_CATALOG,
  SNACK_CATALOG,
} from "./menuCatalogData";

export const MAX_SAME_DISH_PER_14_DAYS = 2;
/** Не чаще двух раз за всю собранную программу (30+ дней). */
export const MAX_SAME_DISH_TOTAL = 2;
export const MAX_BREAKFAST_TYPE_PER_14_DAYS = 3;
export const MAX_FISH_PER_14_DAYS = 3;
export const MAX_DAIRY_MAIN_DAYS_PER_14 = 6;
export const MAX_SYRNIKI_PER_14 = 1;
export const MAX_TVOROG_BAKE_PER_14 = 1;
export const MAX_SNACK_REPEAT_PER_14 = 2;
function isLegumesPick(item: CatalogDish, slot: MealSlot): boolean {
  return enrichDish(item, slot).proteinType === "legumes";
}

function countLegumesInHistory(
  global: PickHistory[],
  dayIndex: number,
  slot: MealSlot,
): number {
  const catalogs = [
    ...BREAKFAST_CATALOG,
    ...LUNCH_CATALOG,
    ...DINNER_CATALOG,
    ...SNACK_CATALOG,
  ];
  return countInLast14Days(global, dayIndex, (h) => {
    const fromCatalog = catalogs.find((c) => c.diversityKey === h.diversityKey);
    if (fromCatalog) return isLegumesPick(fromCatalog, slot);
    return h.protein === "бобовые";
  });
}

export type PickHistory = {
  dayIndex: number;
  diversityKey: string;
  protein: ProteinKey;
  breakfastType?: BreakfastType;
  proteinType?: ProteinType;
  dishSubtype?: CatalogDish["dishSubtype"];
};

function countInLast14Days(
  history: PickHistory[],
  dayIndex: number,
  predicate: (h: PickHistory) => boolean,
): number {
  return history.filter(
    (h) => dayIndex - h.dayIndex < 14 && predicate(h),
  ).length;
}

function rotatePool<T>(pool: T[], startOffset: number): T[] {
  if (pool.length === 0) return pool;
  const o = startOffset % pool.length;
  return [...pool.slice(o), ...pool.slice(0, o)];
}

const SLOT_SEED: Record<MealSlot, number> = {
  breakfast: 11,
  lunch: 23,
  dinner: 37,
  snack: 53,
};

function stableHash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function countTotalUses(history: PickHistory[], diversityKey: string): number {
  return history.filter((h) => h.diversityKey === diversityKey).length;
}

function daysSinceLastUseInSlot(
  slotHistory: PickHistory[],
  dayIndex: number,
  diversityKey: string,
): number {
  let lastDay = -1;
  for (const h of slotHistory) {
    if (h.diversityKey === diversityKey) {
      lastDay = h.dayIndex;
    }
  }
  return lastDay < 0 ? 999 : dayIndex - lastDay;
}

function buildMealFamilyMap(pool: CatalogDish[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of pool) {
    map.set(item.diversityKey, item.mealFamily);
  }
  return map;
}

function buildSnackProfileMap(pool: CatalogDish[]): Map<string, SnackProfileKey> {
  const map = new Map<string, SnackProfileKey>();
  for (const item of pool) {
    map.set(item.diversityKey, getSnackProfileKey(item, "snack"));
  }
  return map;
}

const ALL_CATALOG_DISHES: CatalogDish[] = [
  ...BREAKFAST_CATALOG,
  ...LUNCH_CATALOG,
  ...DINNER_CATALOG,
  ...SNACK_CATALOG,
];

const CATALOG_BY_KEY = new Map(
  ALL_CATALOG_DISHES.map((d) => [d.diversityKey, d] as const),
);

/** Ключ вида рыбы/морепродукта для ротации (не аллергенный флаг). */
const AQUATIC_SPECIES_RULES: readonly { marker: string; key: string }[] = [
  { marker: "кефаль", key: "kefael" },
  { marker: "креветк", key: "shrimp" },
  { marker: "мидии", key: "mussels" },
  { marker: "кальмар", key: "squid" },
  { marker: "горбуш", key: "pink_salmon" },
  { marker: "скумбри", key: "mackerel" },
  { marker: "лосос", key: "salmon" },
  { marker: "семг", key: "salmon" },
  { marker: "форел", key: "trout" },
  { marker: "треск", key: "cod" },
  { marker: "минтай", key: "pollock" },
  { marker: "хек", key: "hake" },
  { marker: "тунец", key: "tuna" },
  { marker: "судак", key: "sudak" },
  { marker: "щук", key: "pike" },
  { marker: "окунь", key: "perch" },
  { marker: "карп", key: "carp" },
  { marker: "карась", key: "crucian" },
  { marker: "лещ", key: "bream" },
  { marker: "сом", key: "catfish" },
];

function dishNamesAquaticSpecies(dish: string): string | null {
  const d = dish.toLowerCase();
  for (const { marker, key } of AQUATIC_SPECIES_RULES) {
    if (marker === "сом") {
      if (/(^|\s)сом[\s,]/.test(d) || d.startsWith("сом ")) {
        return key;
      }
      continue;
    }
    if (d.includes(marker)) {
      return key;
    }
  }
  return null;
}

function aquaticSpeciesFromHistoryEntry(h: PickHistory): string | null {
  const fromCatalog = CATALOG_BY_KEY.get(h.diversityKey);
  if (fromCatalog) {
    return dishNamesAquaticSpecies(fromCatalog.dish);
  }
  return null;
}

function aquaticSpeciesScoreAdjustment(
  candidate: CatalogDish,
  global: PickHistory[],
  dayIndex: number,
): number {
  if (!isFishDish(candidate)) {
    return 0;
  }

  const species = dishNamesAquaticSpecies(candidate.dish);
  if (!species) {
    return 0;
  }

  let adjustment = 0;
  const programUses = global.filter(
    (h) => aquaticSpeciesFromHistoryEntry(h) === species,
  ).length;
  const usesIn14 = global.filter(
    (h) =>
      dayIndex - h.dayIndex < 14 &&
      aquaticSpeciesFromHistoryEntry(h) === species,
  ).length;

  if (programUses === 0) {
    adjustment -= 6;
  }
  if (usesIn14 >= 1) {
    adjustment += 14;
  }
  if (species === "sudak" && programUses >= 1) {
    adjustment += 10;
  }

  return adjustment;
}

function scoreCandidate(
  candidate: CatalogDish,
  opts: PickOptions,
  mealFamilyMap: Map<string, string>,
  snackProfileMap?: Map<string, SnackProfileKey>,
): number {
  const global = opts.allHistories ?? opts.history;
  const totalUses = countTotalUses(global, candidate.diversityKey);
  const slotUses = countTotalUses(opts.history, candidate.diversityKey);
  const daysSince = daysSinceLastUseInSlot(
    opts.history,
    opts.dayIndex,
    candidate.diversityKey,
  );

  let score = totalUses * 120 + slotUses * 60;

  if (daysSince < 7) score += 90;
  if (daysSince < 4) score += 120;
  if (daysSince < 2) score += 200;

  const familyRepeats = countMealFamilyInSlotWindow(
    mealFamilyMap,
    opts.history,
    opts.dayIndex,
    candidate.mealFamily,
    3,
  );
  if (familyRepeats >= 1) score += 70;
  if (familyRepeats >= 2) score += 120;

  if (isHummusText(candidate.dish)) {
    const hummusUses = getProgramHummusUses();
    if (hummusUses >= 1) score += 120;
    if (hummusUses >= MAX_HUMMUS_PER_PROGRAM) {
      score += 500;
    }
  }

  if (isRabbitText(candidate.dish)) {
    const rabbitUses = getProgramRabbitUses();
    if (rabbitUses >= 1) score += 130;
    if (rabbitUses >= MAX_RABBIT_PER_PROGRAM) {
      score += 500;
    }
  }

  if (opts.slot === "snack" && snackProfileMap) {
    const profile = getSnackProfileKey(candidate, "snack");
    const profileRepeats7 = countSnackProfileInWindow(
      snackProfileMap,
      opts.history,
      opts.dayIndex,
      profile,
      7,
    );
    if (profileRepeats7 >= 1) score += 85;
    if (profileRepeats7 >= MAX_SNACK_PROFILE_PER_7_DAYS) {
      score += 200;
    }
    const profileUsesTotal = opts.history.filter(
      (h) => snackProfileMap.get(h.diversityKey) === profile,
    ).length;
    if (profileUsesTotal >= 1) score += 40;
    const preferredProfile =
      (["dairy_snack", "hummus_vegetable", "fruit_nuts", "egg_snack", "crispbread_toast", "avocado_guacamole"] as const)[
        opts.dayIndex % 6
      ];
    if (profile !== preferredProfile) {
      score += 12;
    }
  }

  if (
    opts.lastProtein != null &&
    candidate.protein === opts.lastProtein &&
    candidate.protein !== "смешанное" &&
    candidate.protein !== "молочное" &&
    candidate.protein !== "бобовые"
  ) {
    score += 45;
  }

  const zone = stableHash(candidate.diversityKey) % 4;
  const preferredZone = opts.dayIndex % 4;
  if (zone !== preferredZone) {
    score += 8;
  }

  score += aquaticSpeciesScoreAdjustment(
    candidate,
    global,
    opts.dayIndex,
  );

  return score;
}

function dishHasEgg(item: CatalogDish): boolean {
  if (item.containsEgg) return true;
  if (item.contains?.includes("egg")) return true;
  const d = item.dish.toLowerCase();
  return d.includes("яйц") || d.includes("омлет");
}

function mergeHistories(histories: PickHistory[][]): PickHistory[] {
  return histories.flat();
}

type PickOptions = {
  dayIndex: number;
  pool: CatalogDish[];
  history: PickHistory[];
  allHistories?: PickHistory[];
  lastProtein: ProteinKey | null;
  slot: MealSlot;
  dayState: DayMealState;
  constraints?: UserFoodConstraints;
  excludeProteins?: ProteinKey[];
  excludeProteinTypes?: ProteinType[];
  excludeEgg?: boolean;
  excludeDairy?: boolean;
  excludeStarchKey?: string | null;
};

function canPickCandidate(
  candidate: CatalogDish,
  opts: PickOptions,
): boolean {
  const {
    dayIndex,
    excludeProteins,
    excludeProteinTypes,
    excludeEgg,
    excludeDairy,
    excludeStarchKey,
    slot,
    dayState,
    history,
    allHistories,
    constraints,
  } = opts;

  if (constraints && !isDishAllowedForUser(candidate, slot, constraints)) {
    return false;
  }

  const enriched = enrichDish(candidate, slot);
  if (!canAddToDay(dayState, enriched, slot)) {
    return false;
  }

  if (
    excludeStarchKey &&
    candidate.starchKey &&
    candidate.starchKey === excludeStarchKey
  ) {
    return false;
  }

  if (excludeProteinTypes?.includes(enriched.proteinType)) {
    return false;
  }

  if (
    countInLast14Days(
      history,
      dayIndex,
      (h) => h.diversityKey === candidate.diversityKey,
    ) >= MAX_SAME_DISH_PER_14_DAYS
  ) {
    return false;
  }

  if (slot === "snack") {
    const snackCount = countInLast14Days(
      history,
      dayIndex,
      (h) => h.diversityKey === candidate.diversityKey,
    );
    if (snackCount >= MAX_SNACK_REPEAT_PER_14) {
      return false;
    }
  }

  if (candidate.breakfastType) {
    const typeCount = countInLast14Days(
      history,
      dayIndex,
      (h) => h.breakfastType === candidate.breakfastType,
    );
    if (typeCount >= MAX_BREAKFAST_TYPE_PER_14_DAYS) {
      return false;
    }
  }

  const global = allHistories ?? history;

  if (countTotalUses(global, candidate.diversityKey) >= MAX_SAME_DISH_TOTAL) {
    return false;
  }

  if (isFishDish(candidate)) {
    const fishCount = countInLast14Days(global, dayIndex, (h) => {
      const fromCatalog = [
        ...BREAKFAST_CATALOG,
        ...LUNCH_CATALOG,
        ...DINNER_CATALOG,
        ...SNACK_CATALOG,
      ].find((c) => c.diversityKey === h.diversityKey);
      return fromCatalog ? isFishDish(fromCatalog) : h.protein === "рыба";
    });
    if (fishCount >= MAX_FISH_PER_14_DAYS) {
      return false;
    }
  }

  if (isSyrnikiDish(candidate)) {
    const n = countInLast14Days(global, dayIndex, (h) =>
      h.diversityKey.includes("сырник"),
    );
    if (n >= MAX_SYRNIKI_PER_14) return false;
  }

  if (isTvorogBakeDish(candidate)) {
    const n = countInLast14Days(global, dayIndex, (h) =>
      h.diversityKey.includes("запеканка") && h.diversityKey.includes("твор"),
    );
    if (n >= MAX_TVOROG_BAKE_PER_14) return false;
  }

  if (isLegumesPick(candidate, slot)) {
    if (countLegumesInHistory(global, dayIndex, slot) >= MAX_LEGUMES_PER_14_DAYS) {
      return false;
    }
  }

  if (excludeProteins?.includes(candidate.protein)) {
    return false;
  }

  if (excludeEgg && dishHasEgg(candidate)) {
    return false;
  }

  if (excludeDairy && enriched.proteinType === "dairy") {
    return false;
  }

  if (isHummusText(candidate.dish) && isHummusProgramLimitReached()) {
    return false;
  }

  if (isRabbitText(candidate.dish) && isRabbitProgramLimitReached()) {
    return false;
  }

  return true;
}

function pickFromScoredTier(
  tier: CatalogDish[],
  opts: PickOptions,
): CatalogDish {
  const sorted = [...tier].sort(
    (a, b) =>
      stableHash(opts.dayIndex, opts.slot, a.diversityKey) -
      stableHash(opts.dayIndex, opts.slot, b.diversityKey),
  );
  const idx =
    stableHash(opts.dayIndex, opts.slot, opts.history.length, SLOT_SEED[opts.slot]) %
    sorted.length;
  return sorted[idx];
}

export function pickCatalogDish(opts: PickOptions): CatalogDish {
  const { dayIndex, pool, history, slot } = opts;

  if (pool.length === 0) {
    throw new Error("pickCatalogDish: empty pool");
  }

  const mealFamilyMap = buildMealFamilyMap(pool);
  const snackProfileMap =
    slot === "snack" ? buildSnackProfileMap(pool) : undefined;
  const startOffset =
    stableHash(dayIndex, slot, SLOT_SEED[slot], pool.length) % pool.length;
  const rotated = rotatePool(pool, startOffset);

  let eligible = rotated.filter((c) => canPickCandidate(c, opts));

  if (eligible.length === 0) {
    eligible = rotated.filter((c) => {
      if (opts.constraints && !isDishAllowedForUser(c, slot, opts.constraints)) {
        return false;
      }
      return canAddToDay(opts.dayState, enrichDish(c, slot), slot);
    });
  }

  if (eligible.length === 0) {
    return rotated[stableHash(dayIndex, slot, "fallback") % rotated.length];
  }

  const scored = eligible.map((c) => ({
    candidate: c,
    score: scoreCandidate(c, opts, mealFamilyMap, snackProfileMap),
  }));
  const minScore = Math.min(...scored.map((s) => s.score));
  let tier = scored
    .filter((s) => s.score === minScore)
    .map((s) => s.candidate);

  const withoutRecent = tier.filter(
    (c) =>
      daysSinceLastUseInSlot(history, dayIndex, c.diversityKey) >= 4 ||
      countTotalUses(history, c.diversityKey) === 0,
  );
  if (withoutRecent.length > 0) {
    tier = withoutRecent;
  }

  const withoutSameProtein = tier.filter(
    (c) =>
      opts.lastProtein == null ||
      c.protein !== opts.lastProtein ||
      c.protein === "смешанное" ||
      c.protein === "молочное" ||
      c.protein === "бобовые",
  );
  if (withoutSameProtein.length > 0) {
    tier = withoutSameProtein;
  }

  return pickFromScoredTier(tier, opts);
}

export type DayMenuPicks = {
  breakfast: CatalogDish;
  lunch: CatalogDish;
  dinner: CatalogDish;
  snack?: CatalogDish;
  secondSnack?: CatalogDish;
};

export type DayMenuHistories = {
  breakfast: PickHistory[];
  lunch: PickHistory[];
  dinner: PickHistory[];
  snack: PickHistory[];
};

export function pickDayMenu(params: {
  dayIndex: number;
  breakfastPool: CatalogDish[];
  lunchPool: CatalogDish[];
  dinnerPool: CatalogDish[];
  snackPool: CatalogDish[];
  histories: DayMenuHistories;
  lastBreakfastProtein: ProteinKey | null;
  lastSnackProtein: ProteinKey | null;
  mealsPerDay: number;
  dairyYesterday: boolean;
  dairyDayFlags: boolean[];
  constraints: UserFoodConstraints;
}): {
  picks: DayMenuPicks;
  lastBreakfastProtein: ProteinKey;
  lastSnackProtein: ProteinKey | null;
  dairyToday: boolean;
} {
  const {
    dayIndex,
    breakfastPool,
    lunchPool,
    dinnerPool,
    snackPool,
    histories,
    mealsPerDay,
    dairyYesterday,
    dairyDayFlags,
    constraints,
  } = params;
  let lastBreakfastProtein = params.lastBreakfastProtein;
  let lastSnackProtein = params.lastSnackProtein;

  if (dayIndex === 0) {
    resetProgramHummusUses();
    resetProgramRabbitUses();
  }

  const dayState = createDayMealState();
  const throttleDairy =
    dairyYesterday || shouldThrottleDairy(dairyDayFlags, dayIndex);

  const dairyDaysIn14 = dairyDayFlags.filter(
    (_, d) => d < dayIndex && dayIndex - d < 14 && dairyDayFlags[d],
  ).length;
  const throttleDairy14 = dairyDaysIn14 >= MAX_DAIRY_MAIN_DAYS_PER_14;

  const allHistories = mergeHistories([
    histories.breakfast,
    histories.lunch,
    histories.dinner,
    histories.snack,
  ]);

  const lastLunchEntry = histories.lunch[histories.lunch.length - 1];
  const lastLunchStarch = lastLunchEntry
    ? lunchPool.find((c) => c.diversityKey === lastLunchEntry.diversityKey)
        ?.starchKey ?? null
    : null;

  const breakfast = pickCatalogDish({
    dayIndex,
    pool: breakfastPool,
    history: histories.breakfast,
    allHistories,
    lastProtein: lastBreakfastProtein,
    slot: "breakfast",
    dayState,
    constraints,
    excludeDairy: throttleDairy || throttleDairy14,
  });
  applyPickToDay(dayState, enrichDish(breakfast, "breakfast"), "breakfast");
  registerHummusUse(breakfast.dish);
  registerRabbitUse(breakfast.dish);
  lastBreakfastProtein = breakfast.protein;

  const lunch = pickCatalogDish({
    dayIndex,
    pool: lunchPool,
    history: histories.lunch,
    allHistories,
    lastProtein: lastLunchEntry?.protein ?? null,
    slot: "lunch",
    dayState,
    constraints,
    excludeStarchKey: lastLunchStarch,
  });
  applyPickToDay(dayState, enrichDish(lunch, "lunch"), "lunch");
  registerHummusUse(lunch.dish);
  registerRabbitUse(lunch.dish);

  const dinner = pickCatalogDish({
    dayIndex,
    pool: dinnerPool,
    history: histories.dinner,
    allHistories,
    lastProtein:
      histories.dinner.length > 0
        ? histories.dinner[histories.dinner.length - 1].protein
        : null,
    slot: "dinner",
    dayState,
    constraints,
    excludeProteinTypes:
      dayState.lunchProteinType === "chicken"
        ? ["chicken"]
        : dayState.lunchProteinType === "turkey"
          ? ["turkey"]
          : dayState.lunchProteinType === "fish"
            ? ["fish"]
            : dayState.lunchProteinType === "legumes"
              ? ["legumes"]
              : undefined,
    excludeProteins:
      dayState.lunchProteinType === "chicken"
        ? (["курица", "птица"] as ProteinKey[])
        : undefined,
  });
  applyPickToDay(dayState, enrichDish(dinner, "dinner"), "dinner");
  registerHummusUse(dinner.dish);
  registerRabbitUse(dinner.dish);

  const picks: DayMenuPicks = { breakfast, lunch, dinner };

  if (mealsPerDay > 3) {
    const snack = pickCatalogDish({
      dayIndex,
      pool: snackPool,
      history: histories.snack,
      allHistories,
      lastProtein: lastSnackProtein,
      slot: "snack",
      dayState,
      constraints,
      excludeEgg: dayState.eggCount >= MAX_EGG_MEALS_PER_DAY,
      excludeDairy:
        dayState.dairyMainCount >= MAX_DAIRY_MAIN_PER_DAY || throttleDairy14,
    });
    applyPickToDay(dayState, enrichDish(snack, "snack"), "snack");
    registerHummusUse(snack.dish);
    registerRabbitUse(snack.dish);
    picks.snack = snack;
    lastSnackProtein = snack.protein;
  }

  if (mealsPerDay > 4 && picks.snack) {
    const secondSnack = pickCatalogDish({
      dayIndex: dayIndex + 100,
      pool: snackPool,
      history: histories.snack,
      allHistories,
      lastProtein: lastSnackProtein,
      slot: "snack",
      dayState,
      constraints,
      excludeEgg: dayState.eggCount >= MAX_EGG_MEALS_PER_DAY,
      excludeDairy:
        dayState.dairyMainCount >= MAX_DAIRY_MAIN_PER_DAY || throttleDairy14,
    });
    applyPickToDay(dayState, enrichDish(secondSnack, "snack"), "snack");
    registerHummusUse(secondSnack.dish);
    registerRabbitUse(secondSnack.dish);
    picks.secondSnack = secondSnack;
    lastSnackProtein = secondSnack.protein;
  }

  const dairyToday = dayState.dairyMainCount > 0 || dayState.dairyBreakfast;

  return {
    picks,
    lastBreakfastProtein,
    lastSnackProtein,
    dairyToday,
  };
}

/** @deprecated Используйте filterCatalogForConstraints */
export function filterCatalogForLactose(
  catalog: CatalogDish[],
  hasLactoseIntolerance: boolean,
): CatalogDish[] {
  if (!hasLactoseIntolerance) return catalog;
  return catalog.filter((c) => c.proteinType !== "dairy" && c.protein !== "молочное");
}

/** @deprecated Используйте filterCatalogForConstraints */
export function filterCatalogForNuts(
  catalog: CatalogDish[],
  hasNutAllergy: boolean,
): CatalogDish[] {
  if (!hasNutAllergy) return catalog;
  return catalog.filter(
    (c) =>
      !c.diversityKey.includes("орех") &&
      !c.dish.toLowerCase().includes("арахис") &&
      !c.contains?.includes("nuts"),
  );
}
