export const CONDITIONS_STUDY_SCENARIO_VERSION = 5;

export const windCategories = [
  "calm",
  "breeze",
  "gusts",
  "strong",
  "halny",
] as const;
export const scenarioSources = ["geo-weather", "synthetic"] as const;

export type ConditionsStudyScenario = {
  version: typeof CONDITIONS_STUDY_SCENARIO_VERSION;
  source: (typeof scenarioSources)[number];
  temperatureC: number;
  humidityPercent: number;
  windKph: number;
  windCategory: (typeof windCategories)[number];
};

export type ConditionsStudySubmission = {
  respondentId: string;
  scenario: ConditionsStudyScenario;
  score: number;
};

function isOneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function isIntegerBetween(value: unknown, min: number, max: number) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

export function parseConditionsStudySubmission(
  input: unknown,
): ConditionsStudySubmission | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const scenario = value.scenario;
  if (!scenario || typeof scenario !== "object") return null;
  const fields = scenario as Record<string, unknown>;

  if (
    typeof value.respondentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.respondentId,
    ) ||
    !isIntegerBetween(value.score, 0, 100) ||
    fields.version !== CONDITIONS_STUDY_SCENARIO_VERSION ||
    !isOneOf(fields.source, scenarioSources) ||
    !isOneOf(fields.windCategory, windCategories) ||
    !isIntegerBetween(fields.temperatureC, -20, 45) ||
    !isIntegerBetween(fields.humidityPercent, 0, 100) ||
    !isIntegerBetween(fields.windKph, 0, 150)
  ) {
    return null;
  }

  return {
    respondentId: value.respondentId,
    score: value.score as number,
    scenario: {
      version: CONDITIONS_STUDY_SCENARIO_VERSION,
      source: fields.source,
      temperatureC: fields.temperatureC as number,
      humidityPercent: fields.humidityPercent as number,
      windKph: fields.windKph as number,
      windCategory: fields.windCategory,
    },
  };
}
