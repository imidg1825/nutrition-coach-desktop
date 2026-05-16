import type { CatalogDish } from "./catalogTypes";
import type {
  CarbType,
  ContainsTag,
  MealFamily,
  MealSlot,
  ProteinType,
} from "./catalogTypes";
import {
  RIVER_FISH_MARKERS,
  SEA_FISH_MARKERS,
  SEAFOOD_MARKERS,
} from "./catalogTypes";

export type {
  MealSlot,
  ProteinType,
  CarbType,
  MealFamily,
  ContainsTag,
} from "./catalogTypes";

export type EnrichedDish = CatalogDish & {
  proteinType: ProteinType;
  carbType: CarbType;
  mealFamily: MealFamily;
  contains: ContainsTag[];
};

function dishLower(dish: string): string {
  return dish.toLowerCase();
}

export function inferProteinType(item: CatalogDish): ProteinType {
  if (item.proteinType) return item.proteinType;

  const d = dishLower(item.dish);
  if (item.protein === "молочное") return "dairy";
  if (
    item.protein === "бобовые" ||
    d.includes("фасол") ||
    d.includes("чечевиц") ||
    d.includes("нут") ||
    d.includes("хумус")
  ) {
    return "legumes";
  }
  if (
    item.protein === "рыба" ||
    d.includes("рыб") ||
    SEA_FISH_MARKERS.some((w) => d.includes(w)) ||
    RIVER_FISH_MARKERS.some((w) => d.includes(w)) ||
    SEAFOOD_MARKERS.some((w) => d.includes(w))
  ) {
    return "fish";
  }
  if (item.protein === "индейка" || d.includes("индейк")) return "turkey";
  if (item.protein === "говядина") return "beef";
  if (item.protein === "кролик") return "rabbit";
  if (
    item.protein === "яйцо" ||
    d.includes("яйц") ||
    d.includes("омлет")
  ) {
    return "egg";
  }
  if (
    item.protein === "курица" ||
    item.protein === "птица" ||
    d.includes("курин")
  ) {
    return "chicken";
  }
  return "mixed";
}

function inferAquaticContainsTags(d: string): ContainsTag[] {
  const tags: ContainsTag[] = [];
  const hasSeafood = SEAFOOD_MARKERS.some((w) => d.includes(w));
  if (hasSeafood) {
    tags.push("seafood");
  }
  const hasSea = SEA_FISH_MARKERS.some((w) => d.includes(w)) || (d.includes("морск") && d.includes("рыб"));
  const hasRiver =
    RIVER_FISH_MARKERS.some((w) => d.includes(w)) || (d.includes("речн") && d.includes("рыб"));
  if (hasSea) {
    tags.push("seaFish");
  }
  if (hasRiver) {
    tags.push("riverFish");
  }
  if (d.includes("рыб") || hasSea || hasRiver) {
    tags.push("fish");
  }
  return tags;
}

/** Согласовано по смыслу с foodConstraints.ts (textViolatesGluten), без импорта — цикл catalogMeta ↔ foodConstraints. */
function hasGlutenFreeLabelBefore(text: string, wordIndex: number): boolean {
  const before = text.slice(Math.max(0, wordIndex - 28), wordIndex);
  return before.includes("безглютен") || before.includes("без глютен");
}

const GLUTEN_MARKERS_ALWAYS_LOCAL = [
  "булгур",
  "пшеница",
  "пшеничн",
  "цельнозерн",
  "мука",
  "паста",
  "лапша",
  "макарон",
  "спагетти",
  "мант",
  "пельмен",
  "лаваш",
  "овсяноблин",
  "булка",
  "сухар",
  "сэндвич",
  "сандвич",
] as const;

const GLUTEN_MARKERS_UNLESS_LABELED_LOCAL = [
  "хлебц",
  "хлеб",
  "тост",
  "печень",
  "овсян",
  "блин",
] as const;

function textLikelyContainsGluten(dishText: string): boolean {
  const t = dishText.toLowerCase();
  for (const w of GLUTEN_MARKERS_ALWAYS_LOCAL) {
    if (t.includes(w)) {
      return true;
    }
  }
  for (const w of GLUTEN_MARKERS_UNLESS_LABELED_LOCAL) {
    let idx = 0;
    while ((idx = t.indexOf(w, idx)) >= 0) {
      if (!hasGlutenFreeLabelBefore(t, idx)) {
        return true;
      }
      idx += w.length;
    }
  }
  if (t.includes("сырник")) {
    return true;
  }
  return false;
}

