import type { TrainingRecord } from "@/lib/climbs-db";

const bouldersPerRopeAscent = 4.5;
const boardBouldersPerRopeAscent = 1.75;
const trainingLoadMultiplier = 2.4;
const maxSessionLoad = 120;

function countGrades(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean).length;
}

function getRopeGradeLoad(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim().toLowerCase())
    .filter(Boolean)
    .reduce((total, grade) => {
      const match = grade.match(/^(\d)([abc])(\+)?/);
      if (!match) return total + 1;

      const gradeNumber = Number(match[1]);
      const letterValue = { a: 0, b: 1, c: 2 }[match[2]] ?? 0;
      const gradeScore = (gradeNumber - 6) * 3 + letterValue + (match[3] ? 0.5 : 0);
      return total + Math.max(0.8, 1 + (gradeScore - 1) * 0.12);
    }, 0);
}

export function getTrainingLoad(training: TrainingRecord) {
  const ropeAscents = countGrades(
    training.difficultyBySurface?.lina ??
      (training.surfaces.includes("lina") ? training.difficultyNotes : ""),
  );
  const regularBoulderAscents = countGrades(training.difficultyBySurface?.baldy);
  const boardAscents = (["moon", "kilter"] as const).reduce(
    (total, surface) =>
      total + countGrades(training.difficultyBySurface?.[surface]),
    0,
  );
  const hasDetailedAscents = ropeAscents + regularBoulderAscents + boardAscents > 0;
  const hasRopeSurface = training.surfaces.includes("lina");
  const hasRegularBoulderSurface = training.surfaces.includes("baldy");
  const hasBoardSurface = training.surfaces.some(
    (surface) => surface === "moon" || surface === "kilter",
  );
  const fallbackAttempts =
    !hasDetailedAscents && hasRopeSurface && (hasRegularBoulderSurface || hasBoardSurface)
      ? training.attemptsCount / 2
      : training.attemptsCount;
  const fallbackRopeAscents =
    !hasDetailedAscents && hasRopeSurface ? fallbackAttempts : 0;
  const fallbackRegularBoulderAscents =
    !hasDetailedAscents && hasRegularBoulderSurface ? fallbackAttempts : 0;
  const fallbackBoardAscents =
    !hasDetailedAscents && hasBoardSurface ? fallbackAttempts : 0;
  const ropeGradeLoad = getRopeGradeLoad(
    training.difficultyBySurface?.lina ??
      (hasRopeSurface ? training.difficultyNotes : ""),
  );
  const ropeEquivalentAscents =
    (ropeAscents > 0 ? ropeGradeLoad : 0) +
    fallbackRopeAscents +
    (regularBoulderAscents + fallbackRegularBoulderAscents) / bouldersPerRopeAscent +
    (boardAscents + fallbackBoardAscents) / boardBouldersPerRopeAscent;
  const durationHours = Math.max(training.durationMinutes / 60, 0.5);
  const intensityMultiplier =
    1 + Math.min(0.75, ropeEquivalentAscents / durationHours / 20);
  const boardDemand = hasBoardSurface ? durationHours * 18 : 0;
  const calorieMultiplier =
    1 + Math.min(0.15, Math.max(0, training.caloriesBurned) / 1_000 * 0.15);
  const baseLoad = durationHours * 10 + ropeEquivalentAscents * 2 + boardDemand;

  return Math.min(
    maxSessionLoad,
    baseLoad * intensityMultiplier * trainingLoadMultiplier * calorieMultiplier,
  );
}