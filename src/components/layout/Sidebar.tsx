import type { Screen } from "../../types";

type NavItem = { id: Screen; label: string };

const NAV_ITEMS: NavItem[] = [
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
    <aside className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-surface-card py-3">
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.id === current;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={
                active
                  ? "rounded-md bg-accent px-3 py-2 text-left text-sm font-medium text-white"
                  : "rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-surface-muted"
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
