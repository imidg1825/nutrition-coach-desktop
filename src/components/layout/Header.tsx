type HeaderProps = {
  isOnline: boolean;
  materialsVersion: string;
};

export function Header({ isOnline, materialsVersion }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-surface-card px-4 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-slate-900">
          Твой личный нутрициолог
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm">
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
