import type { TrainingRecord, TrainingSurface } from "@/lib/climbs-db";
import type { SurfaceOption } from "./types";

export const timeOptions = Array.from({ length: 24 * 4 }, (_value, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, "0");
  const minute = String((index % 4) * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});

export const gradeSurfaceLabels: Partial<Record<TrainingSurface, string>> = {
  lina: "Lina",
  baldy: "Baldy",
  moon: "Moon",
  kilter: "Kilter",
};

export const ropeGradeBases = ["4", "5", "6", "7", "8", "9"];
export const ropeGradeModifiers = ["a", "a+", "b", "b+", "c", "c+"];
export const boulderGymGrades = Array.from({ length: 9 }, (_value, index) =>
  String(index + 1),
);
export const boardGrades = Array.from(
  { length: 10 },
  (_value, index) => `V${index + 1}`,
);

const primarySurfaceOrder: TrainingSurface[] = [
  "lina",
  "baldy",
  "moon",
  "kilter",
  "spraywall",
];
const secondarySurfaceOrder: TrainingSurface[] = [
  "chwytotablica",
  "campus",
  "drazek",
];

export function getSurfaceOptionGroups(surfaceOptions: SurfaceOption[]) {
  const inOrder = (order: TrainingSurface[]) =>
    order.flatMap((surface) => {
      const option = surfaceOptions.find((item) => item.value === surface);
      return option ? [option] : [];
    });
  const ordered = new Set([...primarySurfaceOrder, ...secondarySurfaceOrder]);

  return {
    primary: inOrder(primarySurfaceOrder),
    secondary: inOrder(secondarySurfaceOrder),
    remaining: surfaceOptions.filter((option) => !ordered.has(option.value)),
  };
}

export function splitDifficultyGrades(value: string) {
  return value
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
}

export function adjustCaloriesValue(value: string, delta: number) {
  const nextValue = Math.max(0, (Number(value) || 0) + delta);
  return String(nextValue);
}

export function adjustSeriesValue(value: string, delta: number) {
  return String(Math.max(1, Math.trunc((Number(value) || 1) + delta)));
}

export function adjustLoadDeloadValue(value: string, delta: number) {
  return String(Math.min(200, Math.max(-200, (Number(value) || 0) + delta)));
}

export function adjustEdgeDepthValue(value: string, delta: number) {
  return String(Math.max(1, Math.trunc((Number(value) || 1) + delta)));
}

export function getGradeChipClassName(
  styles: Record<string, string>,
  surface: TrainingSurface,
  grade: string,
) {
  if (surface === "lina") {
    const match = /^(4|5|6|7|8|9)(a\+|a|b\+|b|c\+|c)$/.exec(grade);
    if (!match) return "";
    const [, base, modifier] = match;
    return [
      styles[`trainingSidebar__gradeChip--${base}`],
      styles[`trainingSidebar__gradeChip--${modifier}`],
    ].filter(Boolean).join(" ");
  }

  if (surface === "baldy") {
    return styles[`trainingSidebar__gradeChip--boulder-${grade}`] ?? "";
  }

  const gradeIndex = /^V(\d+)$/.exec(grade)?.[1];
  return gradeIndex && (surface === "moon" || surface === "kilter")
    ? styles[`trainingSidebar__gradeChip--${surface}-${gradeIndex}`] ?? ""
    : "";
}

export function getTrainingGradeGroups(training: TrainingRecord) {
  const groups = (Object.entries(training.difficultyBySurface ?? {}) as Array<
    [TrainingSurface, string]
  >)
    .filter(([surface, value]) => Boolean(gradeSurfaceLabels[surface] && value))
    .map(([surface, value]) => ({ surface, grades: splitDifficultyGrades(value) }))
    .filter((group) => group.grades.length > 0);

  if (groups.length > 0) return groups;

  const legacyBoardSurface = getLegacyBoardGradeSurface(training);
  if (legacyBoardSurface) {
    const grades = splitDifficultyGrades(training.difficultyNotes);
    return grades.length ? [{ surface: legacyBoardSurface, grades }] : [];
  }

  if (!training.surfaces.includes("lina")) return [];

  const grades = splitDifficultyGrades(training.difficultyNotes);
  return grades.length ? [{ surface: "lina" as const, grades }] : [];
}

export function hasTrainingGradeContent(training: TrainingRecord) {
  return getTrainingGradeGroups(training).length > 0;
}

export function formatReportedAttempts(training: TrainingRecord) {
  const entries = Object.entries(training.difficultyBySurface ?? {})
    .map(([surface, grades]) => ({
      surface: surface as TrainingSurface,
      count: splitDifficultyGrades(grades).length,
    }))
    .filter((entry) => entry.count > 0);

  if (!entries.length) {
    return String(getTrainingGradeGroups(training).reduce(
      (total, group) => total + group.grades.length,
      0,
    ));
  }

  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const breakdown = entries
    .map((entry) => `${gradeSurfaceLabels[entry.surface] ?? entry.surface}: ${entry.count}`)
    .join(", ");
  return `${total} (${breakdown})`;
}

function getLegacyBoardGradeSurface(training: TrainingRecord) {
  if (Object.keys(training.difficultyBySurface ?? {}).length > 0 || training.surfaces.includes("lina")) {
    return null;
  }

  const boardSurfaces = training.surfaces.filter(
    (surface): surface is "moon" | "kilter" | "baldy" =>
      surface === "moon" || surface === "kilter" || surface === "baldy",
  );
  return boardSurfaces.length === 1 && training.difficultyNotes.trim()
    ? boardSurfaces[0]
    : null;
}

export function formatSurfaces(training: TrainingRecord, surfaceOptions: SurfaceOption[]) {
  return [
    ...training.surfaces.map(
      (surface) => surfaceOptions.find((option) => option.value === surface)?.label ?? surface,
    ),
    training.customSessionType?.trim() || "",
  ].filter(Boolean).join(", ");
}