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
    <div className="mx-auto w-full max-w-4xl px-4 pt-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-b from-white to-amber-50/40 px-6 py-8 shadow-soft sm:px-10 sm:py-10">
        {/* tropical decorative accents */}
        <div className="pointer-events-none absolute -left-16 -top-20 size-72 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-8 size-80 rounded-full bg-teal-200/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 -translate-x-1/2 rounded-full bg-amber-200/25 blur-3xl" />

        <header className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-950 ring-1 ring-teal-100">
              <span className="inline-block size-2 rounded-full bg-teal-400" aria-hidden />
              Мягкое сопровождение без давления
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Твой личный нутрициолог
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-700">
              Вы не один(а) в этом процессе. Я рядом — помогу выстроить спокойный ритм питания,
              без строгих диет и ощущения «я снова не справился(лась)».
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/60">
                <div className="text-xs font-medium text-slate-500">Без крайностей</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Мягко и по шагам
                </div>
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/60">
                <div className="text-xs font-medium text-slate-500">Понятно</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Что есть и когда
                </div>
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/60">
                <div className="text-xs font-medium text-slate-500">Поддержка</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Олеся рядом
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="ui-card-soft relative overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-coral-200/20 blur-2xl" />
              <div className="flex items-center gap-4">
                <img
                  src="/assets/olesya.png"
                  alt="Олеся Богураева"
                  className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-white/70 sm:h-20 sm:w-20"
                />
                <div className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight text-slate-900">
                    Олеся Богураева
                  </p>
                  <p className="text-sm text-slate-600">
                    Фармацевт и нутрициолог
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p className="rounded-xl bg-emerald-50/70 px-3 py-2 ring-1 ring-emerald-100">
                  10 лет в медицине и фармацевтике — учитываю здоровье, привычки и ритм жизни.
                </p>
                <p className="rounded-xl bg-amber-50/70 px-3 py-2 ring-1 ring-amber-100">
                  План — это ориентир, а не контроль. Важнее спокойное возвращение, чем идеальность.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="relative mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* duration cards */}
          <section className="ui-card p-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Выберите формат программы
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Можно начать мягко и усилить ритм постепенно.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { value: 7 as ProgramDuration, caption: "Пробный" },
                { value: 14 as ProgramDuration, caption: "Оптимально" },
                { value: 30 as ProgramDuration, caption: "Глубже" },
              ].map(({ value, caption }) => {
                const isActive = duration === value;
                const isRecommended = value === 14;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDuration(value)}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-teal-200 bg-gradient-to-b from-teal-50 to-emerald-50/60 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-surface-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {value}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          дней
                        </div>
                      </div>
                      {isRecommended ? (
                        <span className="ui-badge ui-badge-aqua">Рекомендуем</span>
                      ) : (
                        <span
                          className={`mt-1 inline-block size-3 rounded-full ring-1 ${
                            isActive
                              ? "bg-teal-400 ring-teal-200"
                              : "bg-slate-200 ring-slate-200"
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="mt-3 text-sm font-medium text-slate-800">
                      {caption}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {isActive ? "Выбрано" : "Можно выбрать"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("questionnaire")}
                className="ui-btn-primary"
              >
                Начать программу
              </button>
              <button
                type="button"
                onClick={() => navigate("about")}
                className="ui-btn-secondary"
              >
                Кто ведёт программу
              </button>
              {mock.hasProgram ? (
                <button
                  type="button"
                  onClick={() => navigate("dashboard")}
                  className="ui-btn-ghost"
                >
                  Продолжить
                </button>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Уже сегодня вы получите понятный план питания на первый день.
            </p>
          </section>

          {/* trust & pain cards */}
          <section className="space-y-4">
            <div className="ui-card p-6">
              <p className="text-sm font-semibold text-slate-900">Если вам это знакомо</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-100">
                  <div className="text-xs font-medium text-amber-950">Усталость</div>
                  <div className="mt-1 text-sm text-slate-700">
                    устали от диет и постоянных срывов
                  </div>
                </div>
                <div className="rounded-2xl bg-teal-50/70 p-4 ring-1 ring-teal-100">
                  <div className="text-xs font-medium text-teal-950">Неясность</div>
                  <div className="mt-1 text-sm text-slate-700">
                    не понимаете, что именно есть в течение дня
                  </div>
                </div>
                <div className="rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-100">
                  <div className="text-xs font-medium text-rose-950">Стабильность</div>
                  <div className="mt-1 text-sm text-slate-700">
                    вес стоит или возвращается
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-100">
                  <div className="text-xs font-medium text-emerald-950">Долгий путь</div>
                  <div className="mt-1 text-sm text-slate-700">
                    сложно соблюдать систему долго
                  </div>
                </div>
              </div>
            </div>

            <div className="ui-card p-6">
              <p className="text-sm font-semibold text-slate-900">
                Вот что изменится уже в первые дни
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>✔ Чёткий план питания на каждый день без сложных расчётов</li>
                <li>✔ Чёткое понимание: что есть в течение дня</li>
                <li>✔ Контроль питания без подсчёта калорий</li>
                <li>✔ Поддержка и мягкие корректировки без давления и стресса</li>
              </ul>
              <div className="mt-4 rounded-2xl bg-surface-muted/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200/60">
                Наша цель — не идеальность, а спокойный ритм, который держится в реальной жизни.
              </div>
            </div>
          </section>
        </div>
      </section>
      <p className="mt-6 text-center text-xs text-slate-400">
        Разработчик: Иван Мазницын ·{" "}
        <a
          href="https://t.me/Ivan_Maznitsin"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-600"
        >
          Telegram
        </a>
      </p>
    </div>
  );
}
