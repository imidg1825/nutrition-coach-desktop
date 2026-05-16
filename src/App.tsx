import { useEffect, useState, type ReactNode } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { mockAppData } from "./mocks/mockAppData";
import {
  AboutNutritionistPage,
  BuildingProgramPage,
  CalendarPage,
  DashboardPage,
  DayPage,
  FinishPage,
  HistoryPage,
  ProgressPage,
  QuestionnairePage,
  RecommendationsPage,
  NutritionPlanPage,
  SettingsPage,
  StartPage,
  UpdatesPage,
} from "./pages";
import type { Screen } from "./types";
import { clearPersonalProgram } from "./modules/programBuilder/programStorage";
import {
  readProgramDuration,
  writeProgramDuration,
  type ProgramDuration,
} from "./modules/programConfig";
import {
  questionnaireDefaults,
  type ClientQuestionnaire,
  type ProgramDurationDays,
} from "./modules/questionnaire";

const CLIENT_QUESTIONNAIRE_STORAGE_KEY = "nutrition.clientQuestionnaire";
const PROGRAM_SESSION_STORAGE_KEY = "nutrition.programSession";
const VALID_SCREENS: Screen[] = [
  "start",
  "about",
  "questionnaire",
  "building",
  "nutritionPlan",
  "dashboard",
  "calendar",
  "day",
  "recommendations",
  "progress",
  "history",
  "finish",
  "updates",
  "settings",
];

type ProgramSession = {
  questionnaireCompleted: boolean;
  programAssembled: boolean;
  nutritionPlanOpened: boolean;
  currentDay: number;
  totalDays: number;
  startedAt: string;
  currentScreen: Screen;
};

function defaultProgramSession(): ProgramSession {
  return {
    questionnaireCompleted: false,
    programAssembled: false,
    nutritionPlanOpened: false,
    currentDay: 1,
    totalDays: 14,
    startedAt: "",
    currentScreen: "start",
  };
}

function isValidScreen(value: unknown): value is Screen {
  return typeof value === "string" && VALID_SCREENS.includes(value as Screen);
}

function loadProgramSessionFromStorage(): ProgramSession {
  try {
    const raw = localStorage.getItem(PROGRAM_SESSION_STORAGE_KEY);
    if (!raw) return defaultProgramSession();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultProgramSession();

    const p = parsed as Partial<ProgramSession>;
    return {
      questionnaireCompleted: Boolean(p.questionnaireCompleted),
      programAssembled: Boolean(p.programAssembled),
      nutritionPlanOpened: Boolean(p.nutritionPlanOpened),
      currentDay:
        typeof p.currentDay === "number" && p.currentDay > 0
          ? Math.floor(p.currentDay)
          : 1,
      totalDays:
        typeof p.totalDays === "number" && p.totalDays > 0
          ? Math.floor(p.totalDays)
          : 14,
      startedAt: typeof p.startedAt === "string" ? p.startedAt : "",
      currentScreen: isValidScreen(p.currentScreen) ? p.currentScreen : "start",
    };
  } catch {
    return defaultProgramSession();
  }
}

