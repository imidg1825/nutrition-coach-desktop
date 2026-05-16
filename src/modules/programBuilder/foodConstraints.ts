import type { ClientQuestionnaire } from "../questionnaire";

import type { ContainsTag } from "./catalogTypes";

import {

  RIVER_FISH_MARKERS,

  SEA_FISH_MARKERS,

  SEAFOOD_MARKERS,

} from "./catalogTypes";

import { enrichDish } from "./catalogMeta";

import type { CatalogDish } from "./catalogTypes";

import type { MealSlot } from "./catalogMeta";



export type ConstraintFlag =

  | "lactose"

  | "gluten"

  | "egg"

  | "nuts"

  | "fish"

  | "seaFish"

  | "riverFish"

  | "seafood"

  | "meat";



/** Ограничения пользователя из анкеты — для фильтрации каталога и замен. */

export type UserFoodConstraints = {

  lactose: boolean;

  gluten: boolean;

  egg: boolean;

  nuts: boolean;

  /** Любая рыба (морская + речная). */

  fish: boolean;

  /** Только морская рыба. */

  seaFish: boolean;

  /** Только речная рыба. */

  riverFish: boolean;

  /** Морепродукты / ракообразные / моллюски (не рыба). */

  seafood: boolean;

  meat: boolean;

  /** Дополнительные слова из «не ем» / аллергии. */

  excludedPhrases: string[];

};



/** Слова, запрещённые при непереносимости лактозы (dish / portion / cooking / replacement). */

export const LACTOSE_DAIRY_MARKERS = [

  "творог",

  "йогурт",

  "кефир",

  "ряженк",

  "сырник",

  "творожн",

  "молок",

  "сметан",

  "сливк",

  "брынз",

  "моцарел",

  "простокваш",

] as const;



const DAIRY_WORDS = [...LACTOSE_DAIRY_MARKERS];



function textContainsCheese(text: string): boolean {

  const t = text.toLowerCase();

  if (t.includes("сырник")) {

    return false;

  }

  return t.includes("сыр");

}



/** Глютен всегда запрещён при gluten intolerance (без пометки «безглютен»). */

