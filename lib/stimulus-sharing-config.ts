export const stimulusSharingRanges = [
  "0-25%",
  "25-50%",
  "50-75%",
  "75-100%",
  "100-125%",
  "125-150%",
  "150-175%",
  "175-200%",
  "200-225%",
  "225%+",
] as const;

export const defaultStimulusSharingLabels = [
  "ROZGRZEWKA",
  "ROZRUCH | PITU PITU",
  "TROCHĘ MI SIĘ NIE CHCIAŁO",
  "CZUJĘ, ŻE TO MOŻE MIEĆ JAKIŚ SENS",
  "CIŚNIEMY",
  "CZUJĘ, ŻE MAM CIAŁO",
  "JESZCZE TRZYMAM CHWYTY",
  "BYŁ WPIERDOL",
  "JAZDA Z KURWAMI",
  "JUTRO NIE WSTANĘ",
] as const;

export type StimulusSharingConfig = {
  labels: string[];
};

export const stimulusSharingStorageKey = "climberbook.stimulus-sharing-config";

export function getStimulusSharingLabel(
  percent: number | undefined,
  labels: readonly string[] = defaultStimulusSharingLabels,
) {
  if (percent === undefined) return "BRAK NORMY";
  const index = Math.min(9, Math.max(0, Math.floor(percent / 25)));
  return labels[index]?.trim() || defaultStimulusSharingLabels[index];
}

export function readStimulusSharingConfig(): StimulusSharingConfig {
  if (typeof window === "undefined") {
    return { labels: [...defaultStimulusSharingLabels] };
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(stimulusSharingStorageKey) ?? "null",
    ) as Partial<StimulusSharingConfig> | null;
    if (Array.isArray(stored?.labels) && stored.labels.length === 10) {
      return { labels: stored.labels.map((label) => String(label)) };
    }
  } catch {
    // Defaults are used for invalid or unavailable local settings.
  }

  return { labels: [...defaultStimulusSharingLabels] };
}
