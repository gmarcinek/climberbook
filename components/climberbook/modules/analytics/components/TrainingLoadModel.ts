import type { TrainingRecord } from "@/lib/climbs-db";

const bouldersPerRopeAscent = 4.5;
const fatigueLoadMultiplier = 1.32;

function countGrades(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean).length;
}

export function getTrainingLoad(training: TrainingRecord) {
  const ropeAscents = countGrades(
    training.difficultyBySurface?.lina ??
      (training.surfaces.includes("lina") ? training.difficultyNotes : ""),
  );
  const boulderAscents = (["baldy", "moon", "kilter"] as const).reduce(
    (total, surface) =>
      total + countGrades(training.difficultyBySurface?.[surface]),
    0,
  );
  const hasDetailedAscents = ropeAscents + boulderAscents > 0;
  const hasRopeSurface = training.surfaces.includes("lina");
  const hasBoulderSurface = training.surfaces.some(
    (surface) => surface === "baldy" || surface === "moon" || surface === "kilter",
  );
  const fallbackAttempts =
    !hasDetailedAscents && hasRopeSurface && hasBoulderSurface
      ? training.attemptsCount / 2
      : training.attemptsCount;
  const fallbackRopeAscents =
    !hasDetailedAscents && hasRopeSurface ? fallbackAttempts : 0;
  const fallbackBoulderAscents =
    !hasDetailedAscents && hasBoulderSurface ? fallbackAttempts : 0;
  const ropeEquivalentAscents =
    ropeAscents +
    fallbackRopeAscents +
    (boulderAscents + fallbackBoulderAscents) / bouldersPerRopeAscent;
  const durationHours = Math.max(training.durationMinutes / 60, 0.5);
  const intensityMultiplier =
    1 + Math.min(0.75, ropeEquivalentAscents / durationHours / 20);
  const baseLoad = durationHours * 10 + ropeEquivalentAscents * 2;

  return Math.min(
    45 * fatigueLoadMultiplier,
    baseLoad * intensityMultiplier * fatigueLoadMultiplier,
  );
}