export const GLUTEN_MARKERS_ALWAYS = [

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



/** Допустимо только с явной пометкой «безглютеновый/ая/ое» перед словом. */

export const GLUTEN_MARKERS_UNLESS_LABELED = [

  "хлебц",

  "хлеб",

  "тост",

  "печень",

  "овсян",

  "блин",

] as const;



export const HUMMUS_SEMANTIC_KEY = "hummus_all";

export const MAX_HUMMUS_PER_PROGRAM = 2;



let programHummusUses = 0;



export function resetProgramHummusUses(): void {

  programHummusUses = 0;

}



export function getProgramHummusUses(): number {

  return programHummusUses;

}



export function isHummusProgramLimitReached(): boolean {

  return programHummusUses >= MAX_HUMMUS_PER_PROGRAM;

}



export function isHummusText(text: string): boolean {

  return text.toLowerCase().includes("хумус");

}



export function registerHummusUse(text: string): void {

  if (isHummusText(text)) {

    programHummusUses += 1;

  }

}



function hasGlutenFreeLabelBefore(text: string, wordIndex: number): boolean {

  const before = text.slice(Math.max(0, wordIndex - 28), wordIndex);

  return before.includes("безглютен") || before.includes("без глютен");

}



/** Обычная овсянка без пометки «безглютен». */

export function textHasPlainOats(text: string): boolean {

  const t = text.toLowerCase();

  if (!t.includes("овсян")) {

    return false;

  }

  return !t.includes("безглютен") && !t.includes("без глютен");

}



/** Хлеб с глютеном (цельнозерновой или без пометки «безглютен»). */

export function textHasGlutenBread(text: string): boolean {

  const t = text.toLowerCase();

  if (t.includes("цельнозерн")) {

    return true;

  }

  if (!t.includes("хлеб") && !t.includes("тост") && !t.includes("хлебц")) {

    return false;

  }

  return !t.includes("безглютен") && !t.includes("без глютен");

}



/**

 * Подписи для meal при gluten: овсянка → безглютеновая, убрать цельнозерновой хлеб.

 */

export function normalizeMealTextForConstraints(

  text: string,

  constraints: UserFoodConstraints,

): string {

  if (!constraints.gluten) {

    return text;

  }

  let t = text;



  t = t.replace(

    /кусочек\s+цельнозернового\s+хлеба/gi,

    "овощи или зелень",

  );

  t = t.replace(

    /ломтика\s+цельнозернового\s+хлеба/gi,

    "безглютенового хлебца",

  );

  t = t.replace(/цельнозернового\s+хлеба/gi, "безглютенового хлебца");

  t = t.replace(/цельнозерновой\s+хлеб/gi, "безглютеновый хлеб");

  t = t.replace(/цельнозерновом\s+хлебе/gi, "безглютеновом хлебце");



  if (textHasPlainOats(t)) {

    t = t.replace(/\bленивая\s+овсянка/gi, "ленивая безглютеновая овсянка");

    t = t.replace(/\bЛенивая\s+овсянка/g, "Ленивая безглютеновая овсянка");

    t = t.replace(/\bовсяные\b/gi, "безглютеновые овсяные");

    t = t.replace(/\bОвсяные\b/g, "Безглютеновые овсяные");

    t = t.replace(/\bовсяная\b/gi, "безглютеновая овсяная");

    t = t.replace(/\bОвсяная\b/g, "Безглютеновая овсяная");

    t = t.replace(/\bовсянку\b/gi, "безглютеновую овсянку");

    t = t.replace(/\bОвсянку\b/g, "Безглютеновую овсянку");

    t = t.replace(/\bовсянка\b/gi, "безглютеновая овсянка");

    t = t.replace(/\bОвсянка\b/g, "Безглютеновая овсянка");

    t = t.replace(/\bовсяноблин\b/gi, "безглютеновый овсяноблин");

    t = t.replace(/\bОвсяноблин\b/g, "Безглютеновый овсяноблин");

    t = t.replace(/,\s*овсянка/gi, ", безглютеновая овсянка");

    t = t.replace(/овсянка,/gi, "безглютеновая овсянка,");

    t = t.replace(/овсянка\//gi, "безглютеновая овсянка/");

    t = t.replace(/овсянка\s+и/gi, "безглютеновая овсянка и");

    t = t.replace(/и\s+овсянка/gi, "и безглютеновая овсянка");

  }



  return t;

}



/** Текст содержит глютен (кроме явно безглютеновых продуктов). */

export function textViolatesGluten(text: string): boolean {

  const t = text.toLowerCase();

  for (const w of GLUTEN_MARKERS_ALWAYS) {

    if (t.includes(w)) {

      return true;

    }

  }

  for (const w of GLUTEN_MARKERS_UNLESS_LABELED) {

    let idx = 0;

    while ((idx = t.indexOf(w, idx)) >= 0) {

      if (!hasGlutenFreeLabelBefore(t, idx)) {

        return true;

      }

      idx += w.length;

    }

  }

  return false;

}



/** Маркеры яйца — запрещены при constraints.egg во всех полях meal. */

export const EGG_MARKERS = [

  "яйц",

  "омлет",

  "яичниц",

  "глазунь",

  "скрэмбл",

  "пашот",

  "яичн",

] as const;



const EGG_WORDS = [...EGG_MARKERS];



/** Текст содержит яйцо/омлет (не сырники). */

export function textContainsEgg(text: string): boolean {

  const t = text.toLowerCase();

  if (t.includes("сырник")) {

    return false;

  }

  return textMatchesAny(t, EGG_WORDS);

}



export function textViolatesEgg(text: string): boolean {

  return textContainsEgg(text);

}



const NUT_WORDS = ["орех", "арахис", "миндал", "кешью", "фундук", "семеч"];



const MEAT_WORDS = [

  "курин",

  "куриц",

  "индейк",

  "говядин",

  "телят",

  "кролик",

  "свинин",

  "бекон",

  "колбас",

  "фарш",

  "птиц",

  "мяс",

];



function includesWord(text: string, word: string): boolean {

  return text.toLowerCase().includes(word.toLowerCase());

}



function textMatchesAny(text: string, words: readonly string[]): boolean {

  const t = text.toLowerCase();

  return words.some((w) => t.includes(w));

}



const RU_NON_LETTER_BEFORE_FISH = "(^|[^а-яё])";

const RU_AFTER_FISH_TOKEN = "(?=[а-яё]|$|[^а-яё])";



function escapeRegExp(s: string): string {

  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

}



/**
 * Маркер вида рыбы в тексте без ложных вхождений внутри слов
 * (например «сом» в «рисом», «соусом», «вкусом»).
 * Длинные маркеры оставляем как includes — риск коллизий ниже.
 */

function textMatchesFishSpeciesMarker(text: string, marker: string): boolean {

  const t = text.toLowerCase();

  const m = marker.toLowerCase();

  if (m.length >= 5) {

    return t.includes(m);

  }

  const escaped = escapeRegExp(m);

  return new RegExp(

    `${RU_NON_LETTER_BEFORE_FISH}${escaped}${RU_AFTER_FISH_TOKEN}`,

    "i",

  ).test(text);

}



function textMatchesAnyFishSpeciesMarker(

  text: string,

  markers: readonly string[],

): boolean {

  return markers.some((marker) => textMatchesFishSpeciesMarker(text, marker));

}



function textContainsCrayfish(t: string): boolean {

  return /\bраки\b/.test(t) || (t.includes("рак") && t.includes("мореп"));

}



/** Морепродукты (не рыба). */

export function textContainsSeafood(text: string): boolean {

  const t = text.toLowerCase();

  if (textMatchesAny(t, SEAFOOD_MARKERS)) {

    return true;

  }

  return textContainsCrayfish(t);

}



/** Морская рыба (не речная, не морепродукты). */

export function textContainsSeaFish(text: string): boolean {

  const t = text.toLowerCase();

  if (textContainsSeafood(t)) {

    return false;

  }

  if (textMatchesAnyFishSpeciesMarker(text, SEA_FISH_MARKERS)) {

    return true;

  }

  if (t.includes("морск") && t.includes("рыб")) {

    return true;

  }

  return false;

}



/** Речная рыба. */

export function textContainsRiverFish(text: string): boolean {

  const t = text.toLowerCase();

  if (textContainsSeafood(t)) {

    return false;

  }

  if (textMatchesAnyFishSpeciesMarker(text, RIVER_FISH_MARKERS)) {

    return true;

  }

  if (t.includes("речн") && t.includes("рыб")) {

    return true;

  }

  return false;

}



/** Обобщённое «рыба» без вида (не морепродукты). */

export function textContainsGenericFish(text: string): boolean {

  const t = text.toLowerCase();

  if (textContainsSeafood(t)) {

    return false;

  }

  if (textContainsSeaFish(text) || textContainsRiverFish(text)) {

    return false;

  }

  return t.includes("рыб");

}



/** Любая рыба: морская, речная или обобщённая. */

export function textContainsAnyFish(text: string): boolean {

  return (

    textContainsSeaFish(text) ||

    textContainsRiverFish(text) ||

    textContainsGenericFish(text)

  );

}



/** Текст нарушает хотя бы одно активное рыбное ограничение. */

export function textViolatesFishConstraints(

  text: string,

  constraints: UserFoodConstraints,

): boolean {

  if (constraints.fish && textContainsAnyFish(text)) {

    return true;

  }

  if (constraints.seaFish && textContainsSeaFish(text)) {

    return true;

  }

  if (constraints.riverFish && textContainsRiverFish(text)) {

    return true;

  }

  if (constraints.seafood && textContainsSeafood(text)) {

    return true;

  }

  return false;

}



function isFishRelatedTag(tag: ContainsTag): boolean {

  return tag === "fish" || tag === "seaFish" || tag === "riverFish";

}



function dishTagsViolateFishConstraints(

  tags: ContainsTag[],

  constraints: UserFoodConstraints,

): boolean {

  if (constraints.fish) {

    if (tags.some(isFishRelatedTag)) {

      return true;

    }

  }

  if (constraints.seaFish && tags.includes("seaFish")) {

    return true;

  }

  if (constraints.riverFish && tags.includes("riverFish")) {

    return true;

  }

  if (constraints.seafood && tags.includes("seafood")) {

    return true;

  }

  return false;

}



/** Текст содержит обычные молочные продукты (не «безлактозные» аналоги). */

export function textViolatesLactose(text: string): boolean {

  const t = text.toLowerCase();

  if (t.includes("безлактоз")) {

    return false;

  }

  if (textMatchesAny(t, DAIRY_WORDS)) {

    return true;

  }

  if (textContainsCheese(t)) {

    return true;

  }

  if (t.includes("греческ") && t.includes("йогурт")) {

    return true;

  }

  if (

    t.includes("запеканк") &&

    (t.includes("творож") || t.includes("творог"))

  ) {

    return true;

  }

  return false;

}



export function textViolatesConstraint(

  text: string,

  flag: ConstraintFlag,

): boolean {

  switch (flag) {

    case "lactose":

      return textViolatesLactose(text);

    case "gluten":

      return textViolatesGluten(text);

    case "egg":

      return textViolatesEgg(text);

    case "fish":

      return textContainsAnyFish(text);

    case "seaFish":

      return textContainsSeaFish(text);

    case "riverFish":

      return textContainsRiverFish(text);

    case "seafood":

      return textContainsSeafood(text);

    case "nuts":

      return textMatchesAny(text, NUT_WORDS);

    case "meat":

      return textMatchesAny(text, MEAT_WORDS);

    default:

      return false;

  }

}



function containsTagViolates(

  tags: ContainsTag[],

  flag: ConstraintFlag,

): boolean {

  if (flag === "lactose" && tags.includes("dairy")) return true;

  if (flag === "gluten" && tags.includes("gluten")) return true;

  if (flag === "egg" && tags.includes("egg")) return true;

  if (flag === "fish") {

    return tags.some(isFishRelatedTag);

  }

  if (flag === "seaFish" && tags.includes("seaFish")) return true;

  if (flag === "riverFish" && tags.includes("riverFish")) return true;

  if (flag === "seafood" && tags.includes("seafood")) return true;

  if (flag === "nuts" && tags.includes("nuts")) return true;

  if (flag === "meat" && tags.includes("meat")) return true;

  return false;

}



function activeFlags(c: UserFoodConstraints): ConstraintFlag[] {

  const flags: ConstraintFlag[] = [];

  if (c.lactose) flags.push("lactose");

  if (c.gluten) flags.push("gluten");

  if (c.egg) flags.push("egg");

  if (c.nuts) flags.push("nuts");

  if (c.fish) flags.push("fish");

  if (c.seaFish) flags.push("seaFish");

  if (c.riverFish) flags.push("riverFish");

  if (c.seafood) flags.push("seafood");

  if (c.meat) flags.push("meat");

  return flags;

}



function parseFishRelatedConstraints(parts: {

  intolerances: string;

  allergies: string;

  restrictions: string;

  notEaten: string;

  blob: string;

}): Pick<UserFoodConstraints, "fish" | "seaFish" | "riverFish" | "seafood"> {

  const { intolerances, allergies, restrictions, notEaten, blob } = parts;

  const b = blob.toLowerCase();



  const seafood =

    includesWord(b, "морепродукт") ||

    includesWord(b, "кревет") ||

    includesWord(b, "миди") ||

    includesWord(b, "кальмар") ||

    includesWord(b, "осьминог") ||

    includesWord(b, "краб") ||

    includesWord(b, "моллюск") ||

    textContainsCrayfish(b);



  const riverFish =

    (includesWord(b, "речн") && includesWord(b, "рыб")) ||

    includesWord(b, "щук") ||

    includesWord(b, "судак") ||

    includesWord(b, "карп") ||

    includesWord(b, "окунь");



  const seaFish =

    (includesWord(b, "морск") && includesWord(b, "рыб")) ||

    includesWord(b, "лосос") ||

    includesWord(b, "тунец") ||

    includesWord(b, "треск") ||

    includesWord(b, "семг") ||

    includesWord(b, "минтай") ||

    includesWord(b, "хек") ||

    includesWord(b, "скумбр") ||

    includesWord(b, "форел");



  const fishGeneralPhrase =

    includesWord(b, "любая рыба") ||

    includesWord(b, "не ем рыбу") ||

    includesWord(b, "без рыбы") ||

    includesWord(b, "не ем рыб");



  const fishFromLists =

    includesWord(allergies, "рыб") ||

    includesWord(notEaten, "рыб") ||

    includesWord(intolerances, "рыб") ||

    includesWord(restrictions, "рыб");



  const fish =

    fishGeneralPhrase ||

    (fishFromLists && !seaFish && !riverFish && !seafood);



  return { fish, seaFish, riverFish, seafood };

}



/** Парсинг ограничений из анкеты. */

export function parseFoodConstraints(

  questionnaire: ClientQuestionnaire,

): UserFoodConstraints {

  const intolerances = questionnaire.medicalParticularities.intolerances;

  const allergies = questionnaire.medicalParticularities.foodAllergies;

  const restrictions = questionnaire.medicalParticularities.medicalDietaryRestrictions;

  const notEaten = questionnaire.foodAndProducts.foodsNotEaten;

  const blob = `${intolerances} ${allergies} ${restrictions} ${notEaten}`.toLowerCase();



  const lactose =

    includesWord(intolerances, "лактоз") ||

    includesWord(blob, "лактоз") ||

    includesWord(blob, "молок") ||

    includesWord(restrictions, "молоч");



  const gluten =

    includesWord(intolerances, "глютен") ||

    includesWord(allergies, "глютен") ||

    includesWord(blob, "глютен") ||

    includesWord(blob, "целиак");



  const egg =

    includesWord(allergies, "яйц") ||

    includesWord(blob, "яйц") ||

    includesWord(blob, "яиц") ||

    includesWord(blob, "омлет") ||

    includesWord(blob, "яичн");



  const nuts =

    includesWord(allergies, "орех") ||

    includesWord(allergies, "арахис") ||

    includesWord(intolerances, "орех") ||

    includesWord(blob, "орех") ||

    includesWord(blob, "арахис");



  const { fish, seaFish, riverFish, seafood } = parseFishRelatedConstraints({

    intolerances,

    allergies,

    restrictions,

    notEaten,

    blob,

  });



  const meat =

    includesWord(blob, "без мяс") ||

    includesWord(notEaten, "мяс") ||

    includesWord(notEaten, "куриц") ||

    includesWord(notEaten, "говядин") ||

    includesWord(restrictions, "без мяс");



  const excludedPhrases = notEaten

    .split(/[,;]+/)

    .map((s) => s.trim().toLowerCase())

    .filter((s) => s.length > 1);



  return {

    lactose,

    gluten,

    egg,

    nuts,

    fish,

    seaFish,

    riverFish,

    seafood,

    meat,

    excludedPhrases,

  };

}



/** Блюдо подходит под ограничения пользователя. */

export function isDishAllowedForUser(

  item: CatalogDish,

  slot: MealSlot,

  constraints: UserFoodConstraints,

): boolean {

  const enriched = enrichDish(item, slot);

  const textBlob = `${item.dish} ${item.diversityKey}`;

  const tags = enriched.contains ?? [];



  if (dishTagsViolateFishConstraints(tags, constraints)) {

    return false;

  }

  if (textViolatesFishConstraints(textBlob, constraints)) {

    return false;

  }

  if (

    constraints.fish &&

    enriched.proteinType === "fish" &&

    !tags.includes("seafood")

  ) {

    return false;

  }

  if (constraints.seaFish && enriched.proteinType === "fish" && tags.includes("seaFish")) {

    return false;

  }

  if (constraints.riverFish && enriched.proteinType === "fish" && tags.includes("riverFish")) {

    return false;

  }

  if (constraints.seafood && tags.includes("seafood")) {

    return false;

  }



  for (const flag of activeFlags(constraints)) {

    if (flag === "fish" || flag === "seaFish" || flag === "riverFish" || flag === "seafood") {

      continue;

    }

    if (containsTagViolates(tags, flag)) {

      return false;

    }

    if (flag === "lactose" && enriched.proteinType === "dairy") {

      return false;

    }

    if (flag === "egg" && enriched.proteinType === "egg") {

      return false;

    }

    if (flag === "meat") {

      const meatTypes = ["chicken", "turkey", "beef", "rabbit"] as const;

      if (meatTypes.includes(enriched.proteinType as typeof meatTypes[number])) {

        return false;

      }

    }

    if (textViolatesConstraint(textBlob, flag)) {

      return false;

    }

  }



  for (const phrase of constraints.excludedPhrases) {

    if (phrase.length > 2 && textBlob.toLowerCase().includes(phrase)) {

      return false;

    }

  }



  return true;

}



/** Проверка произвольного текста полей meal на запрещённые продукты. */

export function mealTextAllowedForUser(

  text: string,

  constraints: UserFoodConstraints,

): boolean {

  if (textViolatesFishConstraints(text, constraints)) {

    return false;

  }

  for (const flag of activeFlags(constraints)) {

    if (flag === "fish" || flag === "seaFish" || flag === "riverFish" || flag === "seafood") {

      continue;

    }

    if (textViolatesConstraint(text, flag)) {

      return false;

    }

  }

  for (const phrase of constraints.excludedPhrases) {

    if (phrase.length > 2 && text.toLowerCase().includes(phrase)) {

      return false;

    }

  }

  return true;

}


