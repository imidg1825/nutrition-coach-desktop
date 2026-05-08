import { useMemo } from "react";
import { calendarDayIndexFromStartedAt } from "../modules/support/calendarPath";
import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const DAILY_ACTUALS_STORAGE_KEY = "nutrition.dailyActuals";

type DailyActual = {
  deviation: "same" | "less" | "more";
  notes: string;
  caloriesDelta: number;
  completedAt: string;
};

type DayStatus = "future" | "today" | "done" | "pause";

function readProgramSession(): { startedAt: string | null; totalDays: number | null } {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return { startedAt: null, totalDays: null };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { startedAt: null, totalDays: null };
    const p = parsed as { startedAt?: unknown; totalDays?: unknown };
    const startedAt =
      typeof p.startedAt === "string" && p.startedAt.trim().length > 0 ? p.startedAt : null;
    const totalDays =
      typeof p.totalDays === "number" && p.totalDays > 0 ? Math.floor(p.totalDays) : null;
    return { startedAt, totalDays };
  } catch {
    return { startedAt: null, totalDays: null };
  }
}

function readDailyActuals(): Record<string, DailyActual> {
  try {
    const raw = localStorage.getItem(DAILY_ACTUALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const result: Record<string, DailyActual> = {};
    for (const [day, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as Partial<DailyActual>;
      if (
        (entry.deviation === "same" || entry.deviation === "less" || entry.deviation === "more") &&
        typeof entry.notes === "string" &&
        typeof entry.caloriesDelta === "number" &&
        typeof entry.completedAt === "string"
      ) {
        result[day] = {
          deviation: entry.deviation,
          notes: entry.notes,
          caloriesDelta: entry.caloriesDelta,
          completedAt: entry.completedAt,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

function localDateIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function completionDateIsoFromCompletedAt(completedAt: string): string | null {
  const parsed = new Date(completedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return localDateIso(parsed);
}

function dayWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

const CELL_STYLES: Record<DayStatus, string> = {
  done: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
  today:
    "bg-accent text-white shadow-md ring-2 ring-accent ring-offset-2 ring-offset-surface",
  future: "bg-slate-100 text-slate-400 ring-1 ring-slate-200/80",
  pause: "border-2 border-dashed border-amber-200 bg-amber-50 text-amber-950",
};

const LABELS: Record<DayStatus, string> = {
  future: "будущий",
  today: "сегодня",
  done: "получилось",
  pause: "пауза",
};

const LEGEND: { status: DayStatus; label: string }[] = [
  { status: "done", label: "Получилось" },
  { status: "today", label: "Сегодня" },
  { status: "future", label: "Будущий" },
  { status: "pause", label: "Пауза" },
];

export function CalendarPage({}: PageProps) {
  const session = readProgramSession();
  const dailyActuals = readDailyActuals();
  const completedDaysCount = Object.keys(dailyActuals).length;
  const totalDays = session.totalDays ?? 14;
  const nextActionDay = Math.min(completedDaysCount + 1, totalDays);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const pauseDays = useMemo(() => {
    if (!session.startedAt) return new Set<number>();
    if (completedDaysCount === 0) return new Set<number>();

    const completedByDate = new Map<string, number[]>();
    for (const [dayStr, entry] of Object.entries(dailyActuals)) {
      const dayNumber = parseInt(dayStr, 10);
      if (!Number.isFinite(dayNumber) || dayNumber <= 0) continue;
      const dateIso = completionDateIsoFromCompletedAt(entry.completedAt);
      if (!dateIso) continue;
      const list = completedByDate.get(dateIso) ?? [];
      list.push(dayNumber);
      completedByDate.set(dateIso, list);
    }

    const today = new Date();
    const calendarDayIndex = calendarDayIndexFromStartedAt(session.startedAt, today);
    const pause = new Set<number>();

    for (let i = 1; i <= Math.min(calendarDayIndex, totalDays); i += 1) {
      if (i === nextActionDay) continue; // "сегодня" — отдельный статус
      if (dailyActuals[String(i)]) continue;
      pause.add(i);
    }

    // If a completed day was actually completed today, mark it as done (not "today")
    // and keep nextActionDay as "today" context step.
    void completedByDate;
    return pause;
  }, [session.startedAt, completedDaysCount, dailyActuals, nextActionDay, totalDays]);

  const progressPercent = totalDays ? Math.round((completedDaysCount / totalDays) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Календарь программы</h1>
      <p className="text-sm text-slate-500">
        Это не отчёт и не оценка — просто мягкая ориентировка, где мы сейчас.
      </p>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const isDone = Boolean(dailyActuals[String(d)]);
          const st: DayStatus =
            isDone
              ? "done"
              : completedDaysCount === 0
                ? d === 1
                  ? "today"
                  : "future"
                : d === nextActionDay
                  ? "today"
                  : pauseDays.has(d)
                    ? "pause"
                    : "future";
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
      {completedDaysCount === 0 ? (
        <p className="rounded-lg border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-950">
          Сегодня {dayWord(1)} 1. Начинаем спокойно — Олеся рядом.
        </p>
      ) : pauseDays.size > 0 ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
          Паузы случаются — это не сброс. Их сейчас: {pauseDays.size}.
        </p>
      ) : null}
    </div>
  );
}
