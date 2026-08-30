import type { TrainingWeatherSnapshot } from "@/lib/climbs-db";

export const runtime = "nodejs";

const hourlyFields = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "wind_speed_10m",
  "relative_humidity_2m",
  "weather_code",
].join(",");

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    relative_humidity_2m?: number[];
    weather_code?: number[];
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

function getClosestHourlyIndex(hourlyTimes: string[], target: string) {
  const targetTime = new Date(target).getTime();
  if (!Number.isFinite(targetTime)) return -1;

  return hourlyTimes.reduce((closestIndex, hourlyTime, index) => {
    const closestDistance = Math.abs(
      new Date(hourlyTimes[closestIndex]).getTime() - targetTime,
    );
    const distance = Math.abs(new Date(hourlyTime).getTime() - targetTime);
    return distance < closestDistance ? index : closestIndex;
  }, 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const time = url.searchParams.get("time") ?? "";
  const latitude = getCoordinate(url.searchParams.get("latitude"), -90, 90);
  const longitude = getCoordinate(url.searchParams.get("longitude"), -180, 180);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return Response.json(
      { error: "Wymagana jest poprawna data i godzina treningu." },
      { status: 400 },
    );
  }
  if (latitude === null || longitude === null) {
    return Response.json(
      { error: "Wymagane są poprawne współrzędne obiektu." },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const weatherUrl = new URL(
    date < today
      ? "https://archive-api.open-meteo.com/v1/archive"
      : "https://api.open-meteo.com/v1/forecast",
  );
  weatherUrl.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: date,
    end_date: date,
    hourly: hourlyFields,
    timezone: "auto",
  }).toString();

  const weatherResponse = await fetch(weatherUrl, {
    next: { revalidate: 3600 },
  });
  if (!weatherResponse.ok) {
    return Response.json(
      { error: "Dane pogodowe są chwilowo niedostępne." },
      { status: 502 },
    );
  }
  const data = (await weatherResponse.json()) as OpenMeteoResponse;
  const target = `${date}T${time}`;
  const hourlyTimes = data.hourly?.time ?? [];
  const index = getClosestHourlyIndex(hourlyTimes, target);
  if (index < 0 || !data.hourly) {
    return Response.json(
      { error: "Brak danych pogodowych dla tej godziny." },
      { status: 404 },
    );
  }
  const weather: TrainingWeatherSnapshot = {
    source: "open-meteo",
    capturedAt: hourlyTimes[index],
    temperatureC: data.hourly.temperature_2m?.[index] ?? 0,
    apparentTemperatureC: data.hourly.apparent_temperature?.[index] ?? 0,
    precipitationMm: data.hourly.precipitation?.[index] ?? 0,
    windSpeedKmh: data.hourly.wind_speed_10m?.[index] ?? 0,
    relativeHumidity: data.hourly.relative_humidity_2m?.[index] ?? 0,
    wmo_code_wether: data.hourly.weather_code?.[index] ?? 0,
  };
  return Response.json({ weather });
}
