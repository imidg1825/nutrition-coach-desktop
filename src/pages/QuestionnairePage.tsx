import type { PageProps } from "./pageProps";

const FIELDS = [
  { key: "clientName", label: "Имя" },
  { key: "age", label: "Возраст" },
  { key: "heightCm", label: "Рост (см)" },
  { key: "weightKg", label: "Вес (кг)" },
  { key: "goal", label: "Цель" },
  { key: "programDays", label: "Срок программы (дней)" },
  { key: "dietRestrictions", label: "Ограничения по питанию" },
  { key: "activityLevel", label: "Уровень активности" },
  { key: "currentHabits", label: "Текущие привычки" },
  { key: "mainDifficulties", label: "Основные сложности" },
  { key: "desiredResult", label: "Желаемый результат" },
] as const;

export function QuestionnairePage({ mock }: PageProps) {
  const p = mock.user.profile;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Анкета клиента</h1>
      <p className="text-sm text-slate-500">
        Каркас полей по ТЗ. Редактирование и сохранение — позже.
      </p>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {FIELDS.map(({ key, label }) => (
          <li
            key={key}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-900">
              {String(p[key as keyof typeof p])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
