import {
  getDetectedScenarios,
  getLiveCombinedDayMessage,
  getLiveScenarioMessage,
  type LiveDayMeals,
} from "./behaviorAnalysis";

export function buildLiveSupportMessage(notes: string | LiveDayMeals): string | null {
  if (typeof notes !== "string") {
    const combinedMessage = getLiveCombinedDayMessage(notes);
    if (combinedMessage) return combinedMessage;
    const detected = getDetectedScenarios(notes);
    const scenario = detected.length > 0 ? detected[0] : null;
    if (!scenario) return null;
    return getLiveScenarioMessage(scenario);
  }

  const detected = getDetectedScenarios(notes);
  const scenario = detected.length > 0 ? detected[0] : null;
  if (!scenario) return null;
  return getLiveScenarioMessage(scenario);
}
