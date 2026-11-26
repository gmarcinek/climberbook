// Reverse geocoding via OpenStreetMap Nominatim. Their usage policy allows at most
// 1 request/second with an identifying User-Agent, so calls are serialized and cached.

export type GeoPlace = { place: string; country: string; countryCode: string };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "climberbook-personal-platform/1.0 (care photos)";
const MIN_INTERVAL_MS = 1100;
const cache = new Map<string, GeoPlace | null>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const cacheKey = (latitude: number, longitude: number) =>
  `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

type NominatimAddress = Record<string, string | undefined>;

function placeFromAddress(address: NominatimAddress) {
  return (
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.municipality ??
    address.suburb ??
    address.county ??
    address.state ??
    ""
  );
}

async function request(latitude: number, longitude: number): Promise<GeoPlace | null> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
  const url = `${NOMINATIM_URL}?format=jsonv2&zoom=14&addressdetails=1&accept-language=pl&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const body = (await response.json()) as { address?: NominatimAddress; error?: string };
  if (!body.address) return { place: "", country: "", countryCode: "" };
  return {
    place: placeFromAddress(body.address).slice(0, 160),
    country: (body.address.country ?? "").slice(0, 80),
    countryCode: (body.address.country_code ?? "").toUpperCase().slice(0, 2),
  };
}

/** Returns null when the lookup failed (try again later); empty strings when nothing is there. */
export function reverseGeocode(latitude: number, longitude: number): Promise<GeoPlace | null> {
  const key = cacheKey(latitude, longitude);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const result = queue.then(() =>
    cache.has(key) ? cache.get(key) ?? null : request(latitude, longitude),
  );
  queue = result.catch(() => undefined);
  return result.then(
    (place) => {
      cache.set(key, place);
      return place;
    },
    () => null,
  );
}
