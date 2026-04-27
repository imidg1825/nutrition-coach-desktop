import branding from "../data/seeds/content/branding.json";
import contentVersion from "../data/seeds/content/content-version.json";
import templates from "../data/seeds/content/templates.json";
import habits from "../data/seeds/content/habits.json";
import nutrition from "../data/seeds/content/nutrition.json";
import tasks from "../data/seeds/content/tasks.json";
import recommendations from "../data/seeds/content/recommendations.json";
import supportMessages from "../data/seeds/content/support-messages.json";
import changelog from "../data/seeds/content/changelog.json";
import profile from "../data/seeds/user/profile.json";
import program from "../data/seeds/user/program.json";
import progress from "../data/seeds/user/progress.json";
import behavior from "../data/seeds/user/behavior.json";
import coachState from "../data/seeds/user/coach-state.json";
import settings from "../data/seeds/user/settings.json";

/** Статичные мок-данные для каркаса UI (без реального storage). */
export const mockAppData = {
  isOnline: true,
  /** Для демо: программа уже «создана», кнопка «Продолжить» видна. */
  hasProgram: true,
  appVersion: "0.1.0",
  content: {
    branding,
    contentVersion,
    templates,
    habits,
    nutrition,
    tasks,
    recommendations,
    supportMessages,
    changelog,
  },
  user: {
    profile,
    program,
    progress,
    behavior,
    coachState,
    settings,
  },
};

export type MockAppData = typeof mockAppData;
