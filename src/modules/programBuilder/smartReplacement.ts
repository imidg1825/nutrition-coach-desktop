import type { MealSlot } from "./catalogMeta";
import { enrichDish } from "./catalogMeta";
import type { CatalogDish } from "./catalogTypes";
import {
  HUMMUS_SEMANTIC_KEY,
  MAX_HUMMUS_PER_PROGRAM,
  isHummusProgramLimitReached,
  isHummusText,
  isDishAllowedForUser,
  mealTextAllowedForUser,
  textContainsAnyFish,
  textContainsEgg,
  textContainsRiverFish,
  textContainsSeaFish,
  textContainsSeafood,
  textViolatesFishConstraints,
  textViolatesGluten,
  type UserFoodConstraints,
} from "./foodConstraints";

const SLOT_SALT: Record<MealSlot, number> = {
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

function filterOptions(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  return options.filter((o) => mealTextAllowedForUser(o, constraints));
}

function isEggDish(text: string): boolean {
  return textContainsEgg(text);
}

function isFishDishText(text: string): boolean {
  return textContainsAnyFish(text);
}

function isSeafoodDishText(text: string): boolean {
  return textContainsSeafood(text);
}

function fishReplacementBlocked(text: string, constraints: UserFoodConstraints): boolean {
  return textViolatesFishConstraints(text, constraints);
}

function isChickenSalad(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("салат") && (t.includes("кур") || t.includes("куриц"));
}

function isPoultryDish(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("курин") || t.includes("куриц") || t.includes("индейк");
}

function isLegumesText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("фасол") ||
    t.includes("чечевиц") ||
    t.includes("нут") ||
    t.includes("бобов") ||
    t.includes("хумус")
  );
}

function isMeatText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    isPoultryDish(t) ||
    t.includes("говядин") ||
    t.includes("кролик") ||
    t.includes("телят")
  );
}

export const RABBIT_SEMANTIC_KEY = "rabbit_all";
export const MAX_RABBIT_PER_PROGRAM = 2;

let programRabbitUses = 0;

export function resetProgramRabbitUses(): void {
  programRabbitUses = 0;
}

export function getProgramRabbitUses(): number {
  return programRabbitUses;
}

export function isRabbitProgramLimitReached(): boolean {
  return programRabbitUses >= MAX_RABBIT_PER_PROGRAM;
}

export function isRabbitText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("кролик") ||
    t.includes("крольчат") ||
    t.includes("rabbit")
  );
}

export function registerRabbitUse(text: string): void {
  if (isRabbitText(text)) {
    programRabbitUses += 1;
  }
}

/** Смысловой ключ замены — объединяет близкие по идее фразы. */
export function replacementSemanticKey(text: string): string {
  const t = text.toLowerCase();
  if (isRabbitText(t)) return RABBIT_SEMANTIC_KEY;
  if (t.includes("говядин")) return "beef_meal";
  if (isPoultryDish(t)) return "poultry_vegetables";
  if (isSeafoodDishText(t)) return "seafood_meal";
  if (isFishDishText(t)) return "fish_meal";
  if (t.includes("гуакамоле")) return "avocado_vegetables";
  if (t.includes("хумус")) return HUMMUS_SEMANTIC_KEY;
  if (
    (t.includes("сыр") || t.includes("творог")) &&
    (t.includes("овощ") || t.includes("огур") || t.includes("перец"))
  ) {
    return "cheese_vegetables";
  }
  if (t.includes("сыр") && !t.includes("сырник")) return "cheese_snack";
  if (t.includes("банан") && (t.includes("хлебц") || t.includes("хлеб"))) {
    return "fruit_crispbread";
  }
  if (t.includes("фрукт") && (t.includes("хлебц") || t.includes("хлеб"))) {
    return "fruit_crispbread";
  }
  if (t.includes("хлебц") || t.includes("тост")) return "bread_snack";
  if (t.includes("чечевиц") || t.includes("фасол") || t.includes("нут")) {
    return "legumes_stew";
  }
  if (t.includes("омлет") && t.includes("салат")) return "egg_salad";
  if (isEggDish(t)) return "egg_vegetables";
  if (t.includes("гречк") && t.includes("гриб")) return "buckwheat_mushroom";
  if (t.includes("овсян") || t.includes("каша")) return "porridge_fruit";
  if (t.includes("орех") || t.includes("арахис") || t.includes("семеч")) {
    return "fruit_nuts";
  }
  if (t.includes("фрукт") || t.includes("яблок") || t.includes("банан")) {
    return "fruit_nuts";
  }
  if (t.includes("суп")) return "soup_meal";
  if (t.includes("салат") && t.includes("яйц")) return "egg_salad";
  if (t.includes("рагу") && t.includes("нут")) return "legumes_stew";
  return "other_meal";
}

function replacementConflictsWithDish(dish: string, replacement: string): boolean {
  const rKey = replacementSemanticKey(replacement);
  if (isMeatText(dish) && (rKey === RABBIT_SEMANTIC_KEY || rKey === "poultry_vegetables" || rKey === "beef_meal")) {
    return true;
  }
  if (isLegumesText(dish) && (rKey === "legumes_stew" || rKey === HUMMUS_SEMANTIC_KEY)) {
    return true;
  }
  if (isBreadDish(dish) && (rKey === "fruit_crispbread" || rKey === "bread_snack")) {
    return true;
  }
  if ((isEggDish(dish) || detectDishFamily(dish) === "egg") && (rKey === "egg_vegetables" || rKey === "egg_salad")) {
    return true;
  }
  if (isFishDishText(dish) && rKey === "fish_meal") {
    return true;
  }
  return false;
}

function isBreadDish(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("хлебц") || t.includes("тост") || t.includes("сэндвич");
}

function isBreadAvocadoDish(text: string): boolean {
  const t = text.toLowerCase();
  return isBreadDish(t) && t.includes("авокадо");
}

function isLactoseFreeLabel(text: string): boolean {
  return text.toLowerCase().includes("безлактоз");
}