export function inferContains(item: CatalogDish): ContainsTag[] {
  if (item.contains && item.contains.length > 0) return item.contains;

  const tags: ContainsTag[] = [];
  const d = dishLower(item.dish);
  const pt = inferProteinType(item);

  if (pt === "dairy" || d.includes("творог") || d.includes("йогурт") || d.includes("кефир")) {
    tags.push("dairy");
  }
  if (pt === "egg" || d.includes("яйц") || d.includes("омлет")) tags.push("egg");
  for (const tag of inferAquaticContainsTags(d)) {
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  if (pt === "legumes" || d.includes("фасол") || d.includes("чечевиц") || d.includes("хумус")) {
    tags.push("legumes");
  }
  if (
    pt === "chicken" ||
    pt === "turkey" ||
    pt === "beef" ||
    pt === "rabbit" ||
    d.includes("курин") ||
    d.includes("индейк") ||
    d.includes("говядин")
  ) {
    tags.push("meat");
  }
  if (d.includes("орех") || d.includes("арахис")) tags.push("nuts");
  if (textLikelyContainsGluten(d)) {
    tags.push("gluten");
  }

  return tags;
}

export function inferCarbType(item: CatalogDish): CarbType {
  if (item.carbType) return item.carbType;

  const d = dishLower(item.dish);
  if (d.includes("овсян") || d.includes("гранола")) return "oats";
  if (d.includes("греч")) return "buckwheat";
  if (d.includes("булгур")) return "bulgur";
  if (d.includes("рис") || d.includes("рисов")) return "rice";
  if (d.includes("паста") || d.includes("лапша") || d.includes("макарон")) {
    return "pasta";
  }
  if (d.includes("картофел") || d.includes("картош")) return "potato";
  if (d.includes("тост") || d.includes("хлеб") || d.includes("хлебц")) {
    return "bread";
  }
  if (d.includes("пшён") || d.includes("пшено")) return "none";
  if (d.includes("суп") || d.includes("борщ")) return "none";
  return "none";
}

export function inferMealFamily(item: CatalogDish, slot: MealSlot): MealFamily {
  if (item.mealFamily) return item.mealFamily;

  const d = dishLower(item.dish);
  if (slot === "snack") return "snack";

  if (d.includes("суп") || d.includes("борщ") || d.includes("уха")) return "soup";
  if (d.includes("боул") || d.includes("bowl")) return "bowl";
  if (d.includes("салат") && slot !== "breakfast") return "salad";
  if (d.includes("рагу") || d.includes("тушён") || d.includes("тушен")) {
    return "stew";
  }
  if (d.includes("омлет") || d.includes("яичниц") || d.includes("скрэмбл")) {
    return "omelet";
  }
  if (d.includes("сырник") || (d.includes("запеканк") && d.includes("творож"))) {
    return "baked";
  }
  if (d.includes("запеканк")) return "casserole";
  if (d.includes("тост") || d.includes("сэндвич")) return "toast";
  if (
    d.includes("йогурт") &&
    (d.includes("боул") || slot === "breakfast")
  ) {
    return "dairyBowl";
  }
  if (
    d.includes("творог") ||
    d.includes("йогурт") ||
    d.includes("кефир") ||
    d.includes("ряженк")
  ) {
    return slot === "breakfast" ? "dairyBowl" : "snack";
  }
  if (
    d.includes("каша") ||
    d.includes("овсян") ||
    d.includes("гречн") ||
    d.includes("рисовая каша") ||
    d.includes("манк")
  ) {
    return "porridge";
  }
  if (d.includes("ленив") && d.includes("овсян")) return "porridge";

  return slot === "breakfast" ? "porridge" : "stew";
}

export function enrichDish(item: CatalogDish, slot: MealSlot): EnrichedDish {
  const proteinType = inferProteinType(item);
  const contains = inferContains(item);
  return {
    ...item,
    proteinType,
    carbType: inferCarbType(item),
    mealFamily: inferMealFamily(item, slot),
    contains,
  };
}

export function isDairySnackItem(item: EnrichedDish): boolean {
  const d = dishLower(item.dish);
  return (
    item.proteinType === "dairy" &&
    (d.includes("йогурт") ||
      d.includes("творог") ||
      d.includes("кефир") ||
      d.includes("ряженк") ||
      d.includes("банан и кефир"))
  );
}

export function isDairyMainMeal(item: EnrichedDish, slot: MealSlot): boolean {
  if (item.proteinType !== "dairy") return false;
  if (slot === "snack") return isDairySnackItem(item);
  const d = dishLower(item.dish);
  if (d.includes("омлет") && d.includes("сыр")) return false;
  return true;
}

export function dishHasEggItem(item: CatalogDish): boolean {
  if (item.containsEgg) return true;
  if (item.contains?.includes("egg")) return true;
  const d = dishLower(item.dish);
  return d.includes("яйц") || d.includes("омлет");
}

export function isFishDish(item: CatalogDish): boolean {
  if (item.dishSubtype === "fishMain") return true;
  const enriched = enrichDish(item, "lunch");
  return enriched.proteinType === "fish";
}

export function isSyrnikiDish(item: CatalogDish): boolean {
  return (
    item.dishSubtype === "syrniki" ||
    item.diversityKey.includes("сырник") ||
    item.dish.toLowerCase().includes("сырник")
  );
}

export function isTvorogBakeDish(item: CatalogDish): boolean {
  return (
    item.dishSubtype === "tvorogBake" ||
    (item.dish.toLowerCase().includes("творожн") &&
      item.dish.toLowerCase().includes("запеканк"))
  );
}
