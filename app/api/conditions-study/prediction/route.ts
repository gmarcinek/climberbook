import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres";

export const runtime = "nodejs";

const scores = Array.from({ length: 11 }, (_, index) => index * 10);

type ResponseRow = {
  temperature_c: number;
  humidity_percent: number;
  wind_kph: number;
  score: number;
};

function getIntegerParameter(
  request: Request,
  name: string,
  minimum: number,
  maximum: number,
) {
  const value = Number(new URL(request.url).searchParams.get(name));
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function getWeight(
  input: { temperatureC: number; humidityPercent: number; windKph: number },
  response: ResponseRow,
) {
  const distanceSquared =
    ((input.temperatureC - response.temperature_c) / 7) ** 2 +
    ((input.humidityPercent - response.humidity_percent) / 18) ** 2 +
    ((input.windKph - response.wind_kph) / 12) ** 2;
  return Math.exp(-distanceSquared / 2);
}

export async function GET(request: Request) {
  const temperatureC = getIntegerParameter(request, "temperatureC", -20, 45);
  const humidityPercent = getIntegerParameter(
    request,
    "humidityPercent",
    0,
    100,
  );
  const windKph = getIntegerParameter(request, "windKph", 0, 150);
  if (temperatureC === null || humidityPercent === null || windKph === null) {
    return NextResponse.json(
      { error: "Podaj temperaturę, wilgotność i wiatr w dozwolonym zakresie." },
      { status: 400 },
    );
  }

  try {
    const result = await queryPostgres<ResponseRow>(`
      select temperature_c, humidity_percent, wind_kph, score
      from climbing_conditions_study_responses
    `);
    const input = { temperatureC, humidityPercent, windKph };
    const weightedScores = new Map(scores.map((score) => [score, 0]));
    let totalWeight = 0;
    let weightedScore = 0;

    for (const response of result.rows) {
      const weight = getWeight(input, response);
      totalWeight += weight;
      weightedScore += response.score * weight;
      weightedScores.set(
        response.score,
        (weightedScores.get(response.score) ?? 0) + weight,
      );
    }

    const fallbackProbability = 1 / scores.length;
    const probabilities = scores.map((score) => ({
      score,
      probability:
        totalWeight === 0
          ? fallbackProbability
          : (weightedScores.get(score) ?? 0) / totalWeight,
    }));
    const estimatedScore =
      totalWeight === 0
        ? null
        : Math.round((weightedScore / totalWeight) * 10) / 10;

    return NextResponse.json({
      input,
      estimatedScore,
      effectiveSampleSize: Math.round(totalWeight * 10) / 10,
      responseCount: result.rows.length,
      probabilities,
    });
  } catch (error) {
    console.error("Nie udało się wyliczyć predykcji warunków.", error);
    return NextResponse.json(
      { error: "Nie udało się wyliczyć predykcji." },
      { status: 500 },
    );
  }
}
