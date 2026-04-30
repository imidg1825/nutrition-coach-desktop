import { buildDaySummaryMessage } from "./daySummary";

const STABLE_DAY_MESSAGE =
  "Сегодня получилось довольно стабильно. Такие спокойные дни и создают основу результата.";

export function buildLiveSupportMessage(notes: string): string | null {
  const normalizedNotes = notes.trim();
  if (normalizedNotes.length <= 20) return null;

  const message = buildDaySummaryMessage("same", 0, normalizedNotes);
  if (message === STABLE_DAY_MESSAGE) return null;

  return message;
}
