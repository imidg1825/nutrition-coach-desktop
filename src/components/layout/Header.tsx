import { useEffect, useMemo, useState } from "react";

type HeaderProps = {
  isOnline: boolean;
  materialsVersion: string;
};

function timeOfDayLabel(now: Date): string {
  const minutes = now.getHours() * 60 + now.getMinutes();

  // 05:00–06:59
  if (minutes >= 5 * 60 && minutes <= 6 * 60 + 59) return "Раннее утро";
  // 07:00–11:59
  if (minutes >= 7 * 60 && minutes <= 11 * 60 + 59) return "Утро";
  // 12:00–16:59
  if (minutes >= 12 * 60 && minutes <= 16 * 60 + 59) return "День";
  // 17:00–20:59
  if (minutes >= 17 * 60 && minutes <= 20 * 60 + 59) return "Вечер";
  // 21:00–23:29
  if (minutes >= 21 * 60 && minutes <= 23 * 60 + 29) return "Поздний вечер";
  // 23:30–04:59
  return "Ночь";
}

function formatHeaderNow(now: Date): string {
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(now);
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const tod = timeOfDayLabel(now);
  return `${tod} · ${datePart} · ${timePart}`;
}

/** Короткая строка для узких экранов */
function formatHeaderNowCompact(now: Date): string {
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(now);
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `${datePart} · ${timePart}`;
}

export function Header({ isOnline, materialsVersion }: HeaderProps) {
  const [now, setNow] = useState(() => new Date());
  const nowLabel = useMemo(() => formatHeaderNow(now), [now]);
  const nowLabelCompact = useMemo(() => formatHeaderNowCompact(now), [now]);

  useEffect(() => {
    const tick = () => setNow(new Date());

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 bg-surface-card px-3 py-2 shadow-sm sm:gap-x-3 sm:px-4 md:h-14 md:flex-nowrap md:gap-y-0 md:py-0">
      <div className="min-w-0 flex-1 basis-[min(100%,12rem)] md:basis-auto">
        <span className="block truncate text-base font-semibold text-slate-900 md:text-lg">
          Твой личный нутрициолог
        </span>
      </div>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-xs sm:gap-x-2 sm:text-sm md:flex-nowrap md:gap-x-3">
        <span className="hidden rounded bg-amber-50/70 px-2 py-0.5 font-medium text-amber-950 ring-1 ring-amber-100 md:inline">
          {nowLabel}
        </span>
        <span className="max-w-[10rem] truncate rounded bg-amber-50/70 px-1.5 py-0.5 font-medium text-amber-950 ring-1 ring-amber-100 md:hidden">
          {nowLabelCompact}
        </span>
        <span className="hidden text-slate-500 sm:inline">Материалы</span>
        <span className="max-w-[5rem] truncate rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-slate-700 sm:max-w-none sm:px-2 sm:text-xs">
          {materialsVersion}
        </span>
        <span
          className={
            isOnline
              ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
              : "shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
          }
        >
          {isOnline ? "Онлайн" : "Офлайн"}
        </span>
      </div>
    </header>
  );
}
