import { mk } from "./menuCatalogData";

/** Универсальные блюда, когда после фильтрации остаётся мало вариантов. */
export const FALLBACK_BREAKFAST = [
  mk("Овсянка на воде с фруктом", "fallback-овсянка-фрукт", {
    proteinType: "none",
    carbType: "oats",
    mealFamily: "porridge",
    contains: [],
    breakfastType: "porridge",
  }),
  mk("Гречневая каша с овощами", "fallback-гречка-овощи", {
    proteinType: "none",
    carbType: "buckwheat",
    mealFamily: "porridge",
    contains: [],
    breakfastType: "porridge",
  }),
  mk("Овощи с хумусом", "fallback-овощи-хумус", {
    proteinType: "legumes",
    carbType: "none",
    mealFamily: "bowl",
    contains: ["legumes"],
    breakfastType: "bowl",
  }),
];

export const FALLBACK_LUNCH = [
  mk("Гречка с запечённой курицей и овощами", "fallback-гречка-курица", {
    proteinType: "chicken",
    carbType: "buckwheat",
    mealFamily: "bowl",
    contains: ["meat"],
    starchKey: "гречка",
  }),
  mk("Рис с фасолью и овощами", "fallback-рис-фасоль", {
    proteinType: "legumes",
    carbType: "rice",
    mealFamily: "bowl",
    contains: ["legumes"],
    starchKey: "рис",
  }),
  mk("Картофель с индейкой и салатом", "fallback-картофель-индейка", {
    proteinType: "turkey",
    carbType: "potato",
    mealFamily: "stew",
    contains: ["meat"],
    starchKey: "картофель",
  }),
];

export const FALLBACK_DINNER = [
  mk("Курица с тушёными овощами", "fallback-ужин-курица", {
    proteinType: "chicken",
    carbType: "none",
    mealFamily: "stew",
    contains: ["meat"],
  }),
  mk("Индейка тушёная с овощами", "fallback-ужин-индейка", {
    proteinType: "turkey",
    carbType: "none",
    mealFamily: "stew",
    contains: ["meat"],
  }),
  mk("Овощное рагу с фасолью", "fallback-ужин-фасоль", {
    proteinType: "legumes",
    carbType: "none",
    mealFamily: "stew",
    contains: ["legumes"],
  }),
];

export const FALLBACK_SNACK = [
  mk("Овощи с хумусом", "fallback-перекус-хумус", {
    proteinType: "legumes",
    carbType: "none",
    mealFamily: "snack",
    contains: ["legumes"],
  }),
  mk("Фрукт и рисовые хлебцы", "fallback-перекус-фрукт-хлебцы", {
    proteinType: "none",
    carbType: "rice",
    mealFamily: "snack",
    contains: [],
  }),
  mk("Яйцо вкрутую и огурец", "fallback-перекус-яйцо", {
    proteinType: "egg",
    carbType: "none",
    mealFamily: "snack",
    contains: ["egg"],
    containsEgg: true,
  }),
];
