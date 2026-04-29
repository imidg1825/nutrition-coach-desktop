/**
 * Полная анкета клиента (раздел 31 PROJECT_SPEC.md).
 * Восемь шагов: базовые данные → цель и срок → медицинские особенности → режим дня и работа →
 * питание и продукты → бюджет и доступность → привычки, сложности и мягкое сопровождение →
 * пищевые привычки и способы приготовления.
 */

/** Шаг 1. Базовые данные — для кого собирается программа. */
export type QuestionnaireBasics = {
  /** имя */
  firstName: string;
  age: number;
  heightCm: number;
  weightKg: number;
  /** город / регион */
  cityOrRegion: string;
};

export type ProgramDurationDays = 7 | 14 | 21 | 30;

/** «мягкий» / «средний» / «дисциплинированный» — комфортный темп программы. */
export type ComfortablePace = "мягкий" | "средний" | "дисциплинированный";

/** Шаг 2. Цель и срок программы. */
export type QuestionnaireGoalAndDuration = {
  /** основная цель */
  primaryGoal: string;
  programDurationDays: ProgramDurationDays;
  /** желаемый результат */
  desiredOutcome: string;
  comfortablePace: ComfortablePace;
};

/** Шаг 3. Медицинские особенности и ограничения (без обещаний лечебного эффекта). */
export type QuestionnaireMedicalParticularities = {
  /** есть ли медицинские особенности */
  hasMedicalParticularities: boolean;
  /** описание медицинских особенностей */
  medicalParticularitiesDescription: string;
  foodAllergies: string;
  intolerances: string;
  /** врачебные ограничения по питанию */
  medicalDietaryRestrictions: string;
};

export type WorkType =
  | "сидячая"
  | "активная"
  | "сменная"
  | "удалённая";

/** низкий / средний / высокий — уровень активности (шаг 4). */
export type ActivityLevelLmh = "низкий" | "средний" | "высокий";

/** Шаг 4. Режим дня и работа. */
export type QuestionnaireDayScheduleAndWork = {
  wakeTime: string;
  sleepTime: string;
  workType: WorkType;
  workScheduleNotes: string;
  /** когда обычно удобно есть */
  usualMealTimesNotes: string;
  activityLevel: ActivityLevelLmh;
};

/** нет / иногда / часто — для тяги к сладкому, перекусов и т.п. */
export type FrequencyNeverSometimesOften = "нет" | "иногда" | "часто";

/** Шаг 5. Питание и продукты. */
export type QuestionnaireFoodAndProducts = {
  mealsPerDay: number;
  usualBreakfast: string;
  usualLunch: string;
  usualDinner: string;
  favoriteFoods: string;
  foodsNotEaten: string;
  sweetCraving: FrequencyNeverSometimesOften;
  eveningSnacks: FrequencyNeverSometimesOften;
  snacksAndTiming: string;
  commonNutritionChallenges: string;
};

export type FoodBudgetLevel = "низкий" | "средний" | "свободный";

export type ProductAvailability =
  | "обычные магазины"
  | "рынок"
  | "доставка"
  | "ограниченный выбор";

export type SeasonChoice =
  | "авто"
  | "весна"
  | "лето"
  | "осень"
  | "зима";

export type YesNoSometimes = "да" | "нет" | "иногда";

/** Шаг 6. Бюджет, сезонность и доступность. */
export type QuestionnaireBudgetSeasonAndAvailability = {
  foodBudget: FoodBudgetLevel;
  productAvailability: ProductAvailability;
  season: SeasonChoice;
  willingToBuyRareProducts: YesNoSometimes;
  needsSimpleProductSubstitutions: "да" | "нет";
};

/** мягкий / нейтральный / бодрый — комфортный тон мягкого сопровождения. */
export type SupportTone = "мягкий" | "нейтральный" | "бодрый";

/** Шаг 7. Привычки, сложности и мягкое сопровождение. */
export type QuestionnaireHabitsDifficultiesAndSupport = {
  helpfulHabitsNotes: string;
  /** привычки, которые мешают результату (мягкая формулировка) */
  habitsHinderingProgressNotes: string;
  smokingNotes: string;
  alcoholNotes: string;
  frequentSweetenedDrinks: FrequencyNeverSometimesOften;
  fastFoodFrequency: FrequencyNeverSometimesOften;
  nightSnacks: FrequencyNeverSometimesOften;
  stressOvereating: FrequencyNeverSometimesOften;
  skippedBreakfastOrLunch: FrequencyNeverSometimesOften;
  insufficientSleep: FrequencyNeverSometimesOften;
  lowPhysicalActivity: FrequencyNeverSometimesOften;
  mainChallenges: string;
  whatOftenGetsInTheWay: string;
  reactionToSkips: string;
  preferredSupportTone: SupportTone;
};

/** no / sometimes / often — частота для шага 8 (технические коды для UI/логики). */
export type FrequencyNoSometimesOften = "no" | "sometimes" | "often";

export type CookingTimeAvailable =
  | "under_15_min"
  | "15_30_min"
  | "can_prepare_ahead";

export type SaltUsage = "low" | "moderate" | "high";

/** Шаг 8. Пищевые привычки и способы приготовления. */
export type QuestionnaireCookingHabitsAndMethods = {
  usualCookingMethods: string;
  friedFoodFrequency: FrequencyNoSometimesOften;
  cookingTimeAvailable: CookingTimeAvailable;
  availableKitchenTools: string;
  sugarAddingFrequency: FrequencyNoSometimesOften;
  sweetDrinksFrequency: FrequencyNoSometimesOften;
  saltUsage: SaltUsage;
  spicySaucesAndSpicesUsage: FrequencyNoSometimesOften;
  easyToReplace: string;
  cookingMethodsToAvoid: string;
};

/**
 * Полная анкета по 8 шагам спецификации.
 * Используется как единая модель данных; плоские поля профиля в сидах могут дублировать часть значений для обратной совместимости с каркасом UI.
 */
export type ClientQuestionnaire = {
  basics: QuestionnaireBasics;
  goalAndDuration: QuestionnaireGoalAndDuration;
  medicalParticularities: QuestionnaireMedicalParticularities;
  dayScheduleAndWork: QuestionnaireDayScheduleAndWork;
  foodAndProducts: QuestionnaireFoodAndProducts;
  budgetSeasonAndAvailability: QuestionnaireBudgetSeasonAndAvailability;
  habitsDifficultiesAndSupport: QuestionnaireHabitsDifficultiesAndSupport;
  cookingHabitsAndMethods?: QuestionnaireCookingHabitsAndMethods;
};
