import type { Screen } from "../../types";

export type NavItem = { id: Screen; label: string };

export const NAV_ITEMS: NavItem[] = [
  { id: "start", label: "Старт" },
  { id: "about", label: "О нутрициологе" },
  { id: "questionnaire", label: "Анкета" },
  { id: "building", label: "Сборка программы" },
  { id: "nutritionPlan", label: "План питания" },
  { id: "dashboard", label: "Главный экран" },
  { id: "calendar", label: "Календарь" },
  { id: "day", label: "День" },
  { id: "recommendations", label: "Рекомендации" },
  { id: "progress", label: "Прогресс" },
  { id: "history", label: "История" },
  { id: "finish", label: "Итог" },
  { id: "updates", label: "Обновления" },
  { id: "settings", label: "Настройки" },
];

type SidebarProps = {
  current: Screen;
  onSelect: (screen: Screen) => void;
};

export function Sidebar({ current, onSelect }: SidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 py-4 backdrop-blur-[2px] md:flex">
      <div className="px-4 pb-3">
        <div className="rounded-2xl bg-gradient-to-b from-amber-50/70 to-teal-50/40 px-3 py-3 ring-1 ring-teal-100/60">
          <div className="text-xs font-medium text-slate-600">Навигация</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Мягкий ритм, без давления
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.id === current;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={
                active
                  ? "rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-3 py-2 text-left text-sm font-medium text-white shadow-sm"
                  : "rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-surface-muted"
              }
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
