import { useEffect, useState } from "react";
import type { Screen } from "../../types";
import { NAV_ITEMS } from "./Sidebar";

type MobileNavProps = {
  current: Screen;
  onSelect: (screen: Screen) => void;
};

const TABS: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Главная" },
  { id: "day", label: "День" },
  { id: "progress", label: "Прогресс" },
];

function isMoreRoutesActive(current: Screen): boolean {
  return !TABS.some((t) => t.id === current);
}

export function MobileNav({ current, onSelect }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const go = (screen: Screen) => {
    onSelect(screen);
    setMoreOpen(false);
  };

  const moreHighlighted = moreOpen || isMoreRoutesActive(current);

  return (
    <>
      {moreOpen ? (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-white md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Другие разделы"
        >
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Закрыть
            </button>
            <span className="text-sm font-semibold text-slate-900">
              Все разделы
            </span>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = item.id === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    className={
                      active
                        ? "rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-3 text-left text-sm font-medium text-white shadow-sm"
                        : "rounded-xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-surface-muted"
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      ) : null}

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur-[2px] md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
        aria-label="Основная навигация"
      >
        {TABS.map(({ id, label }) => {
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              className={
                active
                  ? "flex min-h-[3rem] flex-1 flex-col items-center justify-center border-t-2 border-teal-600 bg-teal-50/80 px-1 pt-0.5 text-xs font-medium text-teal-900"
                  : "flex min-h-[3rem] flex-1 flex-col items-center justify-center px-1 pt-0.5 text-xs font-medium text-slate-600"
              }
            >
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={
            moreHighlighted
              ? "flex min-h-[3rem] flex-1 flex-col items-center justify-center border-t-2 border-teal-600 bg-teal-50/80 px-1 pt-0.5 text-xs font-medium text-teal-900"
              : "flex min-h-[3rem] flex-1 flex-col items-center justify-center px-1 pt-0.5 text-xs font-medium text-slate-600"
          }
        >
          <span className="max-w-full truncate">Ещё</span>
        </button>
      </nav>
    </>
  );
}
