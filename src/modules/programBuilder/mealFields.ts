import type { MealSlot } from "./catalogMeta";
import {
  isHummusProgramLimitReached,
  isHummusText,
  mealTextAllowedForUser,
  normalizeMealTextForConstraints,
  registerHummusUse,
  textContainsEgg,
  textViolatesGluten,
  type UserFoodConstraints,
} from "./foodConstraints";
import { dishLooksLikeSoup } from "./normalizeMeal";
import { inferProteinFromDish, proteinToAccusative } from "./mealProtein";
import {
  buildSmartReplacement,
  isRabbitText,
  registerRabbitUse,
  replacementSemanticKey,
} from "./smartReplacement";
import type { ProgramMeal } from "./types";

export type MealFieldContext = {
  hasLactoseIntolerance: boolean;
  userConstraints: UserFoodConstraints;
  /** Ограничения уже в nutritionRules — не дублировать в каждой карточке. */
  restrictionsInNutritionRules: boolean;
  dayIndex: number;
};

const programSemanticCounts = new Map<string, number>();
const programSemanticByDay: { dayIndex: number; key: string }[] = [];
const daySemanticUsed = new Map<number, Set<string>>();

function getDaySemanticUsed(dayIndex: number): Set<string> {
  let used = daySemanticUsed.get(dayIndex);
  if (!used) {
    used = new Set();
    daySemanticUsed.set(dayIndex, used);
  }
  return used;
}

function resetReplacementTrackingIfNewProgram(dayIndex: number, slot: MealSlot): void {
  if (dayIndex === 0 && slot === "breakfast") {
    programSemanticCounts.clear();
    programSemanticByDay.length = 0;
    daySemanticUsed.clear();
  }
}

function lactoseRestricted(ctx: MealFieldContext): boolean {
  return ctx.userConstraints.lactose || ctx.hasLactoseIntolerance;
}

function glutenRestricted(ctx: MealFieldContext): boolean {
  return ctx.userConstraints.gluten;
}

function eggRestricted(ctx: MealFieldContext): boolean {
  return ctx.userConstraints.egg;
}

/** Блюдо по названию — яичное (не тост/авокадо без яйца в dish). */
function dishIsEggMeal(dish: string): boolean {
  const d = dish.toLowerCase();
  if (d.includes("сырник")) {
    return false;
  }
  return textContainsEgg(d);
}

function crispbreadEggFreePortion(ctx: MealFieldContext): string {
  const base = glutenRestricted(ctx)
    ? "2–3 безглютеновых рисовых хлебца"
    : "2–3 рисовых хлебца";
  return `${base} + авокадо, индейка, хумус или овощи`;
}

function toastEggFreeFields(
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking"> {
  const gluten = glutenRestricted(ctx);
  return {
    portion: gluten
      ? "1–2 безглютеновых хлебца + авокадо + овощи"
      : "1–2 ломтика цельнозернового хлеба + авокадо + овощи",
    cooking: gluten
      ? "Подсушите безглютеновые хлебцы, разомните авокадо вилкой; овощи нарежьте."
      : "Подсушите тост, разомните авокадо вилкой; овощи нарежьте.",
  };
}

export type MealFieldsResult = Pick<
  ProgramMeal,
  "dish" | "portion" | "cooking" | "replacement"
>;

function finalizeMealFields(
  catalogDish: string,
  fields: Pick<ProgramMeal, "portion" | "cooking" | "replacement">,
  slot: MealSlot,
  ctx: MealFieldContext,
): MealFieldsResult {
  const displayDish = normalizeMealTextForConstraints(
    catalogDish,
    ctx.userConstraints,
  );
  const lactoseSafe = ensureLactoseSafeFields(fields, displayDish, slot, ctx);
  const glutenSafe = ensureGlutenSafeFields(lactoseSafe, displayDish, slot, ctx);
  const eggSafe = ensureEggSafeFields(glutenSafe, displayDish, slot, ctx);
  return {
    dish: displayDish,
    portion: normalizeMealTextForConstraints(
      eggSafe.portion,
      ctx.userConstraints,
    ),
    cooking: normalizeMealTextForConstraints(
      eggSafe.cooking,
      ctx.userConstraints,
    ),
    replacement: normalizeMealTextForConstraints(
      eggSafe.replacement,
      ctx.userConstraints,
    ),
  };
}

function ensureEggSafeFields(
  fields: Pick<ProgramMeal, "portion" | "cooking" | "replacement">,
  dish: string,
  slot: MealSlot,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  if (!eggRestricted(ctx)) {
    return fields;
  }

  let { portion, cooking, replacement } = fields;

  if (dishIsEggMeal(dish)) {
    if (!mealTextAllowedForUser(replacement, ctx.userConstraints)) {
      replacement = buildSmartReplacement({
        dish,
        slot,
        constraints: ctx.userConstraints,
        dayIndex: ctx.dayIndex,
      });
    }
    return { portion, cooking, replacement };
  }

  if (textContainsEgg(portion) || textContainsEgg(cooking)) {
    const d = dish.toLowerCase();
    if (d.includes("хлебц")) {
      portion = glutenRestricted(ctx)
        ? "2–3 безглютеновых хлебца + авокадо + овощи"
        : "2–3 рисовых хлебца + авокадо + овощи";
      cooking =
        "Подсушите хлебцы, разомните авокадо вилкой, овощи нарежьте сбоку.";
    } else if (d.includes("тост") || d.includes("авокадо") || d.includes("сэндвич")) {
      const toastFields = toastEggFreeFields(ctx);
      portion = toastFields.portion;
      cooking = toastFields.cooking;
    } else if (d.includes("салат")) {
      portion = "Салат 250 г: овощи и зелень";
      cooking = "Овощи нарежьте и смешайте, заправьте маслом.";
    } else {
      portion = "Овощи или фрукт 150–200 г";
      cooking = "Нарежьте овощи или фрукт и подайте без яиц.";
    }
  }

  if (!mealTextAllowedForUser(replacement, ctx.userConstraints)) {
    replacement = buildSmartReplacement({
      dish,
      slot,
      constraints: ctx.userConstraints,
      dayIndex: ctx.dayIndex,
    });
  }

  return { portion, cooking, replacement };
}

function stripDairyFromMealText(text: string): string {
  let t = text;
  t = t.replace(/\s*\+\s*сыр\s*\d+[–-]\d+\s*г/gi, " + зелень или авокадо");
  t = t.replace(/сыр\s*\d+[–-]\d+\s*г/gi, "зелень");
  t = t.replace(/,\s*сыр\s+или/gi, ",");
  t = t.replace(
    /\(авокадо,\s*сыр или индейка\)/gi,
    "(авокадо, индейка, хумус или овощи)",
  );
  t = t.replace(
    /авокадо,\s*сыр или индейк[ау]/gi,
    "авокадо, индейку, хумус или овощи",
  );
  t = t.replace(/овсянка\/йогурт/gi, "овсянка/вода");
  t = t.replace(/фрукт \+ овсянка\/йогурт/gi, "фрукт + овсянка/вода");
  t = t.replace(/ложкой масла или йогуртом/gi, "ложкой масла");
  t = t.replace(/заправьте йогуртом/gi, "заправьте маслом");
  t = t.replace(/смешайте овсянку с йогуртом/gi, "залейте овсянку водой");
  t = t.replace(/подайте йогурт/gi, "подайте фрукт");
  t = t.replace(/положите сыр[^\n.]*/gi, "выложите авокадо или овощи");
  t = t.replace(/сыр натрите[^\n.]*/gi, "зелень нарежьте");
  t = t.replace(/на молоке или воде/gi, "на воде");
  t = t.replace(/на молоке/gi, "на воде");
  return t;
}

