import type { ProteinKey } from "./mealProtein";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type ProteinType =
  | "chicken"
  | "turkey"
  | "fish"
  | "egg"
  | "dairy"
  | "legumes"
  | "beef"
  | "rabbit"
  | "mixed"
  | "none";

export type CarbType =
  | "rice"
  | "buckwheat"
  | "bulgur"
  | "potato"
  | "pasta"
  | "oats"
  | "bread"
  | "none";

export type MealFamily =
  | "porridge"
  | "omelet"
  | "dairyBowl"
  | "soup"
  | "bowl"
  | "stew"
  | "salad"
  | "snack"
  | "baked"
  | "toast"
  | "casserole";

export type ContainsTag =
  | "dairy"
  | "gluten"
  | "egg"
  | "nuts"
  | "fish"
  | "seaFish"
  | "riverFish"
  | "seafood"
  | "meat"
  | "legumes";

export type AvoidIfTag =
  | "lactose"
  | "gluten"
  | "egg"
  | "nuts"
  | "fish"
  | "seaFish"
  | "riverFish"
  | "seafood"
  | "meat"
  | "legumes";

/** Морская рыба — при seaFish или общем fish. */
export const SEA_FISH_MARKERS = [
  "лосос",
  "треск",
  "семг",
  "минтай",
  "форел",
  "селед",
  "тунец",
  "хек",
  "скумбр",
  "сайр",
  "палтус",
  "морск",
  /** Кефаль — морская; склонения: кефаль, кефали, кефалью… */
  "кефал",
] as const;

/** Речная рыба — при riverFish или общем fish. */
export const RIVER_FISH_MARKERS = [
  "щук",
  "судак",
  "карп",
  "окун",
  "лещ",
  "сом",
  "налим",
  /** Карась — речной; склонения: карась, карася, карасём… */
  "карас",
] as const;

/** Морепродукты — отдельно от рыбы; при seafood. */
export const SEAFOOD_MARKERS = [
  "морепродукт",
  "кревет",
  "миди",
  "кальмар",
  "осьминог",
  "краб",
  "моллюск",
  "гребеш",
  "устриц",
  "омар",
  "каракатиц",
] as const;

export type BreakfastType =
  | "porridge"
  | "egg"
  | "dairy"
  | "toast"
  | "bowl"
  | "baked";

export type CatalogDish = {
  dish: string;
  diversityKey: string;
  /** Legacy-поле для совместимости. */
  protein: ProteinKey;
  proteinType: ProteinType;
  carbType: CarbType;
  mealFamily: MealFamily;
  contains: ContainsTag[];
  avoidIf?: AvoidIfTag[];
  breakfastType?: BreakfastType;
  starchKey?: string;
  containsEgg?: boolean;
  /** Подтип для лимитов (сырники, творожная запеканка). */
  dishSubtype?: "syrniki" | "tvorogBake" | "fishMain";
};
