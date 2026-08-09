const MAX_CACHE_ENTRIES = 500;
const WEATHER_CACHE_CELL_KM = 15;
const KILOMETERS_PER_LATITUDE_DEGREE = 111.32;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type ForecastParams = Record<string, string>;

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

function pruneCache(now: number) {
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }

  while (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
}

export function getWeatherCacheCell(latitude: number, longitude: number) {
  const latitudeCellDegrees =
    WEATHER_CACHE_CELL_KM / KILOMETERS_PER_LATITUDE_DEGREE;
  const longitudeCellDegrees =
    WEATHER_CACHE_CELL_KM /
    (KILOMETERS_PER_LATITUDE_DEGREE *
      Math.max(Math.cos((latitude * Math.PI) / 180), 0.1));
  const cellLatitude =
    (Math.floor(latitude / latitudeCellDegrees) + 0.5) * latitudeCellDegrees;
  const cellLongitude =
    (Math.floor(longitude / longitudeCellDegrees) + 0.5) * longitudeCellDegrees;

  return {
    latitude: Math.max(-90, Math.min(90, Number(cellLatitude.toFixed(4)))),
    longitude: Math.max(-180, Math.min(180, Number(cellLongitude.toFixed(4)))),
  };
}

export async function fetchOpenMeteoForecast<T>(
  latitude: number,
  longitude: number,
  params: ForecastParams,
  cacheTtlMs: number,
) {
  const cacheCell = getWeatherCacheCell(latitude, longitude);
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.search = new URLSearchParams({
    latitude: String(cacheCell.latitude),
    longitude: String(cacheCell.longitude),
    ...params,
  }).toString();
  const cacheKey = weatherUrl.toString();
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.value as T;

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const request = fetch(weatherUrl, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("weather_unavailable");
      const value = await response.json();
      pruneCache(Date.now());
      responseCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + cacheTtlMs,
      });
      return value;
    })
    .finally(() => pendingRequests.delete(cacheKey));

  pendingRequests.set(cacheKey, request);
  return request as Promise<T>;
}