function ensureLactoseSafeFields(
  fields: Pick<ProgramMeal, "portion" | "cooking" | "replacement">,
  dish: string,
  slot: MealSlot,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  if (!lactoseRestricted(ctx)) {
    return fields;
  }

  let portion = stripDairyFromMealText(fields.portion);
  let cooking = stripDairyFromMealText(fields.cooking);
  let replacement = fields.replacement;

  if (!mealTextAllowedForUser(portion, ctx.userConstraints)) {
    const d = dish.toLowerCase();
    if (d.includes("омлет") && !eggRestricted(ctx)) {
      portion = "2 яйца + овощи 100–120 г + зелень или авокадо";
    } else if (d.includes("омлет") && eggRestricted(ctx)) {
      portion = "Овощи 150 г + хумус 2–3 ст. л.";
    } else if (d.includes("смузи")) {
      portion = glutenRestricted(ctx)
        ? "Смузи 250–300 мл: фрукт + безглютеновая овсянка/вода"
        : "Смузи 250–300 мл: фрукт + овсянка/вода";
    } else if (d.includes("хлебц")) {
      portion = crispbreadEggFreePortion(ctx);
    } else if (
      d.includes("творог") ||
      d.includes("йогурт") ||
      d.includes("кефир") ||
      d.includes("ряженк") ||
      d.includes("сырник") ||
      (d.includes("сыр") && !d.includes("сырник"))
    ) {
      portion = "Овощи или фрукт 150 г + хумус 2–3 ст. л.";
    } else {
      portion = stripDairyFromMealText(portion);
    }
  }

  if (!mealTextAllowedForUser(cooking, ctx.userConstraints)) {
    const d = dish.toLowerCase();
    if (
      d.includes("творог") ||
      d.includes("йогурт") ||
      d.includes("кефир") ||
      d.includes("сырник")
    ) {
      cooking = "Нарежьте овощи или фрукт, хумус выложите в пиалу.";
    } else {
      cooking = stripDairyFromMealText(cooking);
    }
  }

  if (!mealTextAllowedForUser(replacement, ctx.userConstraints)) {
    replacement = buildSmartReplacement({
      dish,
      slot,
      constraints: ctx.userConstraints,
      dayIndex: ctx.dayIndex,
    });
  }

  return { portion, cooking, replacement };
}

function isNutsAndDriedFruitSnack(dishLower: string): boolean {
  return (
    dishLower.includes("сухофрукт") ||
    (dishLower.includes("орех") && dishLower.includes("сухофрукт"))
  );
}