function filterLactoseFreeUnlessNeeded(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  if (constraints.lactose) {
    return filterDairyForLactose(options, constraints);
  }
  const without = options.filter((o) => !isLactoseFreeLabel(o));
  return without.length > 0 ? without : options;
}

function isDairyReplacementText(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes("безлактоз")) {
    return true;
  }
  return (
    t.includes("творог") ||
    t.includes("творожн") ||
    t.includes("йогурт") ||
    t.includes("кефир") ||
    t.includes("ряженк") ||
    t.includes("сырник") ||
    t.includes("сметан") ||
    t.includes("молок") ||
    t.includes("сливк") ||
    t.includes("запеканк") ||
    (t.includes("сыр") && !t.includes("сырник"))
  );
}

function filterDairyForLactose(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  if (!constraints.lactose) {
    return options;
  }
  const without = options.filter((o) => !isDairyReplacementText(o));
  return without.length > 0 ? without : options;
}

function filterGlutenReplacements(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  if (!constraints.gluten) {
    return options;
  }
  const without = options.filter((o) => !textViolatesGluten(o));
  return without.length > 0 ? without : options;
}

function filterFishReplacements(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  const without = options.filter((o) => !fishReplacementBlocked(o, constraints));
  if (without.length > 0) {
    return without;
  }
  const fallback = filterOptions(
    [
      ...SEA_FISH_REPLACEMENTS,
      ...RIVER_FISH_REPLACEMENTS,
      ...SEAFOOD_REPLACEMENTS,
    ],
    constraints,
  );
  return fallback.length > 0 ? fallback : without;
}

function filterEggReplacements(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  if (!constraints.egg) {
    return options;
  }
  const without = options.filter((o) => !textContainsEgg(o));
  if (without.length > 0) {
    return without;
  }
  return filterOptions(EGG_FREE_REPLACEMENTS, constraints);
}

const EGG_FREE_REPLACEMENTS = [
  "овощи с хумусом",
  "овощи с авокадо",
  "фрукт и орехи",
  "индейка с овощами",
  "фасоль с овощами",
  "курица с овощами",
  "треска с овощами",
  "судак с картофелем",
];

const HUMMUS_ALTERNATIVE_REPLACEMENTS = [
  "фрукт и орехи",
  "овощи с авокадо",
  "фасоль с овощами",
  "индейка с овощами",
  "курица с овощами",
  "треска с овощами",
  "курица с гречкой",
  "овощи с хумусом",
];

const SEA_FISH_REPLACEMENTS = [
  "треска с овощами",
  "хек с рисом",
  "минтай с картофелем",
  "скумбрия с салатом",
  "тунец с салатом",
  "хек с овощами",
  "минтай с овощами",
];

const RIVER_FISH_REPLACEMENTS = [
  "судак с картофелем",
  "щука с овощами",
  "карп с овощами",
  "окунь с рисом",
  "судак на пару с брокколи",
];

const SEAFOOD_REPLACEMENTS = [
  "креветки с рисом",
  "мидии с овощами",
  "кальмар с салатом",
  "креветки с овощами",
  "мидии в томатном соусе",
];

function isStrictConstraintSet(constraints: UserFoodConstraints): boolean {
  const active = [
    constraints.gluten,
    constraints.lactose,
    constraints.egg,
    constraints.nuts,
    constraints.meat,
    constraints.fish || constraints.seaFish || constraints.riverFish,
    constraints.seafood,
  ].filter(Boolean).length;
  return active >= 4;
}

const STRICT_GRAIN_MARKERS = [
  "гречк",
  "рис",
  "киноа",
  "пшён",
  "пшено",
  "перлов",
  "овсян",
  "булгур",
  "манк",
] as const;

type StrictSemanticKind =
  | "soup"
  | "grain"
  | "legumes"
  | "potato"
  | "vegetable"
  | "snack_meal"
  | "breakfast_light"
  | "hummus";

function textIsStrictSoup(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("суп") || t.includes("борщ") || t.includes("уха");
}

function textIsStrictLegumes(text: string): boolean {
  return isLegumesText(text);
}

function textIsStrictPotato(text: string): boolean {
  return text.toLowerCase().includes("картоф");
}

function textIsStrictGrain(text: string): boolean {
  const t = text.toLowerCase();
  return (
    STRICT_GRAIN_MARKERS.some((m) => t.includes(m)) ||
    t.includes("каша") ||
    t.includes("каши")
  );
}

function sharesStrictGrainType(dish: string, replacement: string): boolean {
  const d = dish.toLowerCase();
  const r = replacement.toLowerCase();
  for (const marker of STRICT_GRAIN_MARKERS) {
    if (d.includes(marker) && r.includes(marker)) {
      return true;
    }
  }
  if (d.includes("каша") && r.includes("каша")) {
    return true;
  }
  return false;
}

/** Обеденные/ужинные блюда — не для завтрака. */
function textIsLunchMainStyle(text: string): boolean {
  const t = text.toLowerCase();
  if (textIsStrictSoup(t)) {
    return true;
  }
  if (textIsStrictPotato(t) && !t.includes("хлебц")) {
    return true;
  }
  if (t.includes("салат") && t.includes("запеч")) {
    return true;
  }
  if (t.includes("капуста") && t.includes("тушён")) {
    return true;
  }
  if (t.includes("рис с томл") || t.includes("рис с туш")) {
    return true;
  }
  return false;
}

function textIsBreakfastAppropriate(text: string): boolean {
  const t = text.toLowerCase();
  if (textIsLunchMainStyle(t)) {
    return false;
  }
  if (textIsStrictLegumes(t) && !isHummusText(t)) {
    return false;
  }
  return (
    t.includes("хлебц") ||
    t.includes("каша") ||
    textIsStrictGrain(t) ||
    t.includes("тыкв") ||
    t.includes("яблок") ||
    t.includes("киноа") ||
    t.includes("груш") ||
    t.includes("банан") ||
    t.includes("фрукт")
  );
}

