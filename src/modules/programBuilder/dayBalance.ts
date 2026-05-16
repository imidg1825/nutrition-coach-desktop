import type { EnrichedDish, MealSlot, ProteinType } from "./catalogMeta";
import {
  dishHasEggItem,
  enrichDish,
  isDairyMainMeal,
  isDairySnackItem,
} from "./catalogMeta";
import type { CatalogDish } from "./catalogTypes";

export type SnackProfileKey =
  | "dairy_snack"
  | "hummus_vegetable"
  | "fruit_nuts"
  | "egg_snack"
  | "crispbread_toast"
  | "avocado_guacamole"
  | "other_snack";

export const MAX_SNACK_PROFILE_PER_7_DAYS = 2;

export const MAX_EGG_MEALS_PER_DAY = 1;
export const MAX_DAIRY_MAIN_PER_DAY = 1;
/** Бобовые основные приёмы за 14 дней (обед/ужин/завтрак с фасолью и т.п.). */
export const MAX_LEGUMES_PER_14_DAYS = 3;

/** Хлеб/тост/хлебцы — для лимита «не дважды в день». */
export function isBreadBasedMeal(item: EnrichedDish): boolean {
  const d = item.dish.toLowerCase();
  return (
    item.mealFamily === "toast" ||
    item.carbType === "bread" ||
    d.includes("хлебц") ||
    d.includes("тост") ||
    d.includes("сэндвич") ||
    d.includes("сандвич")
  );
}

/** Состояние уже выбранных приёмов внутри одного дня. */
export type DayMealState = {
  dairyMainCount: number;
  dairyBreakfast: boolean;
  eggCount: number;
  hasFish: boolean;
  hasLegumes: boolean;
  hasBreadBreakfast: boolean;
  lunchProteinType: ProteinType | null;
  proteinTypesUsed: ProteinType[];
  mealFamiliesUsed: string[];
  snackProfilesUsed: SnackProfileKey[];
};

export function createDayMealState(): DayMealState {
  return {
    dairyMainCount: 0,
    dairyBreakfast: false,
    eggCount: 0,
    hasFish: false,
    hasLegumes: false,
    hasBreadBreakfast: false,
    lunchProteinType: null,
    proteinTypesUsed: [],
    mealFamiliesUsed: [],
    snackProfilesUsed: [],
  };
}

/** Профиль перекуса для ротации (не только mealFamily «snack»). */
export function getSnackProfileKey(
  item: CatalogDish,
  slot: MealSlot = "snack",
): SnackProfileKey {
  const enriched = enrichDish(item, slot);
  const d = item.dish.toLowerCase();

  if (d.includes("гуакамоле")) {
    return "avocado_guacamole";
  }
  if (d.includes("хумус")) {
    return "hummus_vegetable";
  }
  if (isBreadBasedMeal(enriched) || d.includes("хлебц") || d.includes("тост")) {
    return "crispbread_toast";
  }
  if (enriched.proteinType === "egg" || d.includes("яйц")) {
    return "egg_snack";
  }
  if (
    enriched.proteinType === "dairy" ||
    d.includes("творог") ||
    d.includes("йогурт") ||
    d.includes("кефир") ||
    d.includes("ряженк") ||
    (d.includes("сыр") && !d.includes("сырник"))
  ) {
    return "dairy_snack";
  }
  if (
    d.includes("орех") ||
    d.includes("арахис") ||
    d.includes("семеч") ||
    enriched.contains?.includes("nuts")
  ) {
    return "fruit_nuts";
  }
  if (
    d.includes("фрукт") ||
    d.includes("яблок") ||
    d.includes("банан") ||
    d.includes("груш") ||
    d.includes("ягод") ||
    d.includes("слив")
  ) {
    return "fruit_nuts";
  }
  if (d.includes("авокадо")) {
    return "avocado_guacamole";
  }
  return "other_snack";
}

export function countSnackProfileInWindow(
  profileByKey: Map<string, SnackProfileKey>,
  slotHistory: { dayIndex: number; diversityKey: string }[],
  dayIndex: number,
  profile: SnackProfileKey,
  windowDays: number,
): number {
  return slotHistory.filter((h) => {
    if (dayIndex <= h.dayIndex || dayIndex - h.dayIndex > windowDays) {
      return false;
    }
    return profileByKey.get(h.diversityKey) === profile;
  }).length;
}

