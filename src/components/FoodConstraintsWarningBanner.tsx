type FoodConstraintsWarningBannerProps = {
  message: string;
};

/** Мягкое предупреждение при множественных пищевых ограничениях — не блокирует план. */
export function FoodConstraintsWarningBanner({
  message,
}: FoodConstraintsWarningBannerProps) {
  return (
    <div
      role="note"
      className="rounded-lg border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm leading-relaxed text-sky-950"
    >
      {message}
    </div>
  );
}