function textIsSnackAppropriate(text: string): boolean {
  const t = text.toLowerCase();
  if (textIsStrictSoup(t)) {
    return false;
  }
  if (textIsStrictPotato(t) && !t.includes("дольк")) {
    return false;
  }
  if (
    textIsStrictLegumes(t) &&
    !isHummusText(t) &&
    (t.includes("фасол") || t.includes("чечевиц") || t.includes("нут"))
  ) {
    return false;
  }
  if (textIsLunchMainStyle(t)) {
    return false;
  }
  return (
    t.includes("яблок") ||
    t.includes("морков") ||
    t.includes("огуреч") ||
    t.includes("нарезк") ||
    t.includes("фрукт") ||
    t.includes("груш") ||
    t.includes("банан") ||
    t.includes("хумус") ||
    t.includes("свёкл") ||
    t.includes("свекл")
  );
}

function detectStrictSourceKind(dish: string, slot: MealSlot): StrictSemanticKind {
  const t = dish.toLowerCase();
  if (slot === "snack") {
    return isHummusText(t) ? "hummus" : "snack_meal";
  }
  if (textIsStrictSoup(t)) {
    return "soup";
  }
  if (slot === "breakfast") {
    if (textIsStrictGrain(t)) {
      return "grain";
    }
    if (textIsStrictLegumes(t)) {
      return "legumes";
    }
    if (t.includes("хлебц") || t.includes("тост")) {
      return "breakfast_light";
    }
    return "vegetable";
  }
  if (textIsStrictLegumes(t)) {
    return "legumes";
  }
  if (textIsStrictPotato(t)) {
    return "potato";
  }
  if (textIsStrictGrain(t)) {
    return "grain";
  }
  return "vegetable";
}

function detectStrictReplacementKind(
  replacement: string,
  slot: MealSlot,
): StrictSemanticKind {
  const t = replacement.toLowerCase();
  if (isHummusText(t)) {
    return "hummus";
  }
  if (textIsStrictSoup(t)) {
    return "soup";
  }
  if (slot === "snack") {
    return "snack_meal";
  }
  if (slot === "breakfast" && textIsBreakfastAppropriate(t)) {
    if (textIsStrictGrain(t)) {
      return "grain";
    }
    if (t.includes("хлебц") || t.includes("тост")) {
      return "breakfast_light";
    }
    return "vegetable";
  }
  if (textIsStrictLegumes(t)) {
    return "legumes";
  }
  if (textIsStrictPotato(t)) {
    return "potato";
  }
  if (textIsStrictGrain(t)) {
    return "grain";
  }
  return "vegetable";
}

function strictReplacementFitsDish(
  dish: string,
  slot: MealSlot,
  replacement: string,
): boolean {
  const r = replacement.toLowerCase();
  const sourceKind = detectStrictSourceKind(dish, slot);
  const replKind = detectStrictReplacementKind(replacement, slot);

  if (isHummusText(r) && slot !== "snack") {
    return false;
  }

  if (slot === "snack") {
    return textIsSnackAppropriate(r);
  }

  if (slot === "breakfast") {
    if (!textIsBreakfastAppropriate(r)) {
      return false;
    }
    if (
      (sourceKind === "grain" || sourceKind === "breakfast_light") &&
      sharesStrictGrainType(dish, replacement)
    ) {
      return false;
    }
    if (sourceKind === "legumes" && textIsStrictLegumes(r)) {
      return false;
    }
    return true;
  }

  if (sourceKind === "soup") {
    return replKind !== "soup" && !textIsStrictLegumes(r);
  }

  if (sourceKind === "legumes") {
    return replKind !== "legumes";
  }

  if (sourceKind === "potato") {
    return replKind !== "potato";
  }

  if (sourceKind === "grain") {
    return !sharesStrictGrainType(dish, replacement);
  }

  return replKind !== "soup";
}

function filterStrictReplacementsSemantically(
  dish: string,
  slot: MealSlot,
  options: string[],
): string[] {
  const semantic = options.filter((o) => strictReplacementFitsDish(dish, slot, o));
  return semantic.length > 0 ? semantic : options;
}

const STRICT_LUNCH_DINNER_REPLACEMENTS = [
  "картофель дольками с паприкой и зелёным салатом",
  "рис с томлёными овощами и зеленью",
  "тёплый салат из запечённых овощей с зеленью",
  "капуста, тушённая с морковью и томатом",
  "суп с чечевицей и овощами",
  "овощной суп",
];

const STRICT_BREAKFAST_REPLACEMENTS = [
  "рисовые хлебцы с томатом, зеленью и щепоткой соли",
  "киноа с тёплыми овощами и зеленью",
  "тыква дольками с травами и лёгкой корочкой",
  "запечённое яблоко с корицей",
  "гречневая каша с яблоком",
  "рисовая каша с грушей",
  "овсянка на воде с фруктом",
];

const STRICT_SNACK_REPLACEMENTS = [
  "огуречный салат с укропом и каплей лимона",
  "запечённое яблоко с корицей",
  "морковь дольками с паприкой и зеленью",
  "овощная нарезка с зеленью",
  "фруктовый салат",
  "овощи с хумусом",
];

function strictReplacementOptions(slot: MealSlot): string[] {
  if (slot === "snack") {
    return STRICT_SNACK_REPLACEMENTS;
  }
  if (slot === "breakfast") {
    return STRICT_BREAKFAST_REPLACEMENTS;
  }
  return STRICT_LUNCH_DINNER_REPLACEMENTS;
}

function applyReplacementSafetyFilters(
  options: string[],
  ctx: ReplacementContext,
): string[] {
  let opts = filterOptions(options, ctx.constraints);
  opts = filterEggReplacements(opts, ctx.constraints);
  opts = filterFishReplacements(opts, ctx.constraints);
  opts = filterGlutenReplacements(opts, ctx.constraints);
  opts = filterHummusWhenLimitReached(opts, ctx.constraints);
  opts = filterRabbitWhenLimitReached(opts, ctx.constraints);
  return opts;
}

function filterHummusWhenLimitReached(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  if (!isHummusProgramLimitReached()) {
    return options;
  }
  const without = options.filter((o) => !isHummusText(o));
  if (without.length > 0) {
    return without;
  }
  const alts = filterOptions(HUMMUS_ALTERNATIVE_REPLACEMENTS, constraints);
  return alts.length > 0 ? alts : without;
}