function registerPick(state: DayMealState, item: EnrichedDish, slot: MealSlot): void {
  state.proteinTypesUsed.push(item.proteinType);
  state.mealFamiliesUsed.push(item.mealFamily);

  if (dishHasEggItem(item)) {
    state.eggCount += 1;
  }

  if (item.proteinType === "fish") {
    state.hasFish = true;
  }
  if (item.proteinType === "legumes") {
    state.hasLegumes = true;
  }

  if (slot === "breakfast" && isBreadBasedMeal(item)) {
    state.hasBreadBreakfast = true;
  }

  if (slot === "lunch") {
    state.lunchProteinType = item.proteinType;
  }

  if (isDairyMainMeal(item, slot)) {
    state.dairyMainCount += 1;
    if (slot === "breakfast") {
      state.dairyBreakfast = true;
    }
  }

  if (slot === "snack") {
    state.snackProfilesUsed.push(getSnackProfileKey(item, slot));
  }
}

/** Можно ли добавить блюдо в текущий день. */
export function canAddToDay(
  state: DayMealState,
  item: EnrichedDish,
  slot: MealSlot,
): boolean {
  if (dishHasEggItem(item) && state.eggCount >= MAX_EGG_MEALS_PER_DAY) {
    return false;
  }

  if (isDairyMainMeal(item, slot)) {
    if (state.dairyMainCount >= MAX_DAIRY_MAIN_PER_DAY) {
      return false;
    }
    if (slot === "snack" && state.dairyBreakfast) {
      return false;
    }
  }

  if (slot === "snack" && state.dairyBreakfast && isDairySnackItem(item)) {
    return false;
  }

  if (item.proteinType === "fish") {
    if (state.hasFish && (slot === "dinner" || slot === "lunch")) {
      return false;
    }
  }

  if (item.proteinType === "legumes") {
    if (state.hasLegumes && (slot === "dinner" || slot === "lunch")) {
      return false;
    }
  }

  if (slot === "dinner") {
    if (state.lunchProteinType === "chicken" && item.proteinType === "chicken") {
      return false;
    }
    if (state.lunchProteinType === "turkey" && item.proteinType === "turkey") {
      return false;
    }
    if (state.lunchProteinType === "fish" && item.proteinType === "fish") {
      return false;
    }
    if (state.lunchProteinType === "legumes" && item.proteinType === "legumes") {
      return false;
    }
  }

  if (slot === "lunch" && state.hasFish && item.proteinType === "fish") {
    return false;
  }
  if (slot === "lunch" && state.hasLegumes && item.proteinType === "legumes") {
    return false;
  }

  if (slot === "snack" && state.hasBreadBreakfast && isBreadBasedMeal(item)) {
    return false;
  }

  if (slot === "snack") {
    const profile = getSnackProfileKey(item, slot);
    if (state.snackProfilesUsed.includes(profile)) {
      return false;
    }
  }

  return true;
}

export function applyPickToDay(
  state: DayMealState,
  item: EnrichedDish,
  slot: MealSlot,
): void {
  registerPick(state, item, slot);
}

/** Дней с молочным основным приёмом за последние 7 дней (для разреживания). */
export function countDairyDaysInWindow(
  dairyDayFlags: boolean[],
  dayIndex: number,
  windowDays: number,
): number {
  let count = 0;
  for (let d = Math.max(0, dayIndex - windowDays); d < dayIndex; d++) {
    if (dairyDayFlags[d]) count += 1;
  }
  return count;
}

export function shouldThrottleDairy(
  dairyDayFlags: boolean[],
  dayIndex: number,
): boolean {
  return countDairyDaysInWindow(dairyDayFlags, dayIndex, 7) >= 4;
}

/** Сколько раз семейство блюда встречалось в этом слоте за последние N дней. */
export function countMealFamilyInSlotWindow(
  mealFamiliesByKey: Map<string, string>,
  slotHistory: { dayIndex: number; diversityKey: string }[],
  dayIndex: number,
  mealFamily: string,
  windowDays: number,
): number {
  return slotHistory.filter((h) => {
    if (dayIndex <= h.dayIndex || dayIndex - h.dayIndex > windowDays) {
      return false;
    }
    return mealFamiliesByKey.get(h.diversityKey) === mealFamily;
  }).length;
}

export type CatalogDishWithSlot = CatalogDish;
