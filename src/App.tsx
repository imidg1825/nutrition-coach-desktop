import { useState, type ReactNode } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { mockAppData } from "./mocks/mockAppData";
import {
  AboutNutritionistPage,
  BuildingProgramPage,
  CalendarPage,
  DashboardPage,
  DayPage,
  FinishPage,
  ProgressPage,
  QuestionnairePage,
  RecommendationsPage,
  NutritionPlanPage,
  SettingsPage,
  StartPage,
  UpdatesPage,
} from "./pages";
import type { Screen } from "./types";
import type { ClientQuestionnaire } from "./modules/questionnaire";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const mock = mockAppData;
  const pageProps = { mock, navigate: setScreen };
  const [clientQuestionnaire, setClientQuestionnaire] = useState<
    ClientQuestionnaire | null
  >(null);

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
          initialQuestionnaire={clientQuestionnaire}
          onQuestionnaireComplete={(questionnaire) =>
            setClientQuestionnaire(questionnaire)
          }
        />
      );
      break;
    case "building":
      body = (
        <BuildingProgramPage
          {...pageProps}
          clientQuestionnaire={clientQuestionnaire}
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
      body = <DashboardPage {...pageProps} />;
      break;
    case "calendar":
      body = <CalendarPage {...pageProps} />;
      break;
    case "day":
      body = <DayPage {...pageProps} />;
      break;
    case "recommendations":
      body = <RecommendationsPage {...pageProps} />;
      break;
    case "progress":
      body = <ProgressPage {...pageProps} />;
      break;
    case "finish":
      body = <FinishPage {...pageProps} />;
      break;
    case "updates":
      body = <UpdatesPage {...pageProps} />;
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
      onNavigate={setScreen}
      isOnline={mock.isOnline}
      materialsVersion={mock.content.contentVersion.version}
    >
      {body}
    </AppLayout>
  );
}