function filterDairyReplacementsForDairyDish(
  dish: string,
  options: string[],
): string[] {
  const family = detectDishFamily(dish);
  if (family !== "dairy" && family !== "syrniki" && family !== "tvorogBake") {
    return options;
  }
  const nonDairy = options.filter((o) => !isDairyReplacementText(o));
  return nonDairy.length > 0 ? nonDairy : options;
}

function filterHummusForDairyDish(dish: string, options: string[]): string[] {
  const family = detectDishFamily(dish);
  if (family !== "dairy" && family !== "syrniki" && family !== "tvorogBake") {
    return options;
  }
  const withoutHummus = options.filter((o) => !isHummusText(o));
  return withoutHummus.length > 0 ? withoutHummus : options;
}

function isMeatLunchDinnerSlot(slot: MealSlot): boolean {
  return slot === "lunch" || slot === "dinner";
}

/** Белковая замена для meat lunch/dinner (не snack-like hummus). */
function isMeatDinnerProteinReplacement(
  text: string,
  constraints: UserFoodConstraints,
): boolean {
  if (isHummusText(text)) {
    return false;
  }
  const o = text.toLowerCase();
  if (
    (isFishDishText(o) || isSeafoodDishText(o)) &&
    !fishReplacementBlocked(text, constraints)
  ) {
    return true;
  }
  if (
    o.includes("фасол") ||
    o.includes("чечевиц") ||
    o.includes("нут") ||
    o.includes("бобов") ||
    (o.includes("рагу") && o.includes("нут"))
  ) {
    return true;
  }
  if (o.includes("суп") || o.includes("борщ") || o.includes("щи")) {
    return true;
  }
  if (o.includes("творог")) {
    return true;
  }
  if (
    (o.includes("сыр") && !o.includes("сырник")) &&
    !constraints.lactose
  ) {
    return true;
  }
  if (textContainsEgg(o) && !constraints.egg) {
    return true;
  }
  return false;
}

/** Крупа/каша без выраженного белка — слабая замена для meat lunch/dinner. */
function isPlainGrainReplacement(text: string): boolean {
  const o = text.toLowerCase();
  const hasGrain =
    o.includes("гречк") ||
    o.includes("каша") ||
    o.includes("пшён") ||
    o.includes("пшено") ||
    o.includes("рисовая каша") ||
    o.includes("перлов") ||
    o.includes("булгур") ||
    o.includes("киноа") ||
    o.includes("манк");
  if (!hasGrain || o.includes("суп")) {
    return false;
  }
  if (
    isFishDishText(o) ||
    isSeafoodDishText(o) ||
    isPoultryDish(o) ||
    o.includes("говядин") ||
    o.includes("фасол") ||
    o.includes("чечевиц") ||
    o.includes("нут") ||
    o.includes("бобов") ||
    o.includes("творог") ||
    textContainsEgg(o) ||
    (o.includes("сыр") && !o.includes("сырник"))
  ) {
    return false;
  }
  return true;
}

function filterHummusForMeatDish(
  dish: string,
  slot: MealSlot,
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  const family = detectDishFamily(dish);
  if (family !== "meat" || !isMeatLunchDinnerSlot(slot)) {
    return options;
  }
  const preferred = options.filter((o) =>
    isMeatDinnerProteinReplacement(o, constraints),
  );
  if (preferred.length === 0) {
    return options;
  }
  const withoutHummus = options.filter((o) => !isHummusText(o));
  return withoutHummus.length > 0 ? withoutHummus : options;
}

function filterPlainGrainForMeatDish(
  dish: string,
  slot: MealSlot,
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  const family = detectDishFamily(dish);
  if (family !== "meat" || !isMeatLunchDinnerSlot(slot)) {
    return options;
  }
  const preferred = options.filter((o) =>
    isMeatDinnerProteinReplacement(o, constraints),
  );
  if (preferred.length === 0) {
    return options;
  }
  const withoutGrain = options.filter((o) => !isPlainGrainReplacement(o));
  return withoutGrain.length > 0 ? withoutGrain : options;
}

/** Смещение score: предпочитаем рыбную/суповую/не-хумусовую замену под тип блюда. */
function replacementContextBias(
  dish: string,
  option: string,
  constraints: UserFoodConstraints,
  slot: MealSlot,
  skipMeatDinnerBias?: boolean,
): number {
  const d = dish.toLowerCase();
  const o = option.toLowerCase();
  let bias = 0;

  const srcFish = isFishDishText(d) || isSeafoodDishText(d);
  if (srcFish) {
    const optFish =
      (isFishDishText(o) || isSeafoodDishText(o)) && !fishReplacementBlocked(o, constraints);
    if (optFish) {
      bias -= 900;
    }
    if (isPoultryDish(o) || o.includes("говядин")) {
      bias += 700;
    }
  }

  if (d.includes("суп") || d.includes("борщ") || d.includes("щи")) {
    if (o.includes("суп")) {
      bias -= 900;
    }
    if (
      (o.includes("гречк") || o.includes("каша") || o.includes("рисовая каша")) &&
      !o.includes("суп")
    ) {
      bias += 650;
    }
  }

  const family = detectDishFamily(dish);
  if (family === "dairy" || family === "syrniki" || family === "tvorogBake") {
    if (isHummusText(o)) {
      bias += 500;
    }
    if (
      o.includes("творог") ||
      o.includes("йогурт") ||
      o.includes("омлет") ||
      (o.includes("сыр") && !o.includes("сырник")) ||
      o.includes("фрукт") ||
      o.includes("овсян") ||
      o.includes("авокадо")
    ) {
      if (!constraints.lactose || !isDairyReplacementText(o)) {
        bias -= 400;
      }
    }
  }

  if (
    !skipMeatDinnerBias &&
    isMeatLunchDinnerSlot(slot) &&
    family === "meat"
  ) {
    if (isHummusText(o)) {
      bias += 700;
    }
    if (
      (isFishDishText(o) || isSeafoodDishText(o)) &&
      !fishReplacementBlocked(option, constraints)
    ) {
      bias -= 400;
    }
    if (
      !isHummusText(o) &&
      (o.includes("фасол") ||
        o.includes("чечевиц") ||
        o.includes("нут") ||
        o.includes("бобов") ||
        (o.includes("рагу") && o.includes("нут")))
    ) {
      bias -= 300;
    }
    if (o.includes("суп") || o.includes("борщ") || o.includes("щи")) {
      bias -= 150;
    }
    if (o.includes("творог") || (textContainsEgg(o) && !constraints.egg)) {
      bias -= 200;
    }
    if (isPlainGrainReplacement(option)) {
      bias += 700;
    }
  }

  return bias;
}

