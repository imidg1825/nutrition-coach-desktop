import type { PageProps } from "./pageProps";

export function BuildingProgramPage({ mock, navigate }: PageProps) {
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-xl font-semibold">Сборка программы</h1>
      <p className="text-slate-600">
        Здесь будет модуль <code className="text-sm">programBuilder</code> по
        шаблонам из анкеты. Сейчас — только заглушка.
      </p>
      <p className="text-sm text-slate-500">
        Шаблонов в сидах: {mock.content.templates.templates.length}
      </p>
      <button
        type="button"
        onClick={() => navigate("dashboard")}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Перейти к главному экрану (мок)
      </button>
    </div>
  );
}
