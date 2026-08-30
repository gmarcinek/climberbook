import type { HeartRateZone } from "@/lib/climbs-db";

export const heartRateZoneConfig = [
  { key: "z1", label: "Regeneracja", color: "#3b82f6", min: 0.5, max: 0.6 },
  { key: "z2", label: "Intensywna", color: "#22c55e", min: 0.6, max: 0.7 },
  { key: "z3", label: "Aerobowa", color: "#eab308", min: 0.7, max: 0.8 },
  { key: "z4", label: "Anaerobowa", color: "#f97316", min: 0.8, max: 0.9 },
  { key: "z5", label: "VO2max", color: "#ef4444", min: 0.9, max: 1 },
] as const satisfies ReadonlyArray<{
  key: HeartRateZone;
  label: string;
  color: string;
  min: number;
  max: number;
}>;

export function formatHeartRateZoneRange(
  zone: (typeof heartRateZoneConfig)[number],
  ageYears: number,
) {
  if (!Number.isFinite(ageYears) || ageYears <= 0) {
    return `${Math.round(zone.min * 100)}-${Math.round(zone.max * 100)}% HRmax`;
  }
  const estimatedMaxHeartRate = 208 - 0.7 * ageYears;
  return `${Math.round(estimatedMaxHeartRate * zone.min)}-${Math.round(estimatedMaxHeartRate * zone.max)} bpm`;
}

export function parseHeartRateZoneTime(value: string) {
  if (!value.trim()) return 0;
  if (/^\d{1,3}$/.test(value.trim())) return Number(value.trim()) * 60;
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatHeartRateZoneTime(totalSeconds: number | undefined) {
  if (!totalSeconds) return "";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (seconds === 0) return String(minutes);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