/** Не предлагать замену, почти совпадающую с блюдом. */
function isTooSimilar(dish: string, replacement: string): boolean {
  const d = dish.toLowerCase();
  const r = replacement.toLowerCase();
  if (d.includes("сырник") && r.includes("сырник")) return true;
  if (d.includes("хлебц") && r.includes("хлебц")) return true;
  if (d.includes("тост") && r.includes("тост") && !d.includes("хумус")) return true;
  if (d.includes("гречк") && r.includes("гречк") && d.includes("курин") && r.includes("кур")) {
    return true;
  }
  if (d.includes("котлет") && r.includes("гречк") && r.includes("кур")) return true;

  if (isEggDish(d) && isEggDish(r)) return true;

  if (isFishDishText(d) && isFishDishText(r)) {
    if (d.includes("суп") || r.includes("суп")) return false;
    return true;
  }

  if (isChickenSalad(d) && isChickenSalad(r)) {
    return true;
  }
  if (isChickenSalad(d) && r.includes("боул") && r.includes("кур")) {
    return true;
  }

  if (isPoultryDish(d) && isPoultryDish(r)) {
    if (d.includes("салат") && r.includes("овощ") && !r.includes("салат")) {
      return true;
    }
    if (
      (d.includes("рис") || d.includes("булгур") || d.includes("греч")) &&
      (r.includes("рис") || r.includes("булгур") || r.includes("греч"))
    ) {
      return true;
    }
    return true;
  }

  if (isBreadAvocadoDish(d) && isBreadDish(r)) {
    return true;
  }
  if (d.includes("хлебц") && (r.includes("хлебц") || r.includes("тост"))) {
    return true;
  }

  if (replacementSemanticKey(dish) === replacementSemanticKey(replacement)) {
    return true;
  }

  const dishWords = d.split(/\s+/).filter((w) => w.length > 4);
  const replWords = r.split(/\s+/).filter((w) => w.length > 4);
  const overlap = replWords.filter((w) => dishWords.includes(w)).length;
  return overlap >= 2;
}

function sharesProteinAndFamily(
  ctx: ReplacementContext,
  replacement: string,
): boolean {
  if (!ctx.catalogItem) {
    return false;
  }
  const src = enrichDish(ctx.catalogItem, ctx.slot);
  const r = replacement.toLowerCase();

  const srcPoultry =
    src.proteinType === "chicken" || src.proteinType === "turkey";
  const replPoultry = isPoultryDish(r);
  if (srcPoultry && replPoultry) {
    return true;
  }

  if (src.proteinType === "fish" && isFishDishText(r)) {
    return true;
  }

  const replSalad = r.includes("салат");
  if (src.mealFamily === "salad" && replSalad && srcPoultry && replPoultry) {
    return true;
  }

  const replBread = isBreadDish(r);
  if (
    (src.mealFamily === "toast" || src.carbType === "bread") &&
    replBread
  ) {
    return true;
  }

  return false;
}

const MEAT_REPLACEMENT_POOL = [
  "треска с овощами",
  "судак с картофелем",
  "фасоль с овощами",
  "индейка с овощами",
  "овощное рагу с нутом",
  "гречка с грибами",
  "творог с зеленью и овощами",
  "говядина с салатом",
  "чечевица с томатами и луком",
  "суп с чечевицей и овощами",
  "овощи с хумусом",
];

const DAIRY_REPLACEMENT_POOL = [
  "тост с авокадо",
  "овсянка с фруктом",
  "овощи с сыром",
  "гречневая каша с яблоком",
  "фасоль с овощами",
  "хумус с овощами",
  "овощи с хумусом",
];

const SNACK_REPLACEMENT_POOL = [
  "овощи с хумусом",
  "огурец и хумус",
  "морковь и хумус",
  "фрукт и орехи",
  "яблоко с арахисовой пастой",
  "груша и семечки",
  "банан и семечки",
  "смородина и орехи",
  "сыр с овощами",
  "огурец и сыр",
  "перец и сыр",
  "рисовые хлебцы с авокадо",
  "хлебец с авокадо",
  "овощи с йогуртом",
  "морковь и творог",
  "банан и йогурт",
];

const BREAD_CROSS_REPLACEMENTS = [
  "хумус с овощами",
  "овсянка с фруктом",
  "сыр с овощами",
  "рисовые хлебцы с авокадо",
  "овощи с авокадо",
];

const POULTRY_CROSS_REPLACEMENTS = MEAT_REPLACEMENT_POOL;

const RABBIT_ALTERNATIVE_REPLACEMENTS = [
  "индейка с овощами",
  "индейка с салатом",
  "курица с гречкой",
  "говядина с салатом",
  "треска с овощами",
  "хек с рисом",
  "овощи с хумусом",
];

function filterRabbitWhenLimitReached(
  options: string[],
  constraints: UserFoodConstraints,
): string[] {
  if (!isRabbitProgramLimitReached()) {
    return options;
  }
  const without = options.filter((o) => !isRabbitText(o));
  if (without.length > 0) {
    return without;
  }
  const alts = filterOptions(RABBIT_ALTERNATIVE_REPLACEMENTS, constraints);
  return alts.length > 0 ? alts : without;
}

