import caloriesDb from "../../data/calories-db.json";

export type CalorieEstimateConfidence = "low" | "medium" | "high";

export type CalorieEstimateSource = "online" | "offline";

export type CalorieEstimateResult = {
  caloriesMin: number;
  caloriesMax: number;
  foundProducts: string[];
  confidence: CalorieEstimateConfidence;
  source: CalorieEstimateSource;
};

type DbEntry = { name: string; kcal: number };

const PORTION_MIN_G = 150;
const PORTION_MAX_G = 250;

const OFF_SEARCH_URL =
  "https://world.openfoodfacts.org/cgi/search.pl";

/** Англоязычные запросы к Open Food Facts для русских позиций из calories-db. */
const onlineSearchAliases: Record<string, string> = {
  гречка: "buckwheat",
  рис: "rice",
  овсянка: "oatmeal",
  картофель: "potato",
  курица: "chicken",
  индейка: "turkey",
  говядина: "beef",
  свинина: "pork",
  рыба: "fish",
  лосось: "salmon",
  тунец: "tuna",
  яйцо: "egg",
  омлет: "omelette",
  творог: "cottage cheese",
  сыр: "cheese",
  молоко: "milk",
  йогурт: "yogurt",
  хлеб: "bread",
  макароны: "pasta",
  яблоко: "apple",
  банан: "banana",
  апельсин: "orange",
  овощи: "vegetables",
  салат: "salad",
  шоколад: "chocolate",
  печенье: "cookies",
  конфеты: "candy",
  суп: "soup",
};

function onlineSearchTerm(russianName: string): string {
  return onlineSearchAliases[russianName] ?? russianName;
}

const dbSorted: DbEntry[] = [...caloriesDb].sort(
  (a, b) => b.name.length - a.name.length,
);

function isWordChar(c: string): boolean {
  return /[a-zа-яёії]/i.test(c);
}

function extractGramsNear(
  text: string,
  wordStart: number,
  wordEnd: number,
): number | null {
  const before = text.slice(Math.max(0, wordStart - 55), wordStart);
  const mb = before.match(/(\d+)\s*(?:г|грамм|g)\s*$/i);
  if (mb) {
    const g = parseInt(mb[1], 10);
    if (g > 0 && g < 5000) return g;
  }
  const after = text.slice(wordEnd, Math.min(text.length, wordEnd + 55));
  const ma = after.match(/^\s*[,:.;]?\s*(\d+)\s*(?:г|грамм|g)\b/i);
  if (ma) {
    const g = parseInt(ma[1], 10);
    if (g > 0 && g < 5000) return g;
  }
  return null;
}

type Occurrence = {
  name: string;
  kcal: number;
  grams: number | null;
};

function parseOccurrences(lower: string): {
  occurrences: Occurrence[];
  seenOrder: string[];
} {
  const occurrences: Occurrence[] = [];
  const seenOrder: string[] = [];

  let i = 0;
  while (i < lower.length) {
    let matched: DbEntry | null = null;
    for (const entry of dbSorted) {
      const { name } = entry;
      if (!lower.startsWith(name, i)) continue;
      const before = i > 0 ? lower[i - 1] : " ";
      const after =
        i + name.length < lower.length ? lower[i + name.length] : " ";
      if (isWordChar(before) || isWordChar(after)) continue;
      matched = entry;
      break;
    }

    if (matched) {
      const start = i;
      const end = i + matched.name.length;
      const grams = extractGramsNear(lower, start, end);
      occurrences.push({
        name: matched.name,
        kcal: matched.kcal,
        grams,
      });
      if (!seenOrder.includes(matched.name)) {
        seenOrder.push(matched.name);
      }
      i = end;
    } else {
      i += 1;
    }
  }

  return { occurrences, seenOrder };
}

