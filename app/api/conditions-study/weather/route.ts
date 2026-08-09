import { NextResponse } from "next/server";

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

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,is_day",
    timezone: "auto",
  }).toString();

  try {
    const response = await fetch(weatherUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("weather_unavailable");
    const data = (await response.json()) as OpenMeteoResponse;
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
