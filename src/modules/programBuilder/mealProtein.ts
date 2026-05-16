/** Ключ основного белка/белковой группы для разнообразия и согласованности. */
export type ProteinKey =
  | "курица"
  | "индейка"
  | "рыба"
  | "яйцо"
  | "говядина"
  | "кролик"
  | "молочное"
  | "бобовые"
  | "птица"
  | "смешанное";

export type InferredProtein = {
  key: ProteinKey;
  /** Именительный для порции: «курица 100-150 г». */
  source: string;
  /** Для фраз «отварите …». */
  phrase: string;
};

const PROTEIN_ACCUSATIVE: Record<string, string> = {
  курица: "курицу",
  индейка: "индейку",
  говядина: "говядину",
  рыба: "рыбу",
  яйцо: "яйца",
  кролик: "кролика",
  птица: "птицу",
  творог: "творог",
  йогурт: "йогурт",
  сыр: "сыр",
  кефир: "кефир",
  фасоль: "фасоль",
  чечевица: "чечевицу",
};

export function proteinToAccusative(nominative: string): string {
  const key = nominative.toLowerCase();
  return PROTEIN_ACCUSATIVE[key] ?? nominative;
}

/**
 * Определяет основной белок/группу по названию блюда.
 * Приоритет — явные маркеры в dish, не внешний ротатор.
 */
export function inferProteinFromDish(dish: string): InferredProtein {
  const d = dish.toLowerCase();

  if (
    d.includes("творог") ||
    d.includes("йогурт") ||
    d.includes("сырник") ||
    d.includes("запеканк") && d.includes("творож") ||
    d.includes("кефир") ||
    d.includes("ряженк") ||
    d.includes("сыр ") ||
    d.startsWith("сыр ") ||
    d.includes(" сыр") ||
    d.includes("греческий йогурт")
  ) {
    const source = d.includes("йогурт")
      ? "йогурт"
      : d.includes("кефир") || d.includes("ряженк")
        ? "кефир"
        : d.includes("сыр") && !d.includes("творог")
          ? "сыр"
          : "творог";
    return { key: "молочное", source, phrase: source };
  }

  if (
    d.includes("фасол") ||
    d.includes("чечевиц") ||
    d.includes("нут ") ||
    d.includes("бобов") ||
    d.includes("горохов")
  ) {
    return { key: "бобовые", source: "фасоль", phrase: "фасоль" };
  }

  if (d.includes("индейк")) {
    return { key: "индейка", source: "индейка", phrase: "индейка" };
  }

  if (d.includes("курин") || (d.includes("котлет") && !d.includes("рыб"))) {
    return { key: "курица", source: "курица", phrase: "курица" };
  }

  if (
    d.includes("птиц") ||
    (d.includes("котлет") && !d.includes("рыб"))
  ) {
    return { key: "птица", source: "птица", phrase: "птица" };
  }

  if (
    d.includes("рыб") ||
    d.includes("лосос") ||
    d.includes("треск") ||
    d.includes("семг") ||
    d.includes("минтай") ||
    d.includes("форел")
  ) {
    return { key: "рыба", source: "рыба", phrase: "рыба" };
  }

  if (d.includes("говядин") || d.includes("телят")) {
    return { key: "говядина", source: "говядина", phrase: "говядина" };
  }

  if (d.includes("кролик")) {
    return { key: "кролик", source: "кролик", phrase: "кролик" };
  }

  if (
    d.includes("яйц") ||
    d.includes("омлет") ||
    d.includes("яичниц")
  ) {
    return { key: "яйцо", source: "яйцо", phrase: "яйцо" };
  }

  return { key: "смешанное", source: "курица", phrase: "курица" };
}

/** Маркеры белка в тексте (порция / готовка / замена). */
const PROTEIN_MARKERS: Record<ProteinKey, string[]> = {
  курица: ["курин", "куриц"],
  индейка: ["индейк"],
  рыба: ["рыб", "лосос", "треск", "семг", "минтай"],
  яйцо: ["яйц", "омлет", "яичниц"],
  говядина: ["говядин", "телят"],
  кролик: ["кролик"],
  молочное: ["творог", "йогурт", "сыр", "кефир", "ряженк", "сырник"],
  бобовые: ["фасол", "чечевиц", "нут", "бобов"],
  птица: ["птиц"],
  смешанное: [],
};

function textMentionsProtein(text: string, key: ProteinKey): boolean {
  const t = text.toLowerCase();
  const markers = PROTEIN_MARKERS[key];
  return markers.some((m) => t.includes(m));
}

function textMentionsConflictingProtein(
  text: string,
  dishKey: ProteinKey,
): boolean {
  const t = text.toLowerCase();
  const conflicts: Array<{ dish: ProteinKey; markers: string[] }> = [
    { dish: "курица", markers: PROTEIN_MARKERS.курица },
    { dish: "индейка", markers: PROTEIN_MARKERS.индейка },
    { dish: "рыба", markers: PROTEIN_MARKERS.рыба },
    { dish: "яйцо", markers: PROTEIN_MARKERS.яйцо },
    { dish: "молочное", markers: PROTEIN_MARKERS.молочное },
  ];

  for (const { dish, markers } of conflicts) {
    if (dish === dishKey) continue;
    if (markers.some((m) => t.includes(m))) return true;
  }
  return false;
}

/** dish содержит маркер своего белка. */
export function dishDeclaresProtein(dish: string, key: ProteinKey): boolean {
  if (key === "смешанное" || key === "бобовые" || key === "птица") {
    return inferProteinFromDish(dish).key === key;
  }
  return textMentionsProtein(dish, key);
}

/**
 * Порция/готовка/замена не должны подставлять «чужой» основной белок.
 * Замена с «или» / альтернативой допускается только в replacement.
 */
export function mealFieldsConsistentWithDish(
  dish: string,
  portion: string,
  cooking: string,
  replacement: string,
  field: "portion" | "cooking" | "replacement",
): boolean {
  const inferred = inferProteinFromDish(dish);
  const key = inferred.key;

  if (key === "смешанное") {
    return true;
  }

  if (!dishDeclaresProtein(dish, key)) {
    return true;
  }

  const checkPortionCooking = field !== "replacement";
  const text = field === "portion" ? portion : field === "cooking" ? cooking : replacement;

  if (checkPortionCooking && textMentionsConflictingProtein(text, key)) {
    return false;
  }

  if (key === "молочное") {
    const genericBreakfast =
      /120[-–]180\s*г\s*основа/i.test(portion) &&
      field === "portion";
    if (genericBreakfast) return false;
  }

  if (field === "replacement" && key !== "молочное") {
    const t = replacement.toLowerCase();
    if (
      key === "курица" &&
      (t.includes("рыб") || t.includes("яйц")) &&
      !t.includes("индейк") &&
      !t.includes("курин")
    ) {
      return false;
    }
    if (key === "рыба" && t.includes("курин") && !t.includes("рыб")) {
      return false;
    }
  }

  return true;
}
