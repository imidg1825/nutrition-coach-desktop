import type { PageProps } from "./pageProps";

const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

type DailyActualEntry = {
  deviation: "same" | "less" | "more";
  notes: string;
  caloriesDelta: number;
  completedAt: string;
  summaryMessage?: string;
};

type HistoryItem = DailyActualEntry & {
  dayNumber: number;
};

function readHistoryItems(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];

    const items: HistoryItem[] = [];

    for (const [dayKey, entryUnknown] of Object.entries(parsed as Record<string, unknown>)) {
      const dayNumber = Number.parseInt(dayKey, 10);
      if (!Number.isFinite(dayNumber) || dayNumber <= 0) continue;
      if (!entryUnknown || typeof entryUnknown !== "object") continue;

      const entry = entryUnknown as Partial<DailyActualEntry>;
      const deviation = entry.deviation;
      const hasValidDeviation =
        deviation === "same" || deviation === "less" || deviation === "more";

      if (
        hasValidDeviation &&
        typeof entry.notes === "string" &&
        typeof entry.caloriesDelta === "number" &&
        typeof entry.completedAt === "string"
      ) {
        items.push({
          dayNumber,
          deviation,
          notes: entry.notes,
          caloriesDelta: entry.caloriesDelta,
          completedAt: entry.completedAt,
          summaryMessage:
            typeof entry.summaryMessage === "string" ? entry.summaryMessage : undefined,
        });
      }
    }

    return items.sort((a, b) => b.dayNumber - a.dayNumber);
  } catch {
    return [];
  }
}

function formatDeviation(value: DailyActualEntry["deviation"]): string {
  if (value === "same") return "По плану";
  if (value === "less") return "Меньше";
  return "Больше или плотнее";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Дата не распознана";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function HistoryPage({}: PageProps) {
  const historyItems = readHistoryItems();

  if (historyItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">История прохождения</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Пока здесь пусто. Когда вы отметите завершение дня, запись появится в истории.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">История прохождения</h1>
        <p className="mt-2 text-sm text-slate-600">
          Здесь только просмотр завершённых дней без редактирования.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Это не возврат назад и не редактирование программы — только спокойный просмотр уже
          пройденного пути.
        </p>
      </div>

      {historyItems.map((item) => (
        <article
          key={item.dayNumber}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">День {item.dayNumber}</h2>

          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Дата завершения:</span>{" "}
              {formatDate(item.completedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Как прошёл день:</span>{" "}
              {formatDeviation(item.deviation)}
            </p>
          </div>

          {item.summaryMessage ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {item.summaryMessage}
            </p>
          ) : null}

          {item.notes.trim() ? (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Заметки</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.notes}</p>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