function semanticPenalty(ctx: ReplacementContext, option: string): number {
  const semKey = replacementSemanticKey(option);
  if (semKey === RABBIT_SEMANTIC_KEY && isRabbitProgramLimitReached()) {
    return 10_000;
  }
  if (semKey === HUMMUS_SEMANTIC_KEY && isHummusProgramLimitReached()) {
    return 10_000;
  }
  if (ctx.usedSemanticKeysInDay?.includes(semKey)) {
    return 10_000;
  }
  const programCount = ctx.programSemanticCounts?.[semKey] ?? 0;
  if (semKey === RABBIT_SEMANTIC_KEY && programCount >= MAX_RABBIT_PER_PROGRAM) {
    return 5_000;
  }
  if (semKey === HUMMUS_SEMANTIC_KEY && programCount >= MAX_HUMMUS_PER_PROGRAM) {
    return 5_000;
  }
  if (programCount >= 2) {
    return 5_000;
  }
  if (ctx.recentSemanticKeys?.includes(semKey)) {
    return 900;
  }
  return programCount * 250;
}

function pickBestReplacement(
  ctx: ReplacementContext,
  options: string[],
): string {
  let opts = filterOptions(options, ctx.constraints);
  opts = filterLactoseFreeUnlessNeeded(opts, ctx.constraints);
  opts = filterDairyForLactose(opts, ctx.constraints);
  opts = filterGlutenReplacements(opts, ctx.constraints);
  opts = filterHummusWhenLimitReached(opts, ctx.constraints);
  opts = filterRabbitWhenLimitReached(opts, ctx.constraints);
  opts = filterEggReplacements(opts, ctx.constraints);
  opts = filterFishReplacements(opts, ctx.constraints);
  opts = filterDairyReplacementsForDairyDish(ctx.dish, opts);
  opts = filterHummusForDairyDish(ctx.dish, opts);
  opts = filterHummusForMeatDish(ctx.dish, ctx.slot, opts, ctx.constraints);
  opts = filterPlainGrainForMeatDish(ctx.dish, ctx.slot, opts, ctx.constraints);

  if (isPoultryDish(ctx.dish)) {
    const nonPoultry = opts.filter((o) => !isPoultryDish(o));
    if (nonPoultry.length > 0) {
      opts = nonPoultry;
    }
  }

  if (isBreadDish(ctx.dish)) {
    const nonBread = opts.filter((o) => !isBreadDish(o));
    if (nonBread.length > 0) {
      opts = nonBread;
    }
  }

  if (isLegumesText(ctx.dish)) {
    const nonLegumes = opts.filter((o) => !isLegumesText(o));
    if (nonLegumes.length > 0) {
      opts = nonLegumes;
    }
  }

  if (isEggDish(ctx.dish) || detectDishFamily(ctx.dish) === "egg") {
    const nonEgg = opts.filter((o) => !isEggDish(o));
    if (nonEgg.length > 0) {
      opts = nonEgg;
    }
  }

  const nonConflict = opts.filter((o) => !replacementConflictsWithDish(ctx.dish, o));
  if (nonConflict.length > 0) {
    opts = nonConflict;
  }

  let distinct = opts.filter((o) => !isTooSimilar(ctx.dish, o));
  if (distinct.length === 0) {
    distinct = opts;
  }

  if (ctx.catalogItem) {
    const crossFamily = distinct.filter((o) => !sharesProteinAndFamily(ctx, o));
    if (crossFamily.length > 0) {
      distinct = crossFamily;
    }
  }

  const withoutDaySemantic = distinct.filter(
    (o) => !ctx.usedSemanticKeysInDay?.includes(replacementSemanticKey(o)),
  );
  if (withoutDaySemantic.length > 0) {
    distinct = withoutDaySemantic;
  }

  const withoutRecentSemantic = distinct.filter(
    (o) => !ctx.recentSemanticKeys?.includes(replacementSemanticKey(o)),
  );
  if (withoutRecentSemantic.length > 0) {
    distinct = withoutRecentSemantic;
  }

  const withoutOverusedSemantic = distinct.filter((o) => {
    const sk = replacementSemanticKey(o);
    return (ctx.programSemanticCounts?.[sk] ?? 0) < 2;
  });
  if (withoutOverusedSemantic.length > 0) {
    distinct = withoutOverusedSemantic;
  }

  const withoutHummusCap = distinct.filter(
    (o) => !isHummusText(o) || !isHummusProgramLimitReached(),
  );
  if (withoutHummusCap.length > 0) {
    distinct = withoutHummusCap;
  }

  const withoutRabbitCap = distinct.filter(
    (o) => !isRabbitText(o) || !isRabbitProgramLimitReached(),
  );
  if (withoutRabbitCap.length > 0) {
    distinct = withoutRabbitCap;
  }

  const scored = distinct.map((option) => ({
    option,
    score:
      semanticPenalty(ctx, option) +
      replacementContextBias(
        ctx.dish,
        option,
        ctx.constraints,
        ctx.slot,
        ctx.skipMeatDinnerBias,
      ) +
      (stableHash(ctx.dayIndex, ctx.slot, SLOT_SALT[ctx.slot], option) % 97),
  }));
  scored.sort((a, b) => a.score - b.score || a.option.localeCompare(b.option, "ru"));
  const minScore = scored[0]?.score ?? 0;
  const tier = scored.filter((s) => s.score === minScore).map((s) => s.option);
  const idx =
    stableHash(
      ctx.dayIndex,
      ctx.slot,
      ctx.dish,
      ctx.usedSemanticKeysInDay?.length ?? 0,
    ) %
    tier.length;
  const fallbackPool = filterFishReplacements(
    filterEggReplacements(
      filterHummusWhenLimitReached(
        filterGlutenReplacements(
          filterOptions(HUMMUS_ALTERNATIVE_REPLACEMENTS, ctx.constraints),
          ctx.constraints,
        ),
        ctx.constraints,
      ),
      ctx.constraints,
    ),
    ctx.constraints,
  );
  return tier[idx] ?? fallbackPool[0] ?? "овощи с хумусом";
}

