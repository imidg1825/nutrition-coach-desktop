import { useEffect, useState } from "react";
import type { PageProps } from "./pageProps";

const PROGRAM_CONFIG_STORAGE_KEY = "nutrition.programConfig";
type ProgramDuration = 7 | 14 | 30;

export function StartPage({ mock, navigate }: PageProps) {
  const [duration, setDuration] = useState<ProgramDuration>(14);

  useEffect(() => {
    localStorage.setItem(
      PROGRAM_CONFIG_STORAGE_KEY,
      JSON.stringify({ duration }),
    );
  }, [duration]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8">
      <section className="space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <img
            src="/assets/olesya.png"
            alt="Олеся Богураева"
            className="h-24 w-24 rounded-full object-cover shadow sm:h-28 sm:w-28"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Олеся Богураева
            </h1>
            <p className="text-base font-medium text-slate-700">
              Дипломированный фармацевт и нутрициолог с 10-летним опытом
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Помогаю снизить вес и наладить питание без строгих диет и срывов —
              с учётом вашего здоровья и образа жизни.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              10+ лет в медицине и фармацевтике — понимаю, как питание влияет на
              организм и взаимодействует с лекарствами.
            </p>
          </div>
        </header>

        <ul className="space-y-2 text-sm text-slate-700">
          <li>✔ Без строгих диет и запретов</li>
          <li>✔ С учётом здоровья и лекарств</li>
          <li>✔ Пошаговая система, которую реально соблюдать</li>
        </ul>

        <div className="space-y-2 rounded-lg bg-slate-50/80 p-4">
          <p className="text-sm font-medium text-slate-800">Если вам это знакомо:</p>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>- устали от диет и постоянных срывов</li>
            <li>- не понимаете, что именно есть в течение дня</li>
            <li>- вес стоит или возвращается</li>
            <li>- сложно соблюдать систему долго</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-900">
            Выберите формат программы
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 7 as ProgramDuration, caption: "Пробный" },
              { value: 14 as ProgramDuration, caption: "Оптимально" },
              { value: 30 as ProgramDuration, caption: "Глубже" },
            ].map(({ value, caption }) => {
              const isActive = duration === value;
              const isRecommended = value === 14;
              return (
                <div key={value} className="space-y-1 text-center">
                  <button
                    type="button"
                    onClick={() => setDuration(value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {value} дней
                  </button>
                  <p
                    className={`text-xs ${
                      isRecommended ? "font-medium text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {caption}
                    {isRecommended ? (
                      <span className="ml-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                        Рекомендуем
                      </span>
                    ) : null}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("questionnaire")}
              className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
            >
              Начать программу
            </button>
            <button
              type="button"
              onClick={() => navigate("about")}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:bg-surface-muted"
            >
              Кто ведёт программу
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Уже сегодня вы получите понятный план питания на первый день
          </p>
        </div>
        {mock.hasProgram ? (
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="mt-3 px-1 py-1 text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-700"
          >
            Продолжить
          </button>
        ) : null}

        <div className="space-y-4 rounded-xl border border-green-200 bg-green-100/70 p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            Вот что изменится уже в первые дни
          </p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✔ Чёткий план питания на каждый день без сложных расчётов</li>
            <li>✔ Чёткое понимание: что есть в течение дня</li>
            <li>✔ Контроль питания без подсчёта калорий</li>
            <li>✔ Поддержка и мягкие корректировки без давления и стресса</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
