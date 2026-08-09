import { NextResponse } from "next/server";
import { fetchOpenMeteoForecast } from "@/lib/server/open-meteo";

export const runtime = "nodejs";

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    is_day?: number;
    time?: string;
  };
};

function getCoordinate(value: string | null, minimum: number, maximum: number) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) &&
    coordinate >= minimum &&
    coordinate <= maximum
    ? coordinate
    : null;
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
    const data = await fetchOpenMeteoForecast<OpenMeteoResponse>(
      latitude,
      longitude,
      {
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,is_day",
        timezone: "auto",
      },
      5 * 60_000,
    );
    const current = data.current;
    if (!current || typeof current.time !== "string")
      throw new Error("weather_missing");

    return NextResponse.json({
      weather: {
        temperatureC: Math.round(current.temperature_2m ?? 0),
        humidityPercent: Math.round(current.relative_humidity_2m ?? 0),
        windKph: Math.round(current.wind_speed_10m ?? 0),
        isDaylight: current.is_day === 1,
        observedAt: current.time,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Aktualna pogoda jest chwilowo niedostępna." },
      { status: 502 },
    );
  }
}