function aggregateOccurrences(
  occurrences: Occurrence[],
  seenOrder: string[],
): Omit<CalorieEstimateResult, "source"> {
  if (occurrences.length === 0) {
    return {
      caloriesMin: 0,
      caloriesMax: 0,
      foundProducts: [],
      confidence: "low",
    };
  }

  let sumMin = 0;
  let sumMax = 0;
  let explicit = 0;
  let defaulted = 0;

  for (const o of occurrences) {
    if (o.grams != null) {
      const c = (o.kcal * o.grams) / 100;
      const rounded = Math.round(c);
      sumMin += rounded;
      sumMax += rounded;
      explicit += 1;
    } else {
      sumMin += Math.round((o.kcal * PORTION_MIN_G) / 100);
      sumMax += Math.round((o.kcal * PORTION_MAX_G) / 100);
      defaulted += 1;
    }
  }

  let confidence: CalorieEstimateConfidence;
  if (explicit > 0 && defaulted === 0) {
    confidence = "high";
  } else if (explicit > 0 && defaulted > 0) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    caloriesMin: sumMin,
    caloriesMax: sumMax,
    foundProducts: seenOrder,
    confidence,
  };
}

function kcalFromProductNutriments(product: unknown): number | null {
  if (!product || typeof product !== "object") return null;
  const nutriments = (product as { nutriments?: unknown }).nutriments;
  if (!nutriments || typeof nutriments !== "object") return null;
  const n = nutriments as Record<string, unknown>;
  const raw = n["energy-kcal_100g"];
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return null;
}

async function fetchKcalPer100gForTerm(term: string): Promise<number | null> {
  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "true");
  url.searchParams.set("page_size", "10");
  url.searchParams.set("search_terms", term);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "nutrition-desktop-app/0.1 (calorie estimator; local; no bulk)",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return null;

  const data: unknown = await res.json();
  const products =
    data &&
    typeof data === "object" &&
    Array.isArray((data as { products?: unknown }).products)
      ? (data as { products: unknown[] }).products
      : [];

  for (const p of products) {
    const kcal = kcalFromProductNutriments(p);
    if (kcal != null) return kcal;
  }

  return null;
}

/**
 * Оценка по Open Food Facts (без API-ключа). При любой ошибке или отсутствии kcal — null.
 */
export async function estimateCaloriesOnline(
  text: string,
): Promise<CalorieEstimateResult | null> {
  try {
    const lower = text.toLowerCase().trim();
    if (!lower) return null;

    const { occurrences, seenOrder } = parseOccurrences(lower);
    if (occurrences.length === 0) return null;

    const kcalByName = new Map<string, number>();
    for (const name of seenOrder) {
      const k = await fetchKcalPer100gForTerm(onlineSearchTerm(name));
      if (k == null) return null;
      kcalByName.set(name, k);
    }

    const resolved: Occurrence[] = occurrences.map((o) => ({
      name: o.name,
      kcal: kcalByName.get(o.name) ?? o.kcal,
      grams: o.grams,
    }));

    return {
      ...aggregateOccurrences(resolved, seenOrder),
      source: "online",
    };
  } catch {
    return null;
  }
}

/**
 * Локальная оценка по calories-db.json (всегда доступна без сети).
 */
export function estimateCaloriesOffline(text: string): CalorieEstimateResult {
  const lower = text.toLowerCase().trim();
  if (!lower) {
    return {
      caloriesMin: 0,
      caloriesMax: 0,
      foundProducts: [],
      confidence: "low",
      source: "offline",
    };
  }

  const { occurrences, seenOrder } = parseOccurrences(lower);
  return {
    ...aggregateOccurrences(occurrences, seenOrder),
    source: "offline",
  };
}

/**
 * Сначала Open Food Facts; при сбое или отсутствии данных — локальная база.
 */
export async function estimateCalories(
  text: string,
): Promise<CalorieEstimateResult> {
  const online = await estimateCaloriesOnline(text);
  if (online != null) {
    return online;
  }
  return estimateCaloriesOffline(text);
}