export type ReplacementContext = {
  dish: string;
  slot: MealSlot;
  constraints: UserFoodConstraints;
  dayIndex: number;
  catalogItem?: CatalogDish;
  /** Смысловые ключи replacement в текущем дне. */
  usedSemanticKeysInDay?: string[];
  /** Счётчик semanticKey за программу. */
  programSemanticCounts?: Record<string, number>;
  /** semanticKey за последние 3 дня (без сегодня). */
  recentSemanticKeys?: string[];
  /** Не смещать score для meat lunch/dinner (strict pool). */
  skipMeatDinnerBias?: boolean;
};

type DishFamily =
  | "dairy"
  | "syrniki"
  | "tvorogBake"
  | "egg"
  | "hummus"
  | "toast"
  | "crispbread"
  | "porridge"
  | "nuts"
  | "legumes"
  | "soup"
  | "meat"
  | "fish"
  | "generic";

function detectDishFamily(dish: string): DishFamily {
  const d = dish.toLowerCase();
  if (d.includes("сырник")) return "syrniki";
  if (d.includes("творожн") && d.includes("запеканк")) return "tvorogBake";
  if (d.includes("хумус")) return "hummus";
  if (d.includes("хлебц")) return "crispbread";
  if (d.includes("тост") || d.includes("сэндвич")) return "toast";
  if (textContainsEgg(d)) {
    return "egg";
  }
  if (
    d.includes("творог") ||
    d.includes("творожн") ||
    d.includes("йогурт") ||
    d.includes("кефир") ||
    d.includes("ряженк") ||
    (d.includes("сыр") && !d.includes("сырник"))
  ) {
    return "dairy";
  }
  if (d.includes("орех") || d.includes("арахис") || d.includes("семечк")) {
    return "nuts";
  }
  if (
    d.includes("каша") ||
    d.includes("овсян") ||
    d.includes("пшён") ||
    d.includes("манк") ||
    d.includes("киноа")
  ) {
    return "porridge";
  }
  if (
    d.includes("фасол") ||
    d.includes("чечевиц") ||
    d.includes("нут") ||
    d.includes("бобов")
  ) {
    return "legumes";
  }
  if (d.includes("суп") || d.includes("борщ") || d.includes("минестроне")) {
    return "soup";
  }
  if (textContainsSeafood(d)) {
    return "fish";
  }
  if (textContainsSeaFish(d) || textContainsRiverFish(d) || textContainsAnyFish(d)) {
    return "fish";
  }
  if (
    d.includes("курин") ||
    d.includes("куриц") ||
    d.includes("индейк") ||
    d.includes("говядин") ||
    d.includes("кролик") ||
    d.includes("плов") ||
    d.includes("котлет")
  ) {
    return "meat";
  }
  return "generic";
}

/** Точечные замены по названию блюда (приоритетнее семейства). */
function dishSpecificReplacements(ctx: ReplacementContext): string[] | null {
  const d = ctx.dish.toLowerCase();

  if (
    (textContainsSeaFish(d) || textContainsRiverFish(d) || textContainsSeafood(d)) &&
    (d.includes("овощ") || d.includes("запеч") || d.includes("пар"))
  ) {
    return [
      "треска с овощами",
      "судак с картофелем",
      "минтай с картофелем",
      "креветки с овощами",
      "мидии в томатном соусе",
      "хек с рисом",
      "индейка с овощами",
      "курица с овощами",
      "фасоль с овощами",
    ];
  }
  if (d.includes("хлебц") || isBreadAvocadoDish(d)) {
    return BREAD_CROSS_REPLACEMENTS;
  }
  if (d.includes("тост") && !d.includes("хумус")) {
    return BREAD_CROSS_REPLACEMENTS;
  }
  if (d.includes("салат") && d.includes("индейк")) {
    return POULTRY_CROSS_REPLACEMENTS;
  }
  if (isPoultryDish(d) && d.includes("рис")) {
    return [
      "треска с овощами",
      "хек с рисом",
      "судак с картофелем",
      "говядина с салатом",
      "чечевица с томатами и луком",
      "минтай с картофелем",
      "овощи с хумусом",
    ];
  }
  if (isRabbitText(d)) {
    return RABBIT_ALTERNATIVE_REPLACEMENTS;
  }
  if (isPoultryDish(d) && d.includes("салат")) {
    return POULTRY_CROSS_REPLACEMENTS;
  }
  if (d.includes("суп") && isPoultryDish(d)) {
    return [
      "овощной суп",
      "суп с чечевицей и овощами",
      "суп с минтаем и овощами",
      "куриный суп с овощами",
      "треска с овощами",
      "индейка с овощами",
      "курица с овощами",
    ];
  }
  if (isPoultryDish(d) && !d.includes("суп")) {
    return POULTRY_CROSS_REPLACEMENTS;
  }
  if (d.includes("сырник")) {
    return SYRNIKI_REPLACEMENTS;
  }
  if ((d.includes("творожн") || d.includes("творог")) && d.includes("салат")) {
    return DAIRY_REPLACEMENT_POOL;
  }
  if (d.includes("котлет") && d.includes("курин")) {
    return POULTRY_CROSS_REPLACEMENTS;
  }
  return null;
}

const DAIRY_REPLACEMENTS = DAIRY_REPLACEMENT_POOL;

const DAIRY_REPLACEMENTS_LACTOSE_FREE = [
  "овощи с хумусом",
  "овсянка на воде с фруктом",
  "фрукт и орехи",
  "рисовые хлебцы с авокадо",
  "овощи с авокадо",
];

const SYRNIKI_REPLACEMENTS = [
  "хумус с овощами",
  "овсянка с фруктом",
  "тост с авокадо",
  "овощи с хумусом",
];

const EGG_REPLACEMENTS = [
  "сыр с овощами",
  "хумус с овощами",
  "тост с сыром",
  "творог с ягодами",
  "овощи с сыром",
];

const HUMMUS_REPLACEMENTS = [
  "овощи с сыром",
  "сыр с овощами",
  "тост с авокадо",
  "овощи с авокадо",
];

const TOAST_CRISP_REPLACEMENTS = BREAD_CROSS_REPLACEMENTS;

const PORRIDGE_REPLACEMENTS = [
  "овсянка с фруктом",
  "гречневая каша с яблоком",
  "рисовая каша с грушей",
  "хумус с овощами",
  "фрукт и орехи",
];

