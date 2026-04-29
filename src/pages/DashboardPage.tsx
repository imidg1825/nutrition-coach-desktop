import type { PageProps } from "./pageProps";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";

function readProgramSessionDayInfo(): { currentDay?: number; totalDays?: number } {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const p = parsed as { currentDay?: unknown; totalDays?: unknown };
    return {
      currentDay:
        typeof p.currentDay === "number" && p.currentDay > 0
          ? Math.floor(p.currentDay)
          : undefined,
      totalDays:
        typeof p.totalDays === "number" && p.totalDays > 0
          ? Math.floor(p.totalDays)
          : undefined,
    };
  } catch {
    return {};
  }
}

export function DashboardPage({ mock, navigate }: PageProps) {
  const { profile, program, progress, coachState } = mock.user;
  const session = readProgramSessionDayInfo();
  const currentDay = session.currentDay ?? program.currentDay;
  const totalDays = session.totalDays ?? program.totalDays;
  const completedDays = Math.max(0, currentDay - 1);
  const progressPercent = Math.round((completedDays / totalDays) * 100);
  const streakDays = progress.currentStreak ?? progress.streak;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Главный экран наставника</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Текущий день
          </h2>
          <p className="mt-1 text-2xl font-semibold">
            День {currentDay} из {totalDays}
          </p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Цель клиента
          </h2>
          <p className="mt-1 text-sm text-slate-800">{profile.goal}</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Прогресс
          </h2>
          <p className="mt-1 text-2xl font-semibold">{progressPercent}%</p>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Серия выполнений
          </h2>
          <p className="mt-1 text-2xl font-semibold">{streakDays} дн.</p>
        </section>
      </div>
      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Сегодня</h2>
        <p>
          <span className="text-slate-500">Настрой дня:</span>{" "}
          {coachState.dayMood}
        </p>
        <p>
          <span className="text-slate-500">Привычка дня:</span>{" "}
          {coachState.dayHabit}
        </p>
        <p>
          <span className="text-slate-500">Задание дня:</span>{" "}
          {coachState.dayTask}
        </p>
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          {coachState.supportMessage}
        </p>
      </section>
      <button
        type="button"
        onClick={() => navigate("day")}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Открыть сегодняшний день
      </button>
    </div>
  );
}
