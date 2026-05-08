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

export function Header({ isOnline, materialsVersion }: HeaderProps) {
  const [now, setNow] = useState(() => new Date());
  const nowLabel = useMemo(() => formatHeaderNow(now), [now]);

  useEffect(() => {
    const tick = () => setNow(new Date());

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-surface-card px-4 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-slate-900">
          Твой личный нутрициолог
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden rounded bg-amber-50/70 px-2 py-0.5 text-xs font-medium text-amber-950 ring-1 ring-amber-100 sm:inline">
          {nowLabel}
        </span>
        <span className="text-slate-500">Материалы</span>
        <span className="rounded bg-surface-muted px-2 py-0.5 font-mono text-xs text-slate-700">
          {materialsVersion}
        </span>
        <span
          className={
            isOnline
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
              : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
          }
        >
          {isOnline ? "Онлайн" : "Офлайн"}
        </span>
      </div>
    </header>
  );
}