const LEGUMES_REPLACEMENTS = [
  "треска с овощами",
  "судак с картофелем",
  "индейка с овощами",
  "овощное рагу с нутом",
  "овощи с хумусом",
  "чечевица с овощами",
];

const NUTS_REPLACEMENTS = [
  "сыр с овощами",
  "банан и хлебцы",
  "овощи с сыром",
  "фрукт и орехи",
];

const MEAT_REPLACEMENTS = POULTRY_CROSS_REPLACEMENTS;

function familyReplacements(family: DishFamily, slot: MealSlot): string[] {
  switch (family) {
    case "syrniki":
    case "tvorogBake":
      return SYRNIKI_REPLACEMENTS;
    case "dairy":
      return DAIRY_REPLACEMENTS;
    case "egg":
      return EGG_REPLACEMENTS;
    case "hummus":
      return HUMMUS_REPLACEMENTS;
    case "toast":
    case "crispbread":
      return TOAST_CRISP_REPLACEMENTS;
    case "porridge":
      return PORRIDGE_REPLACEMENTS;
    case "legumes":
      return LEGUMES_REPLACEMENTS;
    case "nuts":
      return NUTS_REPLACEMENTS;
    case "fish":
      return [
        ...SEA_FISH_REPLACEMENTS,
        ...RIVER_FISH_REPLACEMENTS,
        ...SEAFOOD_REPLACEMENTS,
        "чечевица с овощами",
        "индейка с овощами",
        "курица с овощами",
      ];
    case "meat":
      return MEAT_REPLACEMENTS;
    case "soup":
      return slot === "snack"
        ? ["овощи с хумусом", "фрукт и орехи", "овощи с авокадо"]
        : [
            "овощной суп",
            "суп с чечевицей и овощами",
            "треска с овощами",
            "суп с минтаем и овощами",
          ];
    default:
      if (slot === "breakfast") {
        return ["овсянка с фруктом", "хумус с овощами", "фрукт и орехи"];
      }
      if (slot === "snack") {
        return SNACK_REPLACEMENT_POOL;
      }
      return POULTRY_CROSS_REPLACEMENTS;
  }
}

function constraintOverrides(ctx: ReplacementContext, family: DishFamily): string[] | null {
  const { constraints: c } = ctx;
  if (c.lactose && (family === "dairy" || family === "syrniki" || family === "tvorogBake")) {
    return DAIRY_REPLACEMENTS_LACTOSE_FREE;
  }
  if (c.egg && family === "egg") {
    return ["овощи с хумусом", "овсянка на воде с фруктом", "фрукт и орехи"].filter(
      (o) => mealTextAllowedForUser(o, c),
    );
  }
  if (c.gluten && (family === "toast" || family === "crispbread")) {
    return [
      "овощи с авокадо",
      "безглютеновая овсянка с фруктом",
      "фрукт и орехи",
      "овощи с хумусом",
    ].filter((o) => mealTextAllowedForUser(o, c));
  }
  if (
    (c.fish || c.seaFish || c.riverFish) &&
    family === "fish"
  ) {
    return ["индейка с овощами", "курица с овощами"].filter((o) =>
      mealTextAllowedForUser(o, c),
    );
  }
  if (c.seafood && isSeafoodDishText(ctx.dish)) {
    return ["индейка с овощами", "овощи с хумусом", "фасоль с овощами"].filter((o) =>
      mealTextAllowedForUser(o, c),
    );
  }
  if (c.nuts && family === "nuts") {
    return NUTS_REPLACEMENTS;
  }
  if (c.meat && family === "meat") {
    return LEGUMES_REPLACEMENTS;
  }
  return null;
}

/**
 * Подбор replacement с учётом семейства блюда и ограничений пользователя.
 */
export function buildSmartReplacement(ctx: ReplacementContext): string {
  if (isStrictConstraintSet(ctx.constraints)) {
    const safeStrict = applyReplacementSafetyFilters(
      strictReplacementOptions(ctx.slot),
      ctx,
    );
    const strictOpts = filterStrictReplacementsSemantically(
      ctx.dish,
      ctx.slot,
      safeStrict,
    );
    if (strictOpts.length > 0) {
      return pickBestReplacement({ ...ctx, skipMeatDinnerBias: true }, strictOpts);
    }
  }

  const family = detectDishFamily(ctx.dish);
  let options =
    dishSpecificReplacements(ctx) ??
    constraintOverrides(ctx, family) ??
    familyReplacements(family, ctx.slot);

  if (ctx.catalogItem) {
    const enriched = enrichDish(ctx.catalogItem, ctx.slot);
    if (
      ctx.catalogItem &&
      !isDishAllowedForUser(ctx.catalogItem, ctx.slot, ctx.constraints) &&
      enriched.proteinType === "fish"
    ) {
      options = ["индейка с овощами", "курица с овощами"];
    }
    if (enriched.proteinType === "dairy" && ctx.constraints.lactose) {
      options = ["овощи с хумусом", "овсянка на воде с фруктом", "фрукт и орехи"];
    }
  }

  options = applyReplacementSafetyFilters(options, ctx);
  if (isRabbitText(ctx.dish) && isRabbitProgramLimitReached()) {
    options = filterOptions(RABBIT_ALTERNATIVE_REPLACEMENTS, ctx.constraints);
  }
  if (options.length === 0) {
    options = filterOptions(
      familyReplacements("generic", ctx.slot),
      ctx.constraints,
    );
    options = filterEggReplacements(options, ctx.constraints);
    options = filterFishReplacements(options, ctx.constraints);
    options = filterGlutenReplacements(options, ctx.constraints);
    options = filterHummusWhenLimitReached(options, ctx.constraints);
  }
  if (options.length === 0) {
    const fallback = filterFishReplacements(
      filterEggReplacements(
        filterOptions(HUMMUS_ALTERNATIVE_REPLACEMENTS, ctx.constraints),
        ctx.constraints,
      ),
      ctx.constraints,
    );
    return fallback[0] ?? "овощи с хумусом";
  }
  return pickBestReplacement(ctx, options);
}