function snackFieldsPreservingGlutenFree(
  dish: string,
  fields: Pick<ProgramMeal, "portion" | "cooking" | "replacement">,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> | null {
  const d = dish.toLowerCase();

  if (isNutsAndDriedFruitSnack(d)) {
    return {
      portion: "Орехи/семечки 15–20 г + сухофрукты 20–30 г",
      cooking: "Орехи и сухофрукты выложите порционно на тарелку.",
      replacement: fields.replacement,
    };
  }
  if (d.includes("фруктов") && d.includes("салат")) {
    return {
      portion: "Фрукты 150–200 г",
      cooking: "Фрукты нарежьте и смешайте в миске.",
      replacement: fields.replacement,
    };
  }
  if (d.includes("фрукт") && d.includes("семеч")) {
    return {
      portion: "Фрукты 150 г + семечки 1 ч. л.",
      cooking: "Фрукты нарежьте; семечки посыпьте сверху.",
      replacement: fields.replacement,
    };
  }
  if (d.includes("слив") && d.includes("семеч")) {
    return {
      portion: "Сливы 100–150 г + семечки 1 ст. л.",
      cooking: "Сливы нарежьте пополам; семечки подайте отдельно.",
      replacement: fields.replacement,
    };
  }
  if (d.includes("банан") && d.includes("орех")) {
    return {
      portion: "Банан 1 шт. + орехи 15–20 г",
      cooking: "Банан нарежьте; орехи — горстью рядом.",
      replacement: fields.replacement,
    };
  }

  return null;
}

function ensureGlutenSafeFields(
  fields: Pick<ProgramMeal, "portion" | "cooking" | "replacement">,
  dish: string,
  slot: MealSlot,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  if (!glutenRestricted(ctx)) {
    return fields;
  }

  if (slot === "snack") {
    const snackSafe = snackFieldsPreservingGlutenFree(dish, fields);
    if (snackSafe) {
      return {
        portion: normalizeMealTextForConstraints(
          snackSafe.portion,
          ctx.userConstraints,
        ),
        cooking: normalizeMealTextForConstraints(
          snackSafe.cooking,
          ctx.userConstraints,
        ),
        replacement: normalizeMealTextForConstraints(
          snackSafe.replacement,
          ctx.userConstraints,
        ),
      };
    }
  }

  let portion = normalizeMealTextForConstraints(fields.portion, ctx.userConstraints);
  let cooking = normalizeMealTextForConstraints(fields.cooking, ctx.userConstraints);
  let replacement = normalizeMealTextForConstraints(
    fields.replacement,
    ctx.userConstraints,
  );

  if (textViolatesGluten(portion)) {
    const d = dish.toLowerCase();
    if (d.includes("овсян") || d.includes("каша")) {
      portion = portion.replace(/овсян/gi, "безглютеновая овсян");
    } else if (d.includes("хлебц") || d.includes("тост") || d.includes("хлеб")) {
      portion = eggRestricted(ctx)
        ? "2–3 безглютеновых хлебца + авокадо + овощи"
        : "2–3 безглютеновых хлебца + авокадо или яйцо + овощи";
    } else if (d.includes("паста") || d.includes("лапша")) {
      portion = "Крупа без глютена 150–200 г + основное блюдо и овощи по тарелке";
    } else {
      portion = "Основное блюдо без глютена 150–200 г + овощи";
    }
  }

  if (textViolatesGluten(cooking)) {
    cooking = cooking
      .replace(/хлеб/gi, "безглютеновый хлеб")
      .replace(/тост/gi, "безглютеновый тост")
      .replace(/хлебц/gi, "безглютеновые хлебцы");
    if (textViolatesGluten(cooking)) {
      cooking = "Соберите блюдо из разрешённых безглютеновых ингредиентов.";
    }
  }

  if (
    !mealTextAllowedForUser(replacement, ctx.userConstraints) ||
    (isHummusText(replacement) && isHummusProgramLimitReached())
  ) {
    replacement = buildSmartReplacement({
      dish,
      slot,
      constraints: ctx.userConstraints,
      dayIndex: ctx.dayIndex,
    });
  }

  return { portion, cooking, replacement };
}

function ensureHummusLimitOnReplacement(
  replacement: string,
  dish: string,
  slot: MealSlot,
  ctx: MealFieldContext,
): string {
  if (!isHummusText(replacement) || !isHummusProgramLimitReached()) {
    return replacement;
  }
  return buildSmartReplacement({
    dish,
    slot,
    constraints: ctx.userConstraints,
    dayIndex: ctx.dayIndex,
  });
}

function mealReplacement(
  dish: string,
  slot: MealSlot,
  ctx: MealFieldContext,
): string {
  resetReplacementTrackingIfNewProgram(ctx.dayIndex, slot);

  const recentSemanticKeys = programSemanticByDay
    .filter(
      (entry) =>
        ctx.dayIndex > entry.dayIndex && ctx.dayIndex - entry.dayIndex <= 3,
    )
    .map((entry) => entry.key);

  const programCounts: Record<string, number> = {};
  for (const [key, count] of programSemanticCounts.entries()) {
    programCounts[key] = count;
  }

  const replacement = buildSmartReplacement({
    dish,
    slot,
    constraints: ctx.userConstraints,
    dayIndex: ctx.dayIndex,
    usedSemanticKeysInDay: [...getDaySemanticUsed(ctx.dayIndex)],
    programSemanticCounts: programCounts,
    recentSemanticKeys,
  });

  let safeReplacement = ensureHummusLimitOnReplacement(
    replacement,
    dish,
    slot,
    ctx,
  );
  if (isHummusText(safeReplacement)) {
    registerHummusUse(safeReplacement);
  }
  if (isRabbitText(safeReplacement)) {
    registerRabbitUse(safeReplacement);
  }

  const semKey = replacementSemanticKey(safeReplacement);
  getDaySemanticUsed(ctx.dayIndex).add(semKey);
  programSemanticCounts.set(semKey, (programSemanticCounts.get(semKey) ?? 0) + 1);
  programSemanticByDay.push({ dayIndex: ctx.dayIndex, key: semKey });
  return safeReplacement;
}

function starchPortionLabel(dish: string): string {
  const d = dish.toLowerCase();
  if (d.includes("греч")) return "Гречка 120–150 г";
  if (d.includes("булгур")) return "Булгур 120–150 г";
  if (d.includes("пшён") || d.includes("пшено")) return "Пшено 120–150 г";
  if (d.includes("рис") && !d.includes("лапша")) return "Рис 120–150 г";
  if (d.includes("лапша") || d.includes("паста")) return "Паста 80–100 г";
  if (d.includes("картофел")) return "Картофель 150–200 г";
  if (d.includes("киноа")) return "Киноа 120–150 г";
  return "Крупа 120–150 г";
}

function starchCookingLine(dish: string, gluten = false): string {
  const d = dish.toLowerCase();
  if (d.includes("греч")) {
    return "Гречку отварите до рассыпчатости и подайте тёплым.";
  }
  if (d.includes("булгур")) {
    return "Булгур залейте водой, проварите до мягкости и подайте тёплым.";
  }
  if (d.includes("пшён") || d.includes("пшено")) {
    return "Пшено сварите до мягкости и подайте тёплым.";
  }
  if (d.includes("рис") && !d.includes("лапша")) {
    return "Рис промойте, отварите до готовности и подайте тёплым.";
  }
  if (d.includes("лапша") || d.includes("паста")) {
    return "Пасту отварите до удобной мягкости, слегка заправьте; можно добавить зелень для тёплой домашней подачи.";
  }
  if (d.includes("картофел")) {
    return "Картофель запеките в духовке дольками до лёгкой румяной корочки.";
  }
  if (d.includes("киноа")) {
    return "Киноа промойте, отварите и подайте тёплым с зеленью.";
  }
  if (d.includes("овсян")) {
    return gluten
      ? "Безглютеновую овсянку залейте водой на ночь или сварите 5–7 минут."
      : "Овсянку залейте жидкостью на ночь или сварите 5–7 минут.";
  }
  return "Крупу отварите до готовности и подайте тёплым.";
}

function vegetableSideCookingLine(dish: string): string {
  const d = dish.toLowerCase();
  if (d.includes("салат") || d.includes("огур")) {
    return "Овощи нарежьте, добавьте зелень и немного лимонного сока, подайте свежими или слегка тёплыми.";
  }
  return "Овощи нарежьте, при необходимости потушите под крышкой; зелень и лимонный сок — перед подачей.";
}

function legumesCookingLine(dish: string): string {
  const d = dish.toLowerCase();
  if (d.includes("томат")) {
    return "Бобовые потушите с томатом, морковью и луком под крышкой; зелень добавьте перед подачей.";
  }
  if (d.includes("чечевиц")) {
    return "Чечевицу отварите до мягкости; овощи потушите с морковью и подайте тёплыми.";
  }
  if (d.includes("фасол")) {
    return "Фасоль отварите или потушите с овощами под крышкой; зелень — в конце.";
  }
  if (d.includes("нут")) {
    return "Нут отварите до мягкости; овощи потушите с луком и подайте тёплыми.";
  }
  return "Бобовые отварите до мягкости; овощи потушите с морковью и подайте тёплыми.";
}

function poultryCookingLine(dish: string, accusative: string): string {
  const d = dish.toLowerCase();
  const cap =
    accusative.charAt(0).toUpperCase() + accusative.slice(1);
  if (d.includes("котлет") || d.includes("тефтел")) {
    return `Котлеты запеките в духовке с паприкой до лёгкой корочки; овощи подайте тёплыми.`;
  }
  if (d.includes("паприк") || d.includes("запеч")) {
    return `${cap} запеките с паприкой в духовке до лёгкой румяной корочки; овощи потушите отдельно.`;
  }
  if (d.includes("тушён") || d.includes("тушен")) {
    return `${cap} потушите с морковью и овощами под крышкой; подавайте тёплым.`;
  }
  return `${cap} запеките в духовке с паприкой до лёгкой корочки или потушите с овощами под крышкой.`;
}

const FISH_PORTION_SPECIES: Array<{
  marker: string;
  label: string;
  accusative: string;
  kind: "sea" | "river" | "seafood";
}> = [
  { marker: "треск", label: "треска", accusative: "треску", kind: "sea" },
  { marker: "хек", label: "хек", accusative: "хек", kind: "sea" },
  { marker: "минтай", label: "минтай", accusative: "минтай", kind: "sea" },
  { marker: "скумбр", label: "скумбрия", accusative: "скумбрию", kind: "sea" },
  { marker: "тунец", label: "тунец", accusative: "тунец", kind: "sea" },
  { marker: "лосос", label: "лосось", accusative: "лосося", kind: "sea" },
  { marker: "семг", label: "семга", accusative: "семгу", kind: "sea" },
  { marker: "сельд", label: "сельдь", accusative: "сельдь", kind: "sea" },
  { marker: "форел", label: "форель", accusative: "форель", kind: "sea" },
  /** Префикс «кефал»: кефаль, кефали, кефалю… */
  { marker: "кефал", label: "кефаль", accusative: "кефаль", kind: "sea" },
  { marker: "горбуш", label: "горбуша", accusative: "горбушу", kind: "sea" },
  { marker: "судак", label: "судак", accusative: "судака", kind: "river" },
  { marker: "щук", label: "щука", accusative: "щуку", kind: "river" },
  { marker: "карась", label: "карась", accusative: "карася", kind: "river" },
  { marker: "лещ", label: "лещ", accusative: "леща", kind: "river" },
  { marker: "сом", label: "сом", accusative: "сома", kind: "river" },
  { marker: "карп", label: "карп", accusative: "карпа", kind: "river" },
  { marker: "окун", label: "окунь", accusative: "окуня", kind: "river" },
  { marker: "кревет", label: "креветки", accusative: "креветки", kind: "seafood" },
  { marker: "миди", label: "мидии", accusative: "мидии", kind: "seafood" },
  { marker: "кальмар", label: "кальмар", accusative: "кальмар", kind: "seafood" },
  { marker: "осьминог", label: "осьминог", accusative: "осьминога", kind: "seafood" },
  { marker: "краб", label: "краб", accusative: "краба", kind: "seafood" },
  { marker: "раки", label: "раки", accusative: "раков", kind: "seafood" },
];

function dishIncludesFishMarker(dish: string, marker: string): boolean {
  const d = dish.toLowerCase();
  if (marker === "сом") {
    return /(^|\s)сом[\s,]/.test(d) || d.startsWith("сом ");
  }
  return d.includes(marker);
}

function inferFishPortionSpec(dish: string): (typeof FISH_PORTION_SPECIES)[number] | null {
  for (const spec of FISH_PORTION_SPECIES) {
    if (dishIncludesFishMarker(dish, spec.marker)) {
      return spec;
    }
  }
  return null;
}

function fishPortionWeight(kind: "sea" | "river" | "seafood"): string {
  return kind === "seafood" ? "100–120 г" : "120–150 г";
}

function fishCookingLine(
  spec: (typeof FISH_PORTION_SPECIES)[number],
  dish: string,
): string {
  const d = dish.toLowerCase();
  const cap = `${spec.accusative.charAt(0).toUpperCase()}${spec.accusative.slice(1)}`;

  if (spec.kind === "seafood") {
    if (d.includes("кревет")) {
      return "Креветки отварите 2–3 минуты; сбрызните лимонным соком и подайте с овощами тёплыми.";
    }
    if (d.includes("миди") && d.includes("томат")) {
      return "Мидии потушите в томатном соусе с луком под крышкой; укроп добавьте перед подачей.";
    }
    if (d.includes("кальмар")) {
      return "Кальмар отварите или потушите 3–5 минут; овощи подайте с зеленью и лимонным соком.";
    }
    return `${cap} отварите или потушите 3–5 минут под крышкой; подавайте тёплым с зеленью.`;
  }

  if (d.includes("котлет")) {
    return `${cap} запеките в духовке до лёгкой румяной корочки; рядом — тёплые овощи.`;
  }
  if (d.includes("суп")) {
    return `${cap} и овощи варите на тихом огне до готовности; в конце добавьте укроп или немного лимонного сока по вкусу.`;
  }
  if (d.includes("салат")) {
    return `Запеките ${spec.accusative} до лёгкой корочки или коротко потушите; рядом салат — зелень и немного лимонного сока, если нравится.`;
  }
  if (d.includes("томат")) {
    return `${cap} потушите в томатном соусе с луком под крышкой; подавайте тёплым с укропом.`;
  }
  if (d.includes("лимон")) {
    return `${cap} запеките в духовке с лимонным соком и зеленью до лёгкой румяной корочки.`;
  }
  if (d.includes("тушён") || d.includes("тушен")) {
    return `${cap} потушите с морковью и луком под крышкой; зелень добавьте в конце.`;
  }
  if (d.includes("укроп") || d.includes("огур")) {
    return `${cap} запеките или потушите; добавьте укроп и немного лимонного сока перед подачей.`;
  }
  if (d.includes("пар")) {
    return `${cap} приготовьте на пару 12–15 минут; овощи подайте тёплыми с зеленью.`;
  }
  if (spec.kind === "river") {
    return `${cap} запеките в духовке до лёгкой румяной корочки или потушите с морковью; подавайте тёплым с укропом.`;
  }
  return `${cap} запеките в духовке до лёгкой румяной корочки; овощи потушите или подайте с зеленью.`;
}

function dishMentionsMeatOrFish(dish: string): boolean {
  const d = dish.toLowerCase();
  return (
    d.includes("курин") ||
    d.includes("куриц") ||
    d.includes("индейк") ||
    d.includes("говядин") ||
    d.includes("кролик") ||
    inferFishPortionSpec(dish) !== null ||
    d.includes("котлет") ||
    d.includes("фарш")
  );
}

function grainLabel(d: string): string {
  if (d.includes("перлов")) return "Перловка";
  if (d.includes("греч")) return "Гречка";
  if (d.includes("булгур")) return "Булгур";
  if (d.includes("пшён") || d.includes("пшено")) return "Пшено";
  if (d.includes("киноа")) return "Киноа";
  if (d.includes("рис")) return "Рис";
  return "Крупа";
}

/** Форма для связки «… отварите» в повелительном наклонении (не номинатив «Гречка отварите»). */
function grainAccusativeForImperative(dLower: string): string {
  if (dLower.includes("перлов")) return "Перловку";
  if (dLower.includes("греч")) return "Гречку";
  if (dLower.includes("булгур")) return "Булгур";
  if (dLower.includes("пшён") || dLower.includes("пшено")) return "Пшено";
  if (dLower.includes("киноа")) return "Киноа";
  if (dLower.includes("рис")) return "Рис";
  return "Крупу";
}

function buildVegetarianGrainMealFields(
  dish: string,
  ctx: MealFieldContext,
  slot: MealSlot,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> | null {
  const d = dish.toLowerCase();
  if (dishMentionsMeatOrFish(dish)) {
    return null;
  }

  if (d.includes("перлов")) {
    return {
      portion: "Перловка 150–180 г + грибы 100–120 г + овощи 80–100 г",
      cooking:
        "Перловку отварите до мягкости; грибы потушите с луком, овощи подайте свежими или тёплыми.",
      replacement: mealReplacement(dish, slot, ctx),
    };
  }

  const hasGrain =
    d.includes("греч") ||
    d.includes("рис") ||
    d.includes("булгур") ||
    d.includes("перлов") ||
    d.includes("пшён") ||
    d.includes("пшено") ||
    d.includes("киноа");
  const hasMushroom = d.includes("гриб");
  const hasVegetables =
    d.includes("овощ") || hasMushroom || d.includes("кабач") || d.includes("тыкв");

  if (hasGrain && (hasMushroom || hasVegetables)) {
    const grain = grainLabel(d);
    const grainAcc = grainAccusativeForImperative(d);
    const extra = hasMushroom ? "грибы 100–120 г" : "овощи 150–200 г";
    const cooking = hasMushroom
      ? `${grainAcc} отварите, грибы потушите с зеленью или луком, если подходит; подайте тёплым.`
      : `${grainAcc} отварите; овощи потушите с луком; подайте тёплым; сверху — немного зелени по желанию.`;
    return {
      portion: `${grain} 150–180 г + ${extra}`,
      cooking,
      replacement: mealReplacement(dish, slot, ctx),
    };
  }

  if (
    hasVegetables &&
    !hasGrain &&
    (d.includes("рагу") || d.includes("тушён") || d.includes("тушен"))
  ) {
    return {
      portion: "Овощное рагу 250–300 г",
      cooking:
        "Овощи нарежьте, потушите под крышкой с морковью и луком; зелень и лимонный сок — перед подачей.",
      replacement: mealReplacement(dish, slot, ctx),
    };
  }

  return null;
}

function buildDairyVegetarianMealFields(
  dish: string,
  ctx: MealFieldContext,
  slot: MealSlot,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> | null {
  if (lactoseRestricted(ctx)) {
    return null;
  }
  const d = dish.toLowerCase();
  if (dishMentionsMeatOrFish(dish)) {
    return null;
  }

  if ((d.includes("творожн") || d.includes("творог")) && d.includes("салат")) {
    return {
      portion: "Творожный салат 200–250 г",
      cooking:
        "Творог смешайте с нарезанными овощами и зеленью, заправьте ложкой масла или йогурта.",
      replacement: mealReplacement(dish, slot, ctx),
    };
  }

  if (
    d.includes("запеканк") &&
    (d.includes("кабач") || d.includes("овощ") || d.includes("тыкв") || d.includes("сыр"))
  ) {
    return {
      portion: "Порция запеканки 180–220 г + овощи или зелень 100–150 г",
      cooking:
        "Запеканку разогрейте в духовке 180 °C 15–20 минут; овощи или зелень подайте свежими.",
      replacement: mealReplacement(dish, slot, ctx),
    };
  }

  if (d.includes("запеканк") && !d.includes("сырник")) {
    return {
      portion: "Порция запеканки 180–220 г + овощи или зелень",
      cooking: "Запеканку разогрейте в духовке; рядом — свежие овощи или зелень.",
      replacement: mealReplacement(dish, slot, ctx),
    };
  }

  const isDairy =
    d.includes("творог") ||
    d.includes("творожн") ||
    d.includes("йогурт") ||
    d.includes("кефир") ||
    d.includes("ряженк") ||
    (d.includes("сыр") && !d.includes("сырник"));

  if (isDairy) {
    if (d.includes("йогурт")) {
      return {
        portion: "Йогурт 150–200 г + овощи или фрукт 80–120 г",
        cooking: "Йогурт выложите в миску, сверху — нарезанные овощи или фрукт.",
        replacement: mealReplacement(dish, slot, ctx),
      };
    }
    if (d.includes("творог") || d.includes("творожн")) {
      return {
        portion: "Творог 150–200 г + овощи или зелень 100–150 г",
        cooking:
          "Творог выложите на тарелку; добавьте ягоды из порции или немного корицы, если нравится.",
        replacement: mealReplacement(dish, slot, ctx),
      };
    }
    if (d.includes("сыр")) {
      return {
        portion: "Сыр 40–60 г + овощи 150–200 г",
        cooking: "Сыр нарежьте, овощи нарежьте и выложите на тарелку.",
        replacement: mealReplacement(dish, slot, ctx),
      };
    }
  }

  return null;
}

function buildBreakfastFieldsInner(
  dish: string,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  const d = dish.toLowerCase();
  const gluten = glutenRestricted(ctx);

  if (d.includes("ленив") && d.includes("овсян")) {
    const oatsWord = glutenRestricted(ctx) ? "Безглютеновая овсянка" : "Овсянка";
    const lazyFields = ensureGlutenSafeFields(
      {
        portion: lactoseRestricted(ctx)
          ? `${oatsWord} 40–50 г + вода или растительное молоко 150 мл + ягоды`
          : `${oatsWord} 40–50 г + йогурт 150 г + ягоды`,
        cooking: lactoseRestricted(ctx)
          ? gluten
            ? "Залейте безглютеновую овсянку водой, оставьте на 6–8 часов или на ночь; утром добавьте ягоды."
            : "Залейте овсянку водой, оставьте на 6–8 часов или на ночь; утром добавьте ягоды."
          : gluten
            ? "Залейте безглютеновую овсянку водой, оставьте на 6–8 часов или на ночь; утром добавьте ягоды."
            : "Смешайте овсянку с йогуртом, оставьте на 6–8 часов или на ночь; утром добавьте ягоды.",
        replacement: mealReplacement(dish, "breakfast", ctx),
      },
      dish,
      "breakfast",
      ctx,
    );
    return ensureLactoseSafeFields(lazyFields, dish, "breakfast", ctx);
  }
  if (d.includes("творог") && !d.includes("запеканк") && !d.includes("боул")) {
    return {
      portion: "Творог 150–200 г + фрукт или ягоды 80–120 г",
      cooking:
        "Творог выложите в миску; добавьте ягоды из порции или немного корицы, если нравится.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("йогурт") && d.includes("боул")) {
    return {
      portion: "Йогурт 180–200 г + фрукт + семечки 1 ч. л.",
      cooking: "Соберите слоями в миске: йогурт, фрукт, семечки.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("йогурт")) {
    return {
      portion: "Йогурт 150–200 г + фрукт 1 шт.",
      cooking: "Подайте йогурт с нарезанным фруктом.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("сырник")) {
    return {
      portion: "2–3 сырника",
      cooking: "Сырники запеките в духовке 180 °C около 20 минут.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("запеканк") && d.includes("творож")) {
    return {
      portion: "Порция запеканки 150–180 г",
      cooking: "Залейте форму смесью творога и яблока, запеките до румяной корочки.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (
    !eggRestricted(ctx) &&
    (d.includes("яичниц") || d.includes("глазунь") || d.includes("скрэмбл") || d.includes("пашот"))
  ) {
    return {
      portion: gluten
        ? "2 яйца + помидоры/зелень 80–100 г + овощи"
        : "2 яйца + помидоры/зелень 80–100 г + овощи или кусочек цельнозернового хлеба",
      cooking: "Яйца разбейте на сковороду, добавьте нарезанные помидоры и зелень, готовьте на среднем огне.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (!eggRestricted(ctx) && d.includes("омлет") && !d.includes("ролл")) {
    return ensureLactoseSafeFields(
      {
        portion: lactoseRestricted(ctx)
          ? "2 яйца + овощи 100–120 г + зелень или авокадо"
          : "2 яйца + овощи 100–120 г + сыр 20–30 г",
        cooking: lactoseRestricted(ctx)
          ? "Взбейте яйца, добавьте овощи и зелень, готовьте под крышкой на сковороде."
          : "Взбейте яйца, добавьте овощи и сыр, готовьте под крышкой на сковороде.",
        replacement: mealReplacement(dish, "breakfast", ctx),
      },
      dish,
      "breakfast",
      ctx,
    );
  }
  if (d.includes("хлебц")) {
    const crispLabel = glutenRestricted(ctx)
      ? "2–3 безглютеновых рисовых хлебца"
      : "2–3 рисовых хлебца";
    return {
      portion: `${crispLabel} + авокадо 40–60 г + овощи 80–100 г`,
      cooking:
        "Подсушите хлебцы, разомните авокадо вилкой и выложите на хлебцы, овощи нарежьте сбоку.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("тост") && d.includes("хумус")) {
    return {
      portion: "1–2 ломтика хлеба + хумус 2–3 ст. л. + овощи",
      cooking: "Подсушите хлеб, намажьте хумус, добавьте нарезанные овощи.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("тост") && !d.includes("хумус")) {
    const toastFields = eggRestricted(ctx)
      ? toastEggFreeFields(ctx)
      : {
          portion: gluten
            ? "1–2 безглютеновых хлебца + яйцо + овощи"
            : "1–2 ломтика цельнозернового хлеба + яйцо + овощи",
          cooking: gluten
            ? "Подсушите безглютеновые хлебцы, яйцо отварите или сделайте яичницу; овощи нарежьте."
            : "Подсушите тост, яйцо отварите или сделайте яичницу; овощи нарежьте.",
        };
    return {
      ...toastFields,
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (!eggRestricted(ctx) && d.includes("греч") && d.includes("яйц")) {
    return {
      portion: "Гречка 120 г + яйцо 1–2 шт. + огурец",
      cooking: "Гречку отварите; яйцо — всмятку; огурец нарежьте.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("пшён")) {
    return {
      portion: "Пшено 120–150 г + яблоко",
      cooking: "Пшённую кашу сварите на воде; яблоко нарежьте дольками.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("рис") && d.includes("каша")) {
    return {
      portion: "Рис 120–150 г + груша или яблоко",
      cooking: "Рисовую кашу сварите до мягкости; фрукт подайте свежим.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("овсяноблин")) {
    const blinLabel = glutenRestricted(ctx) ? "1 безглютеновый овсяноблин" : "1 овсяноблин";
    return {
      portion: `${blinLabel} + ягоды 80–100 г`,
      cooking: "Овсяноблин запеките на сухой сковороде с двух сторон; ягоды подайте свежими.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("манк")) {
    return ensureLactoseSafeFields(
      {
        portion: "Манная каша 150–180 г + ягоды 80 г",
        cooking: lactoseRestricted(ctx)
          ? "Манку сварите на воде, доведите до кремовой консистенции; сверху — ягоды."
          : "Манку сварите на молоке или воде, доведите до кремовой консистенции; сверху — ягоды.",
        replacement: mealReplacement(dish, "breakfast", ctx),
      },
      dish,
      "breakfast",
      ctx,
    );
  }
  if (d.includes("киноа")) {
    return {
      portion: "Киноа 120–150 г + овощи 100 г",
      cooking: "Киноа промойте и отварите; овощи нарежьте и смешайте с крупой.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("сэндвич") || d.includes("сандвич")) {
    return {
      portion: "2 ломтика хлеба + индейка 60–80 г + овощи",
      cooking: "Соберите сэндвич: хлеб, нарезанная индейка, лист салата и овощи.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("смузи")) {
    return ensureLactoseSafeFields(
      {
        portion: lactoseRestricted(ctx)
          ? gluten
            ? "Смузи 250–300 мл: фрукт + безглютеновая овсянка/вода"
            : "Смузи 250–300 мл: фрукт + овсянка/вода"
          : gluten
            ? "Смузи 250–300 мл: фрукт + безглютеновая овсянка/вода"
            : "Смузи 250–300 мл: фрукт + овсянка/йогурт",
        cooking: "Смешайте ингредиенты блендером до однородности.",
        replacement: mealReplacement(dish, "breakfast", ctx),
      },
      dish,
      "breakfast",
      ctx,
    );
  }
  if (d.includes("греч") && d.includes("гриб")) {
    return {
      portion: "Гречка 120–150 г + грибы 100 г + зелень",
      cooking:
        "Гречку отварите, грибы потушите с зеленью или луком, если подходит; подайте тёплым.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (!eggRestricted(ctx) && d.includes("омлет") && d.includes("ролл")) {
    return {
      portion: "2 яйца + овощи 120 г",
      cooking: "Запеките тонкий омлет, заверните в рулет с начинкой из овощей.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("овсян")) {
    const oatsLabel = glutenRestricted(ctx) ? "Безглютеновая овсянка" : "Овсянка";
    return ensureGlutenSafeFields(
      {
        portion: `${oatsLabel} 40–60 г + фрукт`,
        cooking:
          starchCookingLine(dish, gluten) + " Фрукт добавьте в готовую кашу.",
        replacement: mealReplacement(dish, "breakfast", ctx),
      },
      dish,
      "breakfast",
      ctx,
    );
  }
  if (!eggRestricted(ctx) && d.includes("яйц") && d.includes("сыр")) {
    return ensureLactoseSafeFields(
      {
        portion: lactoseRestricted(ctx)
          ? "2 яйца + овощи 100 г"
          : "2 яйца + овощи + сыр 20–30 г",
        cooking: lactoseRestricted(ctx)
          ? "Яйца отварите всмятку; овощи подайте отдельно."
          : "Яйца отварите всмятку; овощи и сыр подайте отдельно.",
        replacement: mealReplacement(dish, "breakfast", ctx),
      },
      dish,
      "breakfast",
      ctx,
    );
  }

  if (!eggRestricted(ctx) && d.includes("яйц")) {
    return {
      portion: "2 яйца + овощи 100 г",
      cooking: "Яйца приготовьте всмятку или яичницу; овощи нарежьте свежими.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }
  if (d.includes("хумус")) {
    return {
      portion: "Хумус 3–4 ст. л. + овощи 150 г",
      cooking: "Хумус выложите в миску, овощи нарежьте палочками.",
      replacement: mealReplacement(dish, "breakfast", ctx),
    };
  }

  const dairyVeg = buildDairyVegetarianMealFields(dish, ctx, "breakfast");
  if (dairyVeg) {
    return dairyVeg;
  }

  if (!dishMentionsMeatOrFish(dish)) {
    const vegGrain = buildVegetarianGrainMealFields(dish, ctx, "breakfast");
    if (vegGrain) {
      return vegGrain;
    }
  }

  return {
    portion: "Основное блюдо 150–200 г + овощи или фрукт 80–100 г",
    cooking: "Соберите тарелку из указанного блюда и свежих овощей или фрукта.",
    replacement: mealReplacement(dish, "breakfast", ctx),
  };
}

export function buildBreakfastFields(
  dish: string,
  ctx: MealFieldContext,
): MealFieldsResult {
  return finalizeMealFields(
    dish,
    buildBreakfastFieldsInner(dish, ctx),
    "breakfast",
    ctx,
  );
}

function buildLunchFieldsInner(
  dish: string,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  const protein = inferProteinFromDish(dish);
  const gluten = glutenRestricted(ctx);

  if (dishLooksLikeSoup(dish)) {
    const d = dish.toLowerCase();
    const hasLegumes =
      d.includes("бобов") ||
      d.includes("фасол") ||
      d.includes("чечевиц") ||
      d.includes("нут");
    const hasChicken =
      d.includes("курин") || d.includes("куриц") || protein.key === "курица";

    if (hasLegumes && hasChicken) {
      return {
        portion: "Суп 250–350 мл с курицей и бобовыми/овощами",
        cooking:
          "Курицу и бобовые залейте водой, варите на тихом огне; в конце добавьте зелень по вкусу.",
        replacement: mealReplacement(dish, "lunch", ctx),
      };
    }

    const fishSoup = inferFishPortionSpec(dish);
    const portion = fishSoup
      ? `Суп 250–350 мл с ${fishSoup.label} и овощами`
      : protein.key === "курица" || protein.key === "птица"
        ? "Суп 250–350 мл с курицей и овощами"
        : "Суп 250–350 мл + овощи";

    const cooking = fishSoup
      ? `${fishSoup.accusative.charAt(0).toUpperCase()}${fishSoup.accusative.slice(1)} и овощи залейте бульоном, варите на тихом огне 20–25 минут. В конце добавьте укроп или немного лимонного сока по вкусу.`
      : protein.key === "курица" || protein.key === "птица"
        ? "Курицу и овощи залейте водой, варите на тихом огне до готовности; в конце добавьте зелень по вкусу."
        : "Овощи нарежьте, сварите до мягкости; подавайте тёплым, с зеленью по желанию.";

    return {
      portion,
      cooking,
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }

  const d = dish.toLowerCase();

  if (d.includes("чечевиц") || d.includes("фасол") || d.includes("нут")) {
    return {
      portion: "Бобовые 150–180 г + овощи 150–200 г",
      cooking: legumesCookingLine(dish),
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }
  if (d.includes("паста") || d.includes("лапша")) {
    return {
      portion: "Паста 80–100 г + курица/индейка 100–120 г + овощи",
      cooking:
        "Пасту отварите; курицу или индейку запеките с паприкой; овощи подайте тёплыми с зеленью.",
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }
  if (d.includes("плов")) {
    return {
      portion: "Рис 120–150 г + курица 100–120 г + морковь и лук",
      cooking: "Рис и курицу потушите вместе с овощами до готовности.",
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }
  if (d.includes("рис") && (inferFishPortionSpec(dish) || d.includes("фасол"))) {
    const fishRice = inferFishPortionSpec(dish);
    const starch = d.includes("фасол")
      ? "фасоль 150–180 г"
      : fishRice
        ? `${fishRice.label} ${fishPortionWeight(fishRice.kind)}`
        : protein.source + " 100–120 г";
    return {
      portion: `Рис 120–150 г + ${starch} + салат 100 г`,
      cooking: fishRice
        ? `Рис отварите; ${fishRice.accusative} запеките до лёгкой корочки; салат с укропом и лимонным соком — перед подачей.`
        : `Рис отварите; ${proteinToAccusative(protein.phrase)} запеките с овощами; салат смешайте с зеленью.`,
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }

  if (d.includes("салат-боул") || d.includes("салат боул")) {
    const acc = proteinToAccusative(protein.phrase);
    return {
      portion: `Салат 250–300 г: ${protein.source} 100–120 г + овощи + авокадо/зелень`,
      cooking: lactoseRestricted(ctx)
        ? `Нарежьте овощи, добавьте ${acc}, заправьте ложкой масла.`
        : `Нарежьте овощи, добавьте ${acc}, заправьте ложкой масла или йогуртом.`,
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }

  const dairyVeg = buildDairyVegetarianMealFields(dish, ctx, "lunch");
  if (dairyVeg) {
    return dairyVeg;
  }

  const vegGrain = buildVegetarianGrainMealFields(dish, ctx, "lunch");
  if (vegGrain) {
    return vegGrain;
  }

  if (!dishMentionsMeatOrFish(dish) && protein.key === "смешанное") {
    return {
      portion: "Крупа или овощи 200–250 г + зелень",
      cooking: `${starchCookingLine(dish, gluten)} ${vegetableSideCookingLine(dish)}`,
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }

  const fishLunch = inferFishPortionSpec(dish);
  if (fishLunch) {
    const w = fishPortionWeight(fishLunch.kind);
    return {
      portion: `${starchPortionLabel(dish)} + ${fishLunch.label} ${w} + овощи 150–250 г`,
      cooking: `${fishCookingLine(fishLunch, dish)} ${starchCookingLine(dish, gluten)}`,
      replacement: mealReplacement(dish, "lunch", ctx),
    };
  }

  const acc = proteinToAccusative(protein.phrase);
  return {
    portion: `${starchPortionLabel(dish)} + ${protein.source} 100–150 г + овощи 150–250 г`,
    cooking: `${poultryCookingLine(dish, acc)} ${starchCookingLine(dish, gluten)} ${vegetableSideCookingLine(dish)}`,
    replacement: mealReplacement(dish, "lunch", ctx),
  };
}

export function buildLunchFields(
  dish: string,
  ctx: MealFieldContext,
): MealFieldsResult {
  return finalizeMealFields(dish, buildLunchFieldsInner(dish, ctx), "lunch", ctx);
}

function buildDinnerFieldsInner(
  dish: string,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  const protein = inferProteinFromDish(dish);
  const d = dish.toLowerCase();

  if (protein.key === "молочное" && d.includes("творог") && !d.includes("запеканк")) {
    return {
      portion: "Творог 150–180 г + овощи или зелень 100–150 г",
      cooking:
        "Творог выложите на тарелку; добавьте ягоды из порции или немного корицы, если нравится.",
      replacement: mealReplacement(dish, "dinner", ctx),
    };
  }
  const dairyVegEarly = buildDairyVegetarianMealFields(dish, ctx, "dinner");
  if (dairyVegEarly) {
    return dairyVegEarly;
  }
  if (!eggRestricted(ctx) && d.includes("омлет")) {
    return ensureLactoseSafeFields(
      {
        portion: "2 яйца + салат 180–200 г",
        cooking: lactoseRestricted(ctx)
          ? "Омлет готовьте на сковороде под крышкой; салат заправьте маслом."
          : "Омлет готовьте на сковороде под крышкой; салат заправьте йогуртом.",
        replacement: mealReplacement(dish, "dinner", ctx),
      },
      dish,
      "dinner",
      ctx,
    );
  }
  if (!eggRestricted(ctx) && d.includes("салат") && d.includes("яйц")) {
    return ensureLactoseSafeFields(
      {
        portion: lactoseRestricted(ctx)
          ? "Салат 250 г: яйцо 1–2 шт. + овощи"
          : "Салат 250 г: яйцо 1–2 шт. + сыр 30 г + овощи",
        cooking: lactoseRestricted(ctx)
          ? "Яйцо отварите, овощи нарежьте и смешайте."
          : "Яйцо отварите, овощи нарежьте, сыр натрите или нарежьте ломтиками, смешайте.",
        replacement: mealReplacement(dish, "dinner", ctx),
      },
      dish,
      "dinner",
      ctx,
    );
  }
  const fishDinner = inferFishPortionSpec(dish);
  if (fishDinner || protein.key === "рыба") {
    if (fishDinner) {
      const w = fishPortionWeight(fishDinner.kind);
      if (d.includes("котлет") || d.includes("тефтел")) {
        return {
          portion: `Котлеты из ${fishDinner.label} ${w} + овощи 150–200 г`,
          cooking: `Котлеты из ${fishDinner.accusative} запеките в духовке до лёгкой корочки; овощи подайте тёплыми с укропом.`,
          replacement: mealReplacement(dish, "dinner", ctx),
        };
      }
      return {
        portion: `${fishDinner.label} ${w} + овощи 150–200 г`,
        cooking: fishCookingLine(fishDinner, dish),
        replacement: mealReplacement(dish, "dinner", ctx),
      };
    }
    if (protein.key === "рыба") {
      return {
        portion: `${protein.source} 120–150 г + овощи 150–200 г`,
        cooking:
          "Рыбу запеките или потушите до мягкости, добавьте зелень и немного лимонного сока по вкусу.",
        replacement: mealReplacement(dish, "dinner", ctx),
      };
    }
  }
  if (protein.key === "бобовые") {
    return {
      portion: "Фасоль или чечевица 150–180 г + овощи 150 г",
      cooking: legumesCookingLine(dish),
      replacement: mealReplacement(dish, "dinner", ctx),
    };
  }

  const vegGrain = buildVegetarianGrainMealFields(dish, ctx, "dinner");
  if (vegGrain) {
    return vegGrain;
  }

  if (!dishMentionsMeatOrFish(dish) && protein.key === "смешанное") {
    return {
      portion: "Овощи или крупа 200–250 г + зелень",
      cooking:
        "Овощи потушите под крышкой или запеките; зелень и лимонный сок — перед подачей.",
      replacement: mealReplacement(dish, "dinner", ctx),
    };
  }

  const acc = proteinToAccusative(protein.phrase);
  return {
    portion: `${protein.source} 100–130 г + овощи 150–250 г`,
    cooking: `${poultryCookingLine(dish, acc)} ${vegetableSideCookingLine(dish)}`,
    replacement: mealReplacement(dish, "dinner", ctx),
  };
}

export function buildDinnerFields(
  dish: string,
  ctx: MealFieldContext,
): MealFieldsResult {
  return finalizeMealFields(dish, buildDinnerFieldsInner(dish, ctx), "dinner", ctx);
}

function buildSnackFieldsInner(
  dish: string,
  ctx: MealFieldContext,
): Pick<ProgramMeal, "portion" | "cooking" | "replacement"> {
  const d = dish.toLowerCase();

  if (isNutsAndDriedFruitSnack(d)) {
    return {
      portion: "Орехи/семечки 15–20 г + сухофрукты 20–30 г",
      cooking: "Орехи и сухофрукты выложите порционно на тарелку.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("фруктов") && d.includes("салат")) {
    return {
      portion: "Фрукты 150–200 г",
      cooking: "Фрукты нарежьте и смешайте в миске.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("фрукт") && d.includes("семеч") && !d.includes("хлебц")) {
    return {
      portion: "Фрукты 150 г + семечки 1 ч. л.",
      cooking: "Фрукты нарежьте; семечки посыпьте сверху.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("слив") && d.includes("семеч")) {
    return {
      portion: "Сливы 100–150 г + семечки 1 ст. л.",
      cooking: "Сливы нарежьте пополам; семечки подайте отдельно.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("банан") && d.includes("орех")) {
    return {
      portion: "Банан 1 шт. + орехи 15–20 г",
      cooking: "Банан нарежьте; орехи — горстью рядом.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }

  if (d.includes("сырник")) {
    return {
      portion: "2–3 мини-сырника",
      cooking: "Сырники запеките в духовке 180 °C 15–18 минут.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("творог")) {
    return {
      portion: "Творог 100–150 г + ягоды",
      cooking: "Смешайте творог с ягодами в миске.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("йогурт")) {
    return {
      portion: "Йогурт 150–200 г + фрукт",
      cooking: "Нарежьте фрукт, подайте с йогуртом.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("кефир") || d.includes("ряженк")) {
    return {
      portion: "Кефир или ряженка 200–250 мл",
      cooking: "Подайте охлаждённым; при желании добавьте фрукт.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("сыр") && d.includes("томат")) {
    return {
      portion: "Сыр 30–40 г + помидоры черри 100 г",
      cooking: "Нарежьте сыр и помидоры, выложите на тарелку.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("тост") && d.includes("сыр")) {
    return {
      portion: "1 тост + сыр 30 г",
      cooking: "Подсушите тост, положите сыр ломтиками, при желании добавьте помидор.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("овощ") && d.includes("сыр")) {
    return {
      portion: "Овощи 150 г + сыр 30–40 г",
      cooking: "Нарежьте овощи, сыр подайте ломтиками.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (!eggRestricted(ctx) && d.includes("яйц") && d.includes("огур")) {
    return {
      portion: "1–2 яйца вкрутую + огурец 1 шт.",
      cooking: "Яйцо отварите 8–9 минут; огурец нарежьте кружочками.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (!eggRestricted(ctx) && d.includes("яйц")) {
    return {
      portion: "1–2 яйца + овощи 80–100 г",
      cooking: "Яйцо отварите 8–9 минут; овощи нарежьте.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("авокадо") && (d.includes("тост") || d.includes("хлебц"))) {
    const isToast = d.includes("тост");
    return {
      portion: isToast
        ? "1–2 ломтика хлеба + авокадо 40–60 г + огурец 80 г"
        : "2–3 рисовых хлебца + авокадо 40–60 г + огурец 80 г",
      cooking: isToast
        ? "Подсушите тост, разомните авокадо вилкой и выложите на хлеб, огурец нарежьте."
        : "Подсушите хлебцы, разомните авокадо и выложите на хлебцы, огурец нарежьте сбоку.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("хлебц") && !d.includes("фрукт")) {
    const hasAvocado = d.includes("авокадо");
    const hasTurkey = d.includes("индейк");
    const lactose = lactoseRestricted(ctx);
    const gluten = glutenRestricted(ctx);
    const crispBase = gluten
      ? "2–3 безглютеновых рисовых хлебца"
      : "2–3 рисовых хлебца";
    const eggFreeFillings = eggRestricted(ctx)
      ? `${crispBase} + начинка (авокадо, индейка, хумус или овощи)`
      : lactose || gluten
        ? `${crispBase} + начинка (авокадо, индейка, яйцо или овощи)`
        : `${crispBase} + начинка по блюду (авокадо, сыр или индейка)`;
    return ensureLactoseSafeFields(
      {
        portion: eggFreeFillings,
        cooking: hasAvocado
          ? "Подсушите хлебцы, разомните авокадо и выложите на хлебцы, овощи нарежьте сбоку."
          : hasTurkey
            ? "Подсушите хлебцы, выложите нарезанную индейку и свежие овощи."
            : eggRestricted(ctx) || lactose || gluten
              ? "Подсушите хлебцы, добавьте авокадо, индейку, хумус или овощи."
              : "Подсушите хлебцы, добавьте авокадо, сыр или индейку и овощи.",
        replacement: mealReplacement(dish, "snack", ctx),
      },
      dish,
      "snack",
      ctx,
    );
  }
  if (d.includes("семечк") && !d.includes("слив")) {
    return {
      portion: "Фрукт 1 шт. + семечки 1 ст. л.",
      cooking: "Фрукт нарежьте; семечки посыпьте сверху.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("огурец") && d.includes("сыр")) {
    return {
      portion: "Огурец 1 шт. + сыр 30–40 г",
      cooking: "Огурец нарежьте, сыр — ломтиками.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("яблок") && d.includes("сыр")) {
    return {
      portion: "Яблоко 1 шт. + сыр 30 г",
      cooking: "Яблоко нарежьте дольками, сыр подайте отдельно.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("фрукт") && d.includes("хлебц")) {
    return {
      portion: "Фрукт 1 шт. + 2 рисовых хлебца",
      cooking: "Фрукт нарежьте; хлебцы подсушите при желании.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("фрукт") && d.includes("хумус")) {
    return {
      portion: "Фрукт 1 шт. + хумус 2 ст. л.",
      cooking: "Фрукт нарежьте; хумус выложите в пиалу.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("сыр") && d.includes("хлебц")) {
    return {
      portion: "Сыр 30–40 г + 2 рисовых хлебца",
      cooking: "Сыр нарежьте, выложите на хлебцы.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("смузи")) {
    return {
      portion: "Смузи 200–250 мл",
      cooking: "Смешайте ингредиенты блендером до однородности.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("орех") || d.includes("арахис")) {
    return {
      portion: "Фрукт 1 шт. + орехи или паста 15–20 г",
      cooking: "Фрукт нарежьте; орехи или пасту — тонким слоем.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("хумус")) {
    return {
      portion: "Хумус 2–3 ст. л. + овощные палочки",
      cooking: "Выложите хумус в пиалу, овощи нарежьте соломкой.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("банан") && d.includes("кефир")) {
    return {
      portion: "Банан 1 шт. + кефир 200 мл",
      cooking: "Банан можно нарезать в кефир или есть отдельно.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("овощн") && d.includes("салат") && d.includes("масл")) {
    return {
      portion: "Овощи 150–200 г + масло 1 ч. л.",
      cooking: "Овощи нарежьте, слегка заправьте маслом и перемешайте перед подачей.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }
  if (d.includes("гуакамоле")) {
    return {
      portion: "Гуакамоле 3–4 ст. л. + овощные палочки 120–150 г",
      cooking: "Гуакамоле выложите в пиалу, овощи нарежьте соломкой для макания.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }

  if (d.includes("индейк") || d.includes("курин")) {
    return {
      portion: "Птица 50–70 г + овощи 80 г",
      cooking: "Нарежьте птицу и овощи, подайте холодными или слегка тёплыми.",
      replacement: mealReplacement(dish, "snack", ctx),
    };
  }

  return {
    portion: "Перекус 100–150 г по составу блюда",
    cooking: "Соберите перекус из продуктов, указанных в названии блюда.",
    replacement: mealReplacement(dish, "snack", ctx),
  };
}

export function buildSnackFields(
  dish: string,
  ctx: MealFieldContext,
): MealFieldsResult {
  return finalizeMealFields(dish, buildSnackFieldsInner(dish, ctx), "snack", ctx);
}

export function buildMealFieldsConsistent(
  mealType: ProgramMeal["type"],
  dish: string,
  ctx: MealFieldContext,
): MealFieldsResult {
  switch (mealType) {
    case "breakfast":
      return buildBreakfastFields(dish, ctx);
    case "lunch":
      return buildLunchFields(dish, ctx);
    case "dinner":
      return buildDinnerFields(dish, ctx);
    case "snack":
    case "secondSnack":
      return buildSnackFields(dish, ctx);
    default:
      return buildSnackFields(dish, ctx);
  }
}
