type AssistantContext = {
  notes: string;
  deviation: "same" | "less" | "more";
  scenarios: string[];
  profile: "default" | "fatigue";
  context?: string;
  preferredAddressing?: "female" | "male" | "neutral";
  firstName?: string;
};

function contextMentionsSweets(t: string): boolean {
  return (
    t.includes("пирожн") ||
    t.includes("сладк") ||
    t.includes("конфет") ||
    t.includes("шоколад") ||
    t.includes("печень")
  );
}

function capitalizeFirst(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function lowercaseFirst(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function ensureSentenceEnd(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const last = trimmed.slice(-1);
  if (last === "." || last === "!" || last === "?") {
    return trimmed;
  }
  return `${trimmed}.`;
}

/** Короткая цитата из контекста пользователя — одно предложение или строка, без перегруза. */
function contextExcerpt(context: string | undefined): string | null {
  const raw = context?.trim();
  if (!raw) return null;
  const firstLine = raw.split(/\n/)[0]?.trim() ?? raw;
  const bySentence = firstLine.split(/(?<=[.!?])\s+/)[0]?.trim() ?? firstLine;
  const excerpt = bySentence.length > 110 ? `${bySentence.slice(0, 107)}…` : bySentence;
  return excerpt || null;
}

type MainTheme = "chaos" | "fatigue_sweets" | "sweets" | "fatigue" | "balanced";

function pickMainTheme(
  t: string,
  scenarios: string[],
  profile: "default" | "fatigue",
): MainTheme {
  const chaos = t.includes("хаос") || t.includes("мотался");
  const sweets =
    contextMentionsSweets(t) || scenarios.includes("sweetsCraving");
  const fatigue =
    t.includes("устал") ||
    profile === "fatigue" ||
    t.includes("не успел") ||
    scenarios.includes("fatigueChaoticDay");

  if (chaos) return "chaos";
  if (fatigue && sweets) return "fatigue_sweets";
  if (sweets) return "sweets";
  if (fatigue) return "fatigue";
  return "balanced";
}

function tiredShort(preferredAddressing?: "female" | "male" | "neutral"): string {
  if (preferredAddressing === "female") return "ты правда устала";
  if (preferredAddressing === "male") return "ты правда устал";
  return "сил сегодня было немного";
}

function buildHumanLikeResponse(input: AssistantContext): string {
  const name = input.firstName?.trim();
  const { deviation, scenarios, profile, context, preferredAddressing } = input;
  const t = (context ?? "").toLowerCase();
  const excerpt = contextExcerpt(context);
  const theme = pickMainTheme(t, scenarios, profile);

  let reflection: string;
  let normalize: string;
  let nextStep: string;

  switch (theme) {
    case "chaos": {
      reflection = excerpt
        ? `${capitalizeFirst(excerpt)} — похоже, день шёл вразнобой.`
        : "Похоже, день вышел немного вразнобой.";
      normalize =
        "В такие дни не нужно гнаться за идеалом — достаточно честно обозначить, как было.";
      nextStep =
        "Завтра хватит одного спокойного приёма пищи без лишних усложнений.";
      break;
    }
    case "fatigue_sweets": {
      let sweetTail: string;
      if (t.includes("пирожн")) {
        sweetTail = "вечером были пирожные";
      } else if (
        contextMentionsSweets(t) &&
        (t.includes("вечер") || t.includes("вечером"))
      ) {
        sweetTail = "вечером было сладкое";
      } else {
        sweetTail = "к вечеру тянуло на сладкое";
      }
      reflection = excerpt
        ? `${capitalizeFirst(excerpt)} — похоже, день был тяжёлый, и ${sweetTail}.`
        : `Похоже, день был тяжёлый, и ${sweetTail}.`;
      normalize =
        "Так организм часто добирает энергию — это нормально, не повод ругать себя.";
      nextStep =
        "Давай завтра добавим один понятный приём пищи днём, чтобы к вечеру было спокойнее.";
      break;
    }
    case "sweets": {
      reflection = excerpt
        ? `${capitalizeFirst(excerpt)} — видно, что сладкое сегодня было заметной частью дня.`
        : "Похоже, сегодня сладкое заняло своё место в дне.";
      normalize =
        "Это не повод для самообвинений — такое бывает у всех.";
      nextStep =
        "Завтра сделай один спокойный шаг: например, один сытный обед в привычное время.";
      break;
    }
    case "fatigue": {
      const tired = tiredShort(preferredAddressing);
      reflection = excerpt
        ? `${capitalizeFirst(excerpt)} — похоже, ${tired}.`
        : `Похоже, ${tired}.`;
      normalize =
        "Выдержать такой день уже вклад — можно отнестись к себе мягко.";
      nextStep =
        "Завтра выбери один простой опорный момент: завтрак или обед без спешки.";
      break;
    }
    default: {
      if (deviation === "more") {
        reflection = "Похоже, сегодня получилось плотнее, чем планировалось.";
      } else if (deviation === "less") {
        reflection = "Похоже, сегодня поесть получилось меньше, чем хотелось бы.";
      } else if (excerpt) {
        const exLower = excerpt.toLowerCase();
        if (exLower.includes("спокойн") || exLower.includes("по плану")) {
          reflection = ensureSentenceEnd(capitalizeFirst(excerpt));
        } else {
          reflection = `${capitalizeFirst(excerpt)} — похоже, день прошёл спокойно.`;
        }
      } else {
        reflection = "Спокойный день тоже опора.";
      }
      normalize =
        deviation === "more"
          ? "Такое бывает — с этим можно быть по-человечески, без самообвинений."
          : deviation === "less"
            ? "Вы уже сделали важное — отметили день таким, как он был."
            : "Это тоже ценная опора — на неё можно опереться.";
      nextStep = "Завтра хватит одного простого шага — я с вами.";
    }
  }

  const text = `${reflection} ${normalize} ${nextStep}`;
  const joined = text.replace(/\s+/g, " ").trim();
  return name ? `${name}, ${lowercaseFirst(joined)}` : joined;
}

export function buildAssistantResponse(input: AssistantContext): string {
  return buildHumanLikeResponse(input);
}

export { buildHumanLikeResponse };
