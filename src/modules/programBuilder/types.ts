export type ProgramMealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "secondSnack";

export type ProgramMeal = {
  type: ProgramMealType;
  title: string;
  dish: string;
  portion: string;
  cooking: string;
  replacement: string;
};

export type ProgramDay = {
  dayNumber: number;
  mood: string;
  focus: string;
  habit: string;
  task: string;
  supportMessage: string;
  alternatives: {
    cafeOrCanteen: string;
    takeAway: string;
    quickOption: string;
  };
  meals: ProgramMeal[];
};

export type ProgramNutritionRules = {
  weightLossGoal: boolean;
  portionGuidance: string;
  medicalNote?: string;
  restrictions: string[];
};

export type PersonalProgram = {
  totalDays: number;
  startedAt: string;
  nutritionRules: ProgramNutritionRules;
  days: ProgramDay[];
};

