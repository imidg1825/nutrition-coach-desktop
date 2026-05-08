import behaviorScenarios from "../../data/seed/behavior-scenarios.json";
import { countCompletedDaysFromDailyActuals } from "./completedDays";
import { calendarDayIndexFromStartedAt } from "./calendarPath";

const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const RETURN_AFTER_BREAK_SHOWN_AT_KEY = "nutrition.support.returnAfterBreak.shownAt";
const DEV_FORCE_BREAK = false;

type ProgramSessionSnapshot = {
  startedAt?: string;
};

function readProgramSessionSnapshot(): ProgramSessionSnapshot {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const p = parsed as ProgramSessionSnapshot;
    return {
      startedAt: typeof p.startedAt === "string" ? p.startedAt : undefined,
    };
  } catch {
    return {};
  }
}

function wasShownToday(): boolean {
  const shownAt = localStorage.getItem(RETURN_AFTER_BREAK_SHOWN_AT_KEY);
  if (!shownAt) return false;
  const todayIso = new Date().toISOString().slice(0, 10);
  return shownAt === todayIso;
}

function markShownToday(): void {
  const todayIso = new Date().toISOString().slice(0, 10);
  localStorage.setItem(RETURN_AFTER_BREAK_SHOWN_AT_KEY, todayIso);
}

export function getReturnAfterBreakMessage(): string {
  return "Вы не пропали — просто был перерыв. Это нормально. Давайте спокойно продолжим с текущего дня.";
}

export function consumeReturnAfterBreakMessage(): string | null {
  try {
    const completedDays = countCompletedDaysFromDailyActuals();
    if (completedDays === 0) return null;

    const shownToday = wasShownToday();
    if (!DEV_FORCE_BREAK && shownToday) return null;

    const session = readProgramSessionSnapshot();
    const hasStartedAt = Boolean(session.startedAt && session.startedAt.trim().length > 0);
    if (!DEV_FORCE_BREAK && !hasStartedAt) return null;

    const calendarDay = hasStartedAt
      ? calendarDayIndexFromStartedAt(session.startedAt!)
      : 1;
    const hasGap = DEV_FORCE_BREAK ? true : completedDays < calendarDay;
    if (!hasGap) return null;

    if (!DEV_FORCE_BREAK) {
      markShownToday();
    }
    const scenarios = behaviorScenarios as {
      returnAfterBreak?: { message?: string };
    };
    const messageFromScenario = scenarios.returnAfterBreak?.message?.trim();
    const message =
      messageFromScenario && messageFromScenario.length > 0
        ? messageFromScenario
        : getReturnAfterBreakMessage();
    return message;
  } catch {
    return null;
  }
}