function persistProgramSession(session: ProgramSession): void {
  localStorage.setItem(PROGRAM_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function loadClientQuestionnaireFromStorage(): ClientQuestionnaire | null {
  try {
    const raw = localStorage.getItem(CLIENT_QUESTIONNAIRE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ClientQuestionnaire;
  } catch {
    return null;
  }
}

function toProgramDurationDays(duration: ProgramDuration): ProgramDurationDays {
  return duration;
}

function withProgramDuration(
  questionnaire: ClientQuestionnaire,
  duration: ProgramDuration,
): ClientQuestionnaire {
  return {
    ...questionnaire,
    goalAndDuration: {
      ...questionnaire.goalAndDuration,
      programDurationDays: toProgramDurationDays(duration),
    },
  };
}

function normalizeClientQuestionnaire(
  raw: ClientQuestionnaire | null,
): ClientQuestionnaire | null {
  if (raw === null) return null;
  return {
    basics: { ...questionnaireDefaults.basics, ...raw.basics },
    goalAndDuration: {
      ...questionnaireDefaults.goalAndDuration,
      ...raw.goalAndDuration,
    },
    medicalParticularities: {
      ...questionnaireDefaults.medicalParticularities,
      ...raw.medicalParticularities,
    },
    dayScheduleAndWork: {
      ...questionnaireDefaults.dayScheduleAndWork,
      ...raw.dayScheduleAndWork,
    },
    foodAndProducts: {
      ...questionnaireDefaults.foodAndProducts,
      ...raw.foodAndProducts,
    },
    budgetSeasonAndAvailability: {
      ...questionnaireDefaults.budgetSeasonAndAvailability,
      ...raw.budgetSeasonAndAvailability,
    },
    habitsDifficultiesAndSupport: {
      ...questionnaireDefaults.habitsDifficultiesAndSupport,
      ...raw.habitsDifficultiesAndSupport,
    },
    cookingHabitsAndMethods: {
      ...questionnaireDefaults.cookingHabitsAndMethods,
      ...raw.cookingHabitsAndMethods,
    },
    healthAndAnalyses: {
      ...questionnaireDefaults.healthAndAnalyses,
      ...raw.healthAndAnalyses,
    },
  };
}

export default function App() {
  const [programSession, setProgramSession] = useState<ProgramSession>(() =>
    loadProgramSessionFromStorage(),
  );
  const [screen, setScreen] = useState<Screen>(() =>
    isValidScreen(programSession.currentScreen)
      ? programSession.currentScreen
      : "start",
  );
  const mock = mockAppData;
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  const navigate = (nextScreen: Screen) => {
    setScreen(nextScreen);
    setProgramSession((prev) => {
      const latest = loadProgramSessionFromStorage();
      const next = {
        ...prev,
        ...latest,
        currentScreen: nextScreen,
      };
      persistProgramSession(next);
      return next;
    });
  };
  const pageProps = { mock, navigate };
  const [clientQuestionnaire, setClientQuestionnaire] = useState<
    ClientQuestionnaire | null
  >(() =>
    normalizeClientQuestionnaire(loadClientQuestionnaireFromStorage()),
  );

  function clearClientQuestionnaire(): void {
    setClientQuestionnaire(null);
    localStorage.removeItem(CLIENT_QUESTIONNAIRE_STORAGE_KEY);
  }
  void clearClientQuestionnaire;

  let body: ReactNode;
  switch (screen) {
    case "start":
      body = <StartPage {...pageProps} />;
      break;
    case "about":
      body = <AboutNutritionistPage {...pageProps} />;
      break;
    case "questionnaire":
      body = (
        <QuestionnairePage
          {...pageProps}
          initialQuestionnaire={withProgramDuration(
            clientQuestionnaire ?? questionnaireDefaults,
            readProgramDuration(),
          )}
          onQuestionnaireComplete={(questionnaire) => {
            const duration = questionnaire.goalAndDuration.programDurationDays;
            if (
              duration === 7 ||
              duration === 14 ||
              duration === 30
            ) {
              writeProgramDuration(duration);
            }
            clearPersonalProgram();
            setClientQuestionnaire(questionnaire);
            localStorage.setItem(
              CLIENT_QUESTIONNAIRE_STORAGE_KEY,
              JSON.stringify(questionnaire),
            );
            setProgramSession((prev) => {
              const next: ProgramSession = {
                ...prev,
                questionnaireCompleted: true,
                totalDays: duration || readProgramDuration(),
              };
              persistProgramSession(next);
              return next;
            });
          }}
        />
      );
      break;
    case "building":
      body = (
        <BuildingProgramPage
          {...pageProps}
          clientQuestionnaire={clientQuestionnaire}
          onProgramAssembled={(questionnaire) => {
            setProgramSession((prev) => {
              const next: ProgramSession = {
                ...prev,
                programAssembled: true,
                currentDay: 1,
                totalDays: questionnaire.goalAndDuration.programDurationDays || 14,
                startedAt: new Date().toISOString().slice(0, 10),
              };
              persistProgramSession(next);
              return next;
            });
          }}
          onNutritionPlanOpened={() => {
            setProgramSession((prev) => {
              const next: ProgramSession = {
                ...prev,
                nutritionPlanOpened: true,
              };
              persistProgramSession(next);
              return next;
            });
          }}
        />
      );
      break;
    case "nutritionPlan":
      body = (
        <NutritionPlanPage
          {...pageProps}
          clientQuestionnaire={clientQuestionnaire}
        />
      );
      break;
    case "dashboard":
      body = (
        <DashboardPage {...pageProps} clientQuestionnaire={clientQuestionnaire} />
      );
      break;
    case "calendar":
      body = <CalendarPage {...pageProps} />;
      break;
    case "day":
      body = (
        <DayPage
          {...pageProps}
          clientQuestionnaire={clientQuestionnaire}
        />
      );
      break;
    case "recommendations":
      body = <RecommendationsPage {...pageProps} />;
      break;
    case "progress":
      body = (
        <ProgressPage
          {...pageProps}
          clientQuestionnaire={clientQuestionnaire}
        />
      );
      break;
    case "history":
      body = <HistoryPage {...pageProps} />;
      break;
    case "finish":
      body = <FinishPage {...pageProps} />;
      break;
    case "updates":
      body = <UpdatesPage {...pageProps} isOnline={isOnline} />;
      break;
    case "settings":
      body = <SettingsPage {...pageProps} />;
      break;
    default:
      body = <StartPage {...pageProps} />;
  }

  return (
    <AppLayout
      screen={screen}
      onNavigate={navigate}
      isOnline={isOnline}
      materialsVersion={mock.content.contentVersion.version}
    >
      {body}
    </AppLayout>
  );
}
