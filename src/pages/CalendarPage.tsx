import type { PageProps } from "./pageProps";

type DayStatus = "future" | "current" | "done" | "skipped";

function statusForDay(
  day: number,
  current: number,
  completed: number[],
  skipped: number[],
): DayStatus {
  if (completed.includes(day)) return "done";
  if (skipped.includes(day)) return "skipped";
  if (day === current) return "current";
  if (day < current) return "skipped";
  return "future";
}

const CELL_STYLES: Record<DayStatus, string> = {
  done: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
  current:
    "bg-accent text-white shadow-md ring-2 ring-accent ring-offset-2 ring-offset-surface",
  future: "bg-slate-100 text-slate-400 ring-1 ring-slate-200/80",
  skipped:
    "border-2 border-dashed border-rose-300 bg-rose-50 text-rose-800",
};

const LABELS: Record<DayStatus, string> = {
  future: "будущий",
  current: "текущий",
  done: "выполнен",
  skipped: "пропущен",
};

const LEGEND: { status: DayStatus; label: string }[] = [
  { status: "done", label: "Выполнен" },
  { status: "current", label: "Текущий день" },
  { status: "future", label: "Будущий" },
  { status: "skipped", label: "Пропущен" },
];

export function CalendarPage({ mock }: PageProps) {
  const { program, progress } = mock.user;
  const days = Array.from({ length: program.totalDays }, (_, i) => i + 1);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Календарь программы</h1>
      <p className="text-sm text-slate-500">
        Визуальный прогресс и статусы дней (мок).
      </p>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const st = statusForDay(
            d,
            program.currentDay,
            progress.completedDays,
            progress.skippedDays,
          );
          return (
            <div
              key={d}
              title={LABELS[st]}
              className={`flex aspect-square items-center justify-center rounded-md text-sm font-medium ${CELL_STYLES[st]}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 pt-4 text-xs text-slate-600"
        aria-label="Легенда статусов дней"
      >
        {LEGEND.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className={`inline-block size-4 shrink-0 rounded-md ${CELL_STYLES[status]}`}
              aria-hidden
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
