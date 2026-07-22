import type { TrainingDraftValues } from "@/components/training-calendar/TrainingSidebar";
import {
  formatDateIso,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import {
  createEmptyUserProfile,
  type TrainingRecord,
  type UserProfileRecord,
  type UserSex,
  type WeightEntryRecord,
} from "@/lib/climbs-db";

export type UserProfileDraft = {
  birthDate: string;
  sex: UserSex;
  heightCm: string;
  weightKg: string;
};

export type WeightEntryDraft = {
  date: string;
  time: string;
  weightKg: string;
};

export const ROPE_GRADE_SCALE = [
  "5a",
  "5a+",
  "5b",
  "5b+",
  "5c",
  "5c+",
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
];

const ropeGradeColors = [
  "#a8dd9a",
  "#aceb96",
  "#79d66a",
  "#4ab34d",
  "#288e38",
  "#176729",
  "#e8d353",
  "#ffe46f",
  "#ffcf3f",
  "#ffaf1f",
  "#ee8914",
  "#cb5f0d",
  "#83cde7",
  "#86d8f6",
  "#4abce7",
  "#218fce",
  "#1765ac",
  "#103d78",
  "#ec8dc2",
  "#f59acc",
  "#df6eb8",
  "#bd499e",
  "#913181",
  "#642060",
];

export function estimateTrainingCalories(input: {
  durationMinutes: string;
  bodyWeightKg: string;
  ageYears: string;
  attemptsCount: string;
}) {
  const durationMinutes = Number(input.durationMinutes);
  const bodyWeightKg = Number(input.bodyWeightKg);
  const ageYears = Number(input.ageYears);
  const attemptsCount = Number(input.attemptsCount);

  if (
    !durationMinutes ||
    !bodyWeightKg ||
    !ageYears ||
    attemptsCount < 0 ||
    Number.isNaN(attemptsCount)
  ) {
    return "";
  }

  const durationHours = durationMinutes / 60;
  const estimatedMet = Math.min(
    8.5,
    Math.max(
      4.5,
      4.8 +
        attemptsCount * 0.12 +
        Math.max(0, bodyWeightKg - 60) * 0.015 -
        Math.max(0, ageYears - 30) * 0.01,
    ),
  );

  return String(Math.round(estimatedMet * bodyWeightKg * durationHours));
}

export function formatDurationMinutes(value: number | string) {
  const durationMinutes = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} h`;
}

export function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function calculateAgeYears(birthDate: string, targetDate: string) {
  if (!birthDate || !targetDate) {
    return "";
  }

  const birth = toDate(birthDate);
  const target = toDate(targetDate);

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(target.getTime()) ||
    birth > target
  ) {
    return "";
  }

  let age = target.getFullYear() - birth.getFullYear();
  const monthOffset = target.getMonth() - birth.getMonth();

  if (
    monthOffset < 0 ||
    (monthOffset === 0 && target.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

export function formatWeightInput(value: number | null) {
  return value === null || Number.isNaN(value) ? "" : value.toFixed(1);
}

export function parseWeightInput(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replaceAll(",", "."));
  return Number.isNaN(parsed) ? null : roundToSingleDecimal(parsed);
}

export function parseHeightInput(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed);
}

export function createUserProfileDraft(
  profile: UserProfileRecord = createEmptyUserProfile(),
): UserProfileDraft {
  return {
    birthDate: profile.birthDate,
    sex: profile.sex,
    heightCm: profile.heightCm?.toString() ?? "",
    weightKg: formatWeightInput(profile.weightKg),
  };
}

export function createWeightEntryDraft(
  date = formatDateIso(new Date()),
  defaultWeightKg: number | null = null,
): WeightEntryDraft {
  return { date, time: "09:00", weightKg: formatWeightInput(defaultWeightKg) };
}

export function getLatestTrainingWeight(trainings: TrainingRecord[]) {
  const latestTraining = trainings.reduce<TrainingRecord | null>(
    (latest, training) => {
      if (
        !latest ||
        training.date > latest.date ||
        (training.date === latest.date && training.createdAt > latest.createdAt)
      ) {
        return training;
      }

      return latest;
    },
    null,
  );

  return latestTraining?.bodyWeightKg ?? null;
}

export function getLatestWeightEntry(entries: WeightEntryRecord[]) {
  return entries.reduce<WeightEntryRecord | null>((latest, entry) => {
    if (
      !latest ||
      `${entry.date}-${entry.time}` > `${latest.date}-${latest.time}` ||
      (entry.date === latest.date &&
        entry.time === latest.time &&
        entry.createdAt > latest.createdAt)
    ) {
      return entry;
    }

    return latest;
  }, null);
}

export function getWeekStartIso(value: string) {
  const date = toDate(value);
  const weekday = date.getDay();
  date.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return formatDateIso(date);
}

export function getRopeGradeIndex(grade: string) {
  return ROPE_GRADE_SCALE.indexOf(grade);
}

export function getRopeGradeColor(grade: string) {
  return ropeGradeColors[getRopeGradeIndex(grade)] ?? "#e19a24";
}

export function getRollingChartRange(daysBack = 28, daysForward = 3) {
  const today = toDate(new Date());
  const start = toDate(today);
  const end = toDate(today);
  start.setDate(start.getDate() - daysBack);
  end.setDate(end.getDate() + daysForward);

  return { start: formatDateIso(start), end: formatDateIso(end) };
}

export function getRollingChartTicks(start: string, end: string) {
  const ticks: number[] = [];
  const cursor = toDate(start);
  const endDate = toDate(end);

  while (cursor <= endDate) {
    ticks.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 7);
  }

  if (ticks.at(-1) !== endDate.getTime()) {
    ticks.push(endDate.getTime());
  }

  return ticks;
}

export function getGradeRank(grade: string) {
  const [firstGrade, secondGrade] = grade.trim().split("/");
  const firstRank = getSimpleGradeRank(firstGrade ?? "");

  if (!secondGrade) {
    return firstRank;
  }

  const inheritedBase = /^(\d+)/.exec(firstGrade ?? "")?.[1] ?? "";
  const secondRank = getSimpleGradeRank(
    /^\d/.test(secondGrade) ? secondGrade : `${inheritedBase}${secondGrade}`,
  );

  return firstRank >= 0 && secondRank >= 0
    ? (firstRank + secondRank) / 2
    : -1;
}

function getSimpleGradeRank(grade: string) {
  const match = /^(\d+)([abc])?(\+)?$/.exec(grade.trim());
  if (!match) {
    return -1;
  }

  return (
    Number(match[1]) * 10 +
    ({ a: 1, b: 3, c: 5 }[match[2] ?? ""] ?? 0) +
    (match[3] ? 1 : 0)
  );
}

export function getSortedWeightEntries(entries: WeightEntryRecord[]) {
  return entries
    .slice()
    .sort((left, right) =>
      `${left.date}-${left.time}-${left.createdAt}`.localeCompare(
        `${right.date}-${right.time}-${right.createdAt}`,
      ),
    );
}

export function normalizeTrainingDraft(
  draft: TrainingDraftValues,
  birthDate = "",
): TrainingDraftValues {
  const ageYears = calculateAgeYears(birthDate, draft.date);
  const estimatedCalories = estimateTrainingCalories({
    ...draft,
    ageYears,
    attemptsCount: "0",
  });

  return {
    ...draft,
    ageYears,
    caloriesBurned:
      draft.caloriesMode === "manual"
        ? draft.caloriesBurned
        : estimatedCalories,
  };
}
