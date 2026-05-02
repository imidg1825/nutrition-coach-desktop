const RECOVERY_STATE_STORAGE_KEY = "nutrition.recoveryState";
const MAX_RECOVERY_DAYS = 3;

export type RecoveryTriggerScenario =
  | "overeating"
  | "sweetsCraving"
  | "fatigueChaoticDay"
  | "eveningSnacking"
  | "noTimeToCook";

export type RecoveryState = {
  active: boolean;
  remainingDays: number;
  triggeredBy: RecoveryTriggerScenario[];
  startedFromDay: number;
  updatedAt: string;
};

type ActivateOrRefreshRecoveryInput = {
  currentDay: number;
  triggeredBy: RecoveryTriggerScenario[];
  durationDays: number;
};

function clampRemainingDays(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_RECOVERY_DAYS, Math.floor(value)));
}

function isTriggerScenario(value: unknown): value is RecoveryTriggerScenario {
  return (
    value === "overeating" ||
    value === "sweetsCraving" ||
    value === "fatigueChaoticDay" ||
    value === "eveningSnacking" ||
    value === "noTimeToCook"
  );
}

function normalizeTriggeredBy(values: unknown[]): RecoveryTriggerScenario[] {
  const unique = new Set<RecoveryTriggerScenario>();
  values.forEach((value) => {
    if (isTriggerScenario(value)) unique.add(value);
  });
  return Array.from(unique);
}

function validateRecoveryState(value: unknown): RecoveryState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<RecoveryState>;

  const remainingDays = clampRemainingDays(
    typeof raw.remainingDays === "number" ? raw.remainingDays : 0,
  );
  const startedFromDay =
    typeof raw.startedFromDay === "number" && raw.startedFromDay > 0
      ? Math.floor(raw.startedFromDay)
      : 0;
  const triggeredBy = normalizeTriggeredBy(
    Array.isArray(raw.triggeredBy) ? raw.triggeredBy : [],
  );
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : "";
  const active = Boolean(raw.active) && remainingDays > 0;

  if (!active) return null;
  if (startedFromDay <= 0) return null;

  return {
    active,
    remainingDays,
    triggeredBy,
    startedFromDay,
    updatedAt: updatedAt || new Date().toISOString(),
  };
}

export function readRecoveryState(): RecoveryState | null {
  try {
    const raw = localStorage.getItem(RECOVERY_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validateRecoveryState(parsed);
  } catch {
    return null;
  }
}

export function writeRecoveryState(state: RecoveryState): void {
  const normalized = validateRecoveryState(state);
  if (!normalized) {
    clearRecoveryState();
    return;
  }
  try {
    localStorage.setItem(RECOVERY_STATE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // no-op
  }
}

export function clearRecoveryState(): void {
  try {
    localStorage.removeItem(RECOVERY_STATE_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function isRecoveryActive(
  state: RecoveryState | null | undefined,
): state is RecoveryState {
  return Boolean(state && state.active && state.remainingDays > 0);
}

export function activateOrRefreshRecovery(
  input: ActivateOrRefreshRecoveryInput,
): RecoveryState {
  const existing = readRecoveryState();
  const incomingDays = clampRemainingDays(input.durationDays);
  const safeDuration = incomingDays > 0 ? incomingDays : 1;
  const mergedTriggeredBy = normalizeTriggeredBy([
    ...(existing?.triggeredBy ?? []),
    ...input.triggeredBy,
  ]);

  const next: RecoveryState = {
    active: true,
    // Если recovery уже активен, не сокращаем мягкий режим; берём большее значение, но не больше 3 дней.
    remainingDays: clampRemainingDays(
      Math.max(existing?.remainingDays ?? 0, safeDuration),
    ),
    triggeredBy: mergedTriggeredBy,
    startedFromDay: Math.max(1, Math.floor(input.currentDay)),
    updatedAt: new Date().toISOString(),
  };

  writeRecoveryState(next);
  return next;
}

export function decrementRecoveryAfterCompletion(): RecoveryState | null {
  const current = readRecoveryState();
  if (!current || !isRecoveryActive(current)) return null;

  const nextRemainingDays = clampRemainingDays(current.remainingDays - 1);
  if (nextRemainingDays <= 0) {
    clearRecoveryState();
    return null;
  }

  const next: RecoveryState = {
    ...current,
    remainingDays: nextRemainingDays,
    active: true,
    updatedAt: new Date().toISOString(),
  };
  writeRecoveryState(next);
  return next;
}
