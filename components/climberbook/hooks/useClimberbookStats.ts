"use client";

import { useMemo } from "react";
import {
  calculateAgeYears,
  getGradeRank,
  getLatestTrainingWeight,
  getLatestWeightEntry,
  getRollingChartRange,
  getSortedWeightEntries,
  getWeekStartIso,
  parseWeightInput,
  roundToSingleDecimal,
  type UserProfileDraft,
} from "@/components/climberbook/common/training";
import {
  formatDateIso,
  getTrainingsForDate,
  getTrainingsInRange,
  getVisibleRange,
  groupTrainingsByDate,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import type {
  AscentRecord,
  TrainingRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";

type UseClimberbookStatsOptions = {
  ascents: AscentRecord[];
  isMobileChartLayout: boolean;
  profileDraft: UserProfileDraft;
  selectedDate: string | null;
  today: string;
  trainingRangeStart: string;
  trainings: TrainingRecord[];
  weightEntries: WeightEntryRecord[];
};

export function useClimberbookStats({
  ascents,
  isMobileChartLayout,
  profileDraft,
  selectedDate,
  today,
  trainingRangeStart,
  trainings,
  weightEntries,
}: UseClimberbookStatsOptions) {
  const visibleRange = useMemo(
    () => getVisibleRange(trainingRangeStart, 1),
    [trainingRangeStart],
  );
  const trainingsByDate = useMemo(
    () =>
      new Map(
        groupTrainingsByDate(trainings).map((group) => [
          group.date,
          group.trainings,
        ]),
      ),
    [trainings],
  );
  const selectedDayTrainings = useMemo(
    () => (selectedDate ? getTrainingsForDate(trainings, selectedDate) : []),
    [selectedDate, trainings],
  );
  const visibleRangeTrainings = useMemo(
    () => getTrainingsInRange(trainings, visibleRange.start, visibleRange.end),
    [trainings, visibleRange.end, visibleRange.start],
  );
  const totalTrainingTime = trainings.reduce(
    (sum, item) => sum + item.durationMinutes,
    0,
  );
  const totalCalories = trainings.reduce(
    (sum, item) => sum + item.caloriesBurned,
    0,
  );
  const averageWeight = trainings.length
    ? (
        trainings.reduce((sum, item) => sum + item.bodyWeightKg, 0) /
        trainings.length
      ).toFixed(1)
    : "-";
  const totalAttempts = trainings.reduce(
    (sum, item) => sum + item.attemptsCount,
    0,
  );
  const chartRange = useMemo(
    () =>
      getRollingChartRange(
        isMobileChartLayout ? 13 : 28,
        isMobileChartLayout ? 0 : 3,
      ),
    [isMobileChartLayout],
  );
  const chartRangeLabel = isMobileChartLayout
    ? "Ostatnie 14 dni"
    : "28 dni wstecz + 3 dni";
  const weeklyTrainingStats = useMemo(() => {
    const weeks = new Map<
      string,
      { week: string; duration: number; attempts: number }
    >();
    const firstWeek = getWeekStartIso(chartRange.start);
    const lastWeek = getWeekStartIso(chartRange.end);
    const cursor = toDate(firstWeek);

    while (formatDateIso(cursor) <= lastWeek) {
      const week = formatDateIso(cursor);
      weeks.set(week, { week, duration: 0, attempts: 0 });
      cursor.setDate(cursor.getDate() + 7);
    }

    trainings
      .filter(
        (training) =>
          training.date >= chartRange.start && training.date <= chartRange.end,
      )
      .forEach((training) => {
        const week = getWeekStartIso(training.date);
        const current = weeks.get(week);

        if (!current) {
          return;
        }

        current.duration += training.durationMinutes;
        current.attempts += training.attemptsCount;
        weeks.set(week, current);
      });

    return Array.from(weeks.values()).sort((left, right) =>
      left.week.localeCompare(right.week),
    );
  }, [chartRange, trainings]);
  const gradeDistribution = useMemo(() => {
    const grades = new Map<string, number>();

    trainings.forEach((training) => {
      training.difficultyNotes
        .split(",")
        .map((grade) => grade.trim())
        .filter(Boolean)
        .forEach((grade) => grades.set(grade, (grades.get(grade) ?? 0) + 1));
    });

    return Array.from(grades, ([grade, count]) => ({ grade, count })).sort(
      (left, right) => getGradeRank(right.grade) - getGradeRank(left.grade),
    );
  }, [trainings]);
  const highestGrade = gradeDistribution[0]?.grade ?? "-";
  const panelAscents = ascents.filter((item) => item.source === "panel").length;
  const rockAscents = ascents.filter((item) => item.source === "skala").length;
  const latestRecordedWeight = useMemo(
    () => getLatestWeightEntry(weightEntries),
    [weightEntries],
  );
  const latestTrainingWeightKg = useMemo(
    () => getLatestTrainingWeight(trainings),
    [trainings],
  );
  const fallbackWeightKg = parseWeightInput(profileDraft.weightKg);
  const defaultTrainingWeightKg =
    latestRecordedWeight?.weightKg ??
    latestTrainingWeightKg ??
    fallbackWeightKg;
  const currentAge = calculateAgeYears(profileDraft.birthDate, today);
  const recentWeightEntries = useMemo(
    () =>
      weightEntries
        .slice()
        .sort((left, right) =>
          `${right.date}-${right.time}-${right.createdAt}`.localeCompare(
            `${left.date}-${left.time}-${left.createdAt}`,
          ),
        )
        .slice(0, 12),
    [weightEntries],
  );
  const sortedWeightEntries = useMemo(
    () => getSortedWeightEntries(weightEntries),
    [weightEntries],
  );
  const latestWeightChange = useMemo(() => {
    if (sortedWeightEntries.length < 2) {
      return null;
    }

    const current = sortedWeightEntries[sortedWeightEntries.length - 1];
    const previous = sortedWeightEntries[sortedWeightEntries.length - 2];
    return roundToSingleDecimal(current.weightKg - previous.weightKg);
  }, [sortedWeightEntries]);
  const currentCalendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pl-PL", {
        month: "long",
        year: "numeric",
      }).format(toDate(trainingRangeStart)),
    [trainingRangeStart],
  );
  const weightChartEntries = useMemo(
    () =>
      sortedWeightEntries.filter(
        (entry) =>
          entry.date >= chartRange.start && entry.date <= chartRange.end,
      ),
    [chartRange, sortedWeightEntries],
  );

  return {
    averageWeight,
    chartRange,
    chartRangeLabel,
    currentAge,
    currentCalendarMonthLabel,
    defaultTrainingWeightKg,
    gradeDistribution,
    highestGrade,
    latestRecordedWeight,
    latestTrainingWeightKg,
    latestWeightChange,
    panelAscents,
    recentWeightEntries,
    rockAscents,
    selectedDayTrainings,
    sortedWeightEntries,
    totalAttempts,
    totalCalories,
    totalTrainingTime,
    trainingsByDate,
    visibleRange,
    visibleRangeTrainings,
    weeklyTrainingStats,
    weightChartEntries,
  };
}
