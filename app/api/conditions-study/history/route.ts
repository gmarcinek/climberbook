import { NextResponse } from "next/server";
import { fetchOpenMeteoForecast } from "@/lib/server/open-meteo";
import { queryPostgres } from "@/lib/server/postgres";

export const runtime = "nodejs";

const scores = Array.from({ length: 11 }, (_, index) => index * 10);

type OpenMeteoResponse = {
  current?: { time?: string };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
  };
};

type ResponseRow = {
  temperature_c: number;
  humidity_percent: number;
  wind_kph: number;
  score: number;
};

type ConditionsInput = {
  temperatureC: number;
  humidityPercent: number;
  windKph: number;
};

function getCoordinate(value: string | null, minimum: number, maximum: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum
    ? coordinate
    : null;
}

function getWeight(input: ConditionsInput, response: ResponseRow) {
  const distanceSquared =
    ((input.temperatureC - response.temperature_c) / 7) ** 2 +
    ((input.humidityPercent - response.humidity_percent) / 18) ** 2 +
    ((input.windKph - response.wind_kph) / 12) ** 2;
  return Math.exp(-distanceSquared / 2);
}

function estimateConditions(input: ConditionsInput, responses: ResponseRow[]) {
  const weightedScores = new Map(scores.map((score) => [score, 0]));
  let totalWeight = 0;
  let weightedScore = 0;

  for (const response of responses) {
    const weight = getWeight(input, response);
    totalWeight += weight;
    weightedScore += response.score * weight;
    weightedScores.set(
      response.score,
      (weightedScores.get(response.score) ?? 0) + weight,
    );
  }

  if (totalWeight === 0) {
    return { averageScore: null, peakScore: null };
  }

  const peakScore = scores.reduce((peak, score) =>
    (weightedScores.get(score) ?? 0) > (weightedScores.get(peak) ?? 0)
      ? score
      : peak,
  );
  return {
    averageScore: Math.round((weightedScore / totalWeight) * 10) / 10,
    peakScore,
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const latitude = getCoordinate(
    requestUrl.searchParams.get("latitude"),
    -90,
    90,
  );
  const longitude = getCoordinate(
    requestUrl.searchParams.get("longitude"),
    -180,
    180,
  );
  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { error: "Nieprawidłowa lokalizacja." },
      { status: 400 },
    );
  }

  try {
    const [weather, responseResult] = await Promise.all([
      fetchOpenMeteoForecast<OpenMeteoResponse>(
        latitude,
        longitude,
        {
          current: "temperature_2m",
          hourly: "temperature_2m,relative_humidity_2m,wind_speed_10m",
          past_days: "4",
          timezone: "auto",
        },
        30 * 60_000,
      ),
      queryPostgres<ResponseRow>(`
        select temperature_c, humidity_percent, wind_kph, score
        from climbing_conditions_study_responses
      `),
    ]);
    const hourly = weather.hourly;
    const currentTime = weather.current?.time;
    if (!hourly?.time?.length || !currentTime)
      throw new Error("weather_missing");

    const allHours = hourly.time.map((time, index) => ({
      time,
      temperatureC: Math.round(hourly.temperature_2m?.[index] ?? 0),
      humidityPercent: Math.round(hourly.relative_humidity_2m?.[index] ?? 0),
      windKph: Math.round(hourly.wind_speed_10m?.[index] ?? 0),
    }));
    const observedHours = allHours
      .filter((hour) => hour.time <= currentTime)
      .slice(-96);
    const forecastHours = allHours
      .filter((hour) => hour.time > currentTime)
      .slice(0, 48);
    const hours = [...observedHours, ...forecastHours].map((hour) => ({
      ...hour,
      ...estimateConditions(hour, responseResult.rows),
    }));

    if (observedHours.length !== 96 || forecastHours.length !== 48)
      throw new Error("history_incomplete");
    return NextResponse.json({
      hours,
      nowTime: observedHours.at(-1)?.time,
    });
  } catch (error) {
    console.error("Nie udało się pobrać historii warunków.", error);
    return NextResponse.json(
      { error: "Historia pogody jest chwilowo niedostępna." },
      { status: 502 },
    );
  }
}
