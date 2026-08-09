import { NextResponse } from "next/server";
import {
  CONDITIONS_STUDY_SCENARIO_VERSION,
  type ConditionsStudyScenario,
} from "@/lib/conditions-study";
import { queryPostgres } from "@/lib/server/postgres";

export const runtime = "nodejs";

type DistributionRow = {
  scenario_key: string;
  response_count: number;
};

type RespondentSequenceRow = {
  response_count: number;
};

type OptimumRow = {
  response_count: number;
  response_weight: number | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  wind_kph: number | null;
};

type ConditionsOptimum = {
  temperatureC: number;
  humidityPercent: number;
  windKph: number;
};

const refinementStartResponseCount = 100;
const refinementScenarioProbability = 0.75;

const respondentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createSeededRandom(respondentId: string, sequence: number) {
  const uuidParts = respondentId.replaceAll("-", "").match(/.{1,8}/g) ?? [];
  let seed = sequence >>> 0;
  for (const part of uuidParts) {
    seed = Math.imul(seed ^ Number.parseInt(part, 16), 0x45d9f3b) >>> 0;
  }

  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomInteger(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function choose<T>(random: () => number, values: readonly T[]) {
  return values[randomInteger(random, 0, values.length - 1)];
}

const syntheticWindBands = [
  { min: 0, max: 4, weight: 0.2 },
  { min: 5, max: 14, weight: 0.38 },
  { min: 15, max: 35, weight: 0.3 },
  { min: 36, max: 64, weight: 0.1 },
  { min: 65, max: 75, weight: 0.02 },
] as const;

const syntheticHumidityBands = [
  { min: 0, max: 25, weight: 0.12 },
  { min: 26, max: 40, weight: 0.18 },
  { min: 41, max: 70, weight: 0.4 },
  { min: 71, max: 95, weight: 0.23 },
  { min: 96, max: 99, weight: 0.04 },
  { min: 100, max: 100, weight: 0.03 },
] as const;

function chooseWeightedWindBand(random: () => number) {
  let remainingWeight = random();
  for (const band of syntheticWindBands) {
    remainingWeight -= band.weight;
    if (remainingWeight < 0) return band;
  }
  return syntheticWindBands[syntheticWindBands.length - 1];
}

function chooseWeightedHumidityBand(random: () => number) {
  let remainingWeight = random();
  for (const band of syntheticHumidityBands) {
    remainingWeight -= band.weight;
    if (remainingWeight < 0) return band;
  }
  return syntheticHumidityBands[syntheticHumidityBands.length - 1];
}

function getWindCategory(windKph: number) {
  if (windKph <= 4) return "calm" as const;
  if (windKph <= 14) return "breeze" as const;
  if (windKph <= 35) return "gusts" as const;
  if (windKph <= 64) return "strong" as const;
  return "halny" as const;
}

function getTemperatureBand(temperatureC: number) {
  if (temperatureC <= 5) return "cold";
  if (temperatureC <= 15) return "cool";
  if (temperatureC <= 25) return "mild";
  return "hot";
}

function getHumidityBand(humidityPercent: number) {
  if (humidityPercent <= 25) return "very-dry";
  if (humidityPercent <= 40) return "dry";
  if (humidityPercent <= 70) return "normal";
  if (humidityPercent <= 95) return "humid";
  if (humidityPercent <= 99) return "very-humid";
  return "saturated";
}

function getScenarioKey(scenario: ConditionsStudyScenario) {
  return [
    getTemperatureBand(scenario.temperatureC),
    getHumidityBand(scenario.humidityPercent),
    scenario.windCategory,
  ].join(":");
}

function getScenarioSamplingWeight(scenario: ConditionsStudyScenario) {
  return (
    (syntheticWindBands.find(
      (band) => scenario.windKph >= band.min && scenario.windKph <= band.max,
    )?.weight ?? 1) *
    (syntheticHumidityBands.find(
      (band) =>
        scenario.humidityPercent >= band.min &&
        scenario.humidityPercent <= band.max,
    )?.weight ?? 1)
  );
}

function createSyntheticScenario(
  random: () => number,
): ConditionsStudyScenario {
  const windBand = chooseWeightedWindBand(random);
  const humidityBand = chooseWeightedHumidityBand(random);
  const windKph = randomInteger(random, windBand.min, windBand.max);

  return {
    version: CONDITIONS_STUDY_SCENARIO_VERSION,
    source: "synthetic",
    temperatureC: randomInteger(random, -3, 34),
    humidityPercent: randomInteger(random, humidityBand.min, humidityBand.max),
    windKph,
    windCategory: getWindCategory(windKph),
  };
}

function getConditionsOptimum(row: OptimumRow): ConditionsOptimum | null {
  if (
    row.response_count < refinementStartResponseCount ||
    (row.response_weight ?? 0) === 0 ||
    row.temperature_c === null ||
    row.humidity_percent === null ||
    row.wind_kph === null
  ) {
    return null;
  }

  return {
    temperatureC: Math.round(row.temperature_c),
    humidityPercent: Math.round(row.humidity_percent),
    windKph: Math.round(row.wind_kph),
  };
}

function createRefinementScenario(
  random: () => number,
  optimum: ConditionsOptimum,
): ConditionsStudyScenario {
  const focus = choose(random, ["temperature", "humidity", "wind"] as const);
  const temperatureC = clamp(
    optimum.temperatureC +
      randomInteger(
        random,
        focus === "temperature" ? -6 : -1,
        focus === "temperature" ? 6 : 1,
      ),
    -3,
    34,
  );
  const humidityPercent = clamp(
    optimum.humidityPercent +
      randomInteger(
        random,
        focus === "humidity" ? -12 : -2,
        focus === "humidity" ? 12 : 2,
      ),
    0,
    100,
  );
  const windKph = clamp(
    optimum.windKph +
      randomInteger(
        random,
        focus === "wind" ? -10 : -2,
        focus === "wind" ? 10 : 2,
      ),
    0,
    75,
  );

  return {
    version: CONDITIONS_STUDY_SCENARIO_VERSION,
    source: "synthetic",
    temperatureC,
    humidityPercent,
    windKph,
    windCategory: getWindCategory(windKph),
  };
}

export async function GET(request: Request) {
  const respondentId = new URL(request.url).searchParams.get("respondentId");
  if (!respondentId || !respondentIdPattern.test(respondentId)) {
    return NextResponse.json(
      { error: "Nieprawidłowy identyfikator respondenta." },
      { status: 400 },
    );
  }

  try {
    const [result, respondentResult, optimumResult] = await Promise.all([
      queryPostgres<DistributionRow>(`
      select
        concat_ws(
          ':',
          case
            when temperature_c <= 5 then 'cold'
            when temperature_c <= 15 then 'cool'
            when temperature_c <= 25 then 'mild'
            else 'hot'
          end,
          case
            when humidity_percent <= 25 then 'very-dry'
            when humidity_percent <= 40 then 'dry'
            when humidity_percent <= 70 then 'normal'
            when humidity_percent <= 95 then 'humid'
            when humidity_percent <= 99 then 'very-humid'
            else 'saturated'
          end,
          wind_category
        ) as scenario_key,
        count(*)::int as response_count
      from climbing_conditions_study_responses
      group by 1
      `),
      queryPostgres<RespondentSequenceRow>(
        `select count(*)::int as response_count
         from climbing_conditions_study_responses
         where respondent_id = $1`,
        [respondentId],
      ),
      queryPostgres<OptimumRow>(`
        with weighted_responses as (
          select
            temperature_c,
            humidity_percent,
            wind_kph,
            greatest(score - 50, 0) as weight
          from climbing_conditions_study_responses
        )
        select
          count(*)::int as response_count,
          sum(weight)::float8 as response_weight,
          (sum(temperature_c * weight) / nullif(sum(weight), 0))::float8 as temperature_c,
          (sum(humidity_percent * weight) / nullif(sum(weight), 0))::float8 as humidity_percent,
          (sum(wind_kph * weight) / nullif(sum(weight), 0))::float8 as wind_kph
        from weighted_responses
      `),
    ]);
    const counts = new Map(
      result.rows.map((row) => [row.scenario_key, row.response_count]),
    );
    const sequence = respondentResult.rows[0]?.response_count ?? 0;
    const random = createSeededRandom(respondentId, sequence);
    const optimum = getConditionsOptimum(
      optimumResult.rows[0] ?? {
        response_count: 0,
        response_weight: null,
        temperature_c: null,
        humidity_percent: null,
        wind_kph: null,
      },
    );
    const candidates = Array.from({ length: 24 }, () =>
      createSyntheticScenario(random),
    );
    const scenario =
      optimum && random() < refinementScenarioProbability
        ? createRefinementScenario(random, optimum)
        : random() < 0.2
          ? choose(random, candidates)
          : candidates.reduce((rarest, candidate) =>
              (counts.get(getScenarioKey(candidate)) ?? 0) /
                getScenarioSamplingWeight(candidate) <
              (counts.get(getScenarioKey(rarest)) ?? 0) /
                getScenarioSamplingWeight(rarest)
                ? candidate
                : rarest,
            );

    return NextResponse.json({ scenario });
  } catch (error) {
    console.error(
      "Nie udało się wygenerować scenariusza badania warunków.",
      error,
    );
    return NextResponse.json(
      { error: "Nie udało się wygenerować scenariusza." },
      { status: 500 },
    );
  }
}
