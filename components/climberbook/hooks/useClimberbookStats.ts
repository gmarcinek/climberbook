"use client";

import { useMemo } from "react";
import {
  calculateAgeYears,
  getGradeRank,
  getLatestTrainingWeight,
  getLatestWeightEntry,
  getRopeGradeColor,
  getRopeGradeIndex,
  getRollingChartRange,
  getSortedWeightEntries,
  getWeekStartIso,
  parseWeightInput,
  roundToSingleDecimal,
  type UserProfileDraft,
} from "@/components/climberbook/common/training";
import {
  addDays,
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
  TrainingSurface,
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

function getTrainingGradeRank(grade: string) {
  const boardGrade = /^V(\d+)$/.exec(grade);

  return boardGrade ? 1000 + Number(boardGrade[1]) : getGradeRank(grade);
}

function isGradeCompatibleWithSurface(
  surface: "moon" | "kilter" | "baldy",
  grade: string,
) {
  if (surface === "baldy") {
    const boulderGrade = Number(grade);
    return (
      Number.isInteger(boulderGrade) && boulderGrade >= 1 && boulderGrade <= 9
    );
  }

  return /^V\d+$/.test(grade);
}

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
  const resolveAscentGrade = (grade: string) => {
    const trimmed = grade.trim();

    if (!trimmed) {
      return {
        label: "Brak",
        gradeIndex: -1,
        gradeRank: -1,
        color: "#b9b0a8",
      };
    }

    const directIndex = getRopeGradeIndex(trimmed);

    if (directIndex >= 0) {
      return {
        label: trimmed,
        gradeIndex: directIndex,
        gradeRank: getGradeRank(trimmed),
        color: getRopeGradeColor(trimmed),
      };
    }

    const fallback = trimmed.match(/\d+[abc]\+?/i)?.[0] ?? "";
    const fallbackIndex = fallback ? getRopeGradeIndex(fallback) : -1;

    return {
      label: trimmed,
      gradeIndex: fallbackIndex,
      gradeRank: fallback ? getGradeRank(fallback) : -1,
      color: fallbackIndex >= 0 ? getRopeGradeColor(fallback) : "#b9b0a8",
    };
  };
  const latestAscentDate = useMemo(() => {
    if (ascents.length === 0) {
      return null;
    }

    return ascents.reduce(
      (latest, ascent) =>
        ascent.date.localeCompare(latest) > 0 ? ascent.date : latest,
      ascents[0]?.date ?? "",
    );
  }, [ascents]);
  const earliestAscentDate = useMemo(() => {
    if (ascents.length === 0) {
      return null;
    }

    return ascents.reduce(
      (earliest, ascent) =>
        ascent.date.localeCompare(earliest) < 0 ? ascent.date : earliest,
      ascents[0]?.date ?? "",
    );
  }, [ascents]);
  const weeklyTrainingStats = useMemo(() => {
    const weeks = new Map<
      string,
      {
        week: string;
        totalHours: number;
        ropeHours: number;
        boulderHours: number;
        boardHours: number;
        sprayCircuitHours: number;
      }
    >();
    const firstWeek = getWeekStartIso(chartRange.start);
    const lastWeek = getWeekStartIso(chartRange.end);
    const cursor = toDate(firstWeek);

    while (formatDateIso(cursor) <= lastWeek) {
      const week = formatDateIso(cursor);
      weeks.set(week, {
        week,
        totalHours: 0,
        ropeHours: 0,
        boulderHours: 0,
        boardHours: 0,
        sprayCircuitHours: 0,
      });
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

        const durationHours = training.durationMinutes / 60;
        const hourGroups = [
          training.surfaces.includes("lina") ? "ropeHours" : null,
          training.surfaces.includes("baldy") ? "boulderHours" : null,
          training.surfaces.some(
            (surface) => surface === "moon" || surface === "kilter",
          )
            ? "boardHours"
            : null,
          training.surfaces.includes("spraywall") ||
          /obw[oó]d/i.test(training.customSessionType ?? "")
            ? "sprayCircuitHours"
            : null,
        ].filter(
          (
            group,
          ): group is
            | "ropeHours"
            | "boulderHours"
            | "boardHours"
            | "sprayCircuitHours" => group !== null,
        );

        current.totalHours += durationHours;

        if (hourGroups.length) {
          const hoursPerGroup = durationHours / hourGroups.length;

          hourGroups.forEach((group) => {
            current[group] += hoursPerGroup;
          });
        }
        weeks.set(week, current);
      });

    return Array.from(weeks.values())
      .map((week) => ({
        ...week,
        totalHours: roundToSingleDecimal(week.totalHours),
        ropeHours: roundToSingleDecimal(week.ropeHours),
        boulderHours: roundToSingleDecimal(week.boulderHours),
        boardHours: roundToSingleDecimal(week.boardHours),
        sprayCircuitHours: roundToSingleDecimal(week.sprayCircuitHours),
      }))
      .sort((left, right) => left.week.localeCompare(right.week));
  }, [chartRange, trainings]);
  const weeklyAscentStats = useMemo(() => {
    const weeks = new Map<
      string,
      { week: string; total: number; panel: number; rock: number }
    >();
    const endDate = latestAscentDate ?? today;
    const lastWeek = getWeekStartIso(endDate);
    const firstWeek = formatDateIso(addDays(lastWeek, -7 * 11));
    const cursor = toDate(firstWeek);

    while (formatDateIso(cursor) <= lastWeek) {
      const week = formatDateIso(cursor);
      weeks.set(week, { week, total: 0, panel: 0, rock: 0 });
      cursor.setDate(cursor.getDate() + 7);
    }

    ascents
      .filter((ascent) => ascent.date >= firstWeek && ascent.date <= lastWeek)
      .forEach((ascent) => {
        const week = getWeekStartIso(ascent.date);
        const current = weeks.get(week);

        if (!current) {
          return;
        }

        current.total += 1;

        if (ascent.source === "panel") {
          current.panel += 1;
        } else {
          current.rock += 1;
        }

        weeks.set(week, current);
      });

    return Array.from(weeks.values()).sort((left, right) =>
      left.week.localeCompare(right.week),
    );
  }, [ascents, latestAscentDate, today]);
  const ascentChartRangeLabel =
    earliestAscentDate && latestAscentDate
      ? `${new Intl.DateTimeFormat("pl-PL", {
          month: "2-digit",
          year: "numeric",
        }).format(toDate(earliestAscentDate))} - ${new Intl.DateTimeFormat(
          "pl-PL",
          {
            month: "2-digit",
            year: "numeric",
          },
        ).format(toDate(latestAscentDate))}`
      : "Brak wpisów";
  const ascentTimelineStats = useMemo(() => {
    const attemptsByRoute = new Map<string, number>();

    return ascents
      .slice()
      .sort((left, right) =>
        `${left.date}-${left.createdAt}-${left.id ?? 0}`.localeCompare(
          `${right.date}-${right.createdAt}-${right.id ?? 0}`,
        ),
      )
      .map((ascent) => {
        const suggested = resolveAscentGrade(ascent.suggestedGrade);
        const subjective = resolveAscentGrade(ascent.subjectiveGrade);
        const routeKey = ascent.routeName.trim().toLocaleLowerCase();
        const attemptCount = (attemptsByRoute.get(routeKey) ?? 0) + 1;

        attemptsByRoute.set(routeKey, attemptCount);

        return {
          id: ascent.id ?? `${ascent.date}-${ascent.routeName}`,
          date: ascent.date,
          routeName: ascent.routeName,
          source: ascent.source,
          ascentStyle: ascent.style,
          notes: ascent.notes,
          suggestedGrade: suggested.label,
          subjectiveGrade: subjective.label,
          hasSubjectiveGrade: ascent.subjectiveGrade.trim().length > 0,
          suggestedGradeIndex: suggested.gradeIndex,
          subjectiveGradeIndex: subjective.gradeIndex,
          suggestedColor: suggested.color,
          subjectiveColor: subjective.color,
          attemptCount,
        };
      });
  }, [ascents]);
  const ascentGradeFrequency = useMemo(() => {
    const grades = new Map<
      string,
      {
        grade: string;
        suggestedCount: number;
        subjectiveCount: number;
        totalCount: number;
      }
    >();

    ascents.forEach((ascent) => {
      const suggestedGrade = ascent.suggestedGrade.trim();

      if (suggestedGrade) {
        const suggestedMeta = resolveAscentGrade(suggestedGrade);
        const current = grades.get(suggestedGrade) ?? {
          grade: suggestedGrade,
          suggestedCount: 0,
          subjectiveCount: 0,
          totalCount: 0,
        };
        if (
          current.grade === suggestedGrade &&
          suggestedMeta.gradeRank > getGradeRank(current.grade)
        ) {
          current.grade = suggestedGrade;
        }
        current.suggestedCount += 1;
        current.totalCount += 1;
        grades.set(suggestedGrade, current);
      }
    });

    const distribution = Array.from(grades.values()).sort(
      (left, right) => getGradeRank(right.grade) - getGradeRank(left.grade),
    );
    const maxCount = distribution.reduce(
      (highest, item) => Math.max(highest, item.totalCount),
      0,
    );

    return distribution.map((item) => ({
      ...item,
      normalizedCount: maxCount > 0 ? item.totalCount / maxCount : 0,
    }));
  }, [ascents]);
  const gradeDistribution = useMemo(() => {
    const grades = new Map<
      string,
      { grade: string; surface: TrainingSurface | "lina"; count: number }
    >();

    trainings.forEach((training) => {
      const gradeEntries: Array<{
        grade: string;
        surface: TrainingSurface | "lina";
      }> = [];
      const ropeGrades = training.difficultyBySurface
        ? (training.difficultyBySurface.lina ?? "")
        : training.difficultyNotes;
      const legacyBoardSurface =
        training.difficultyBySurface || training.surfaces.includes("lina")
          ? null
          : training.surfaces.find(
              (surface) =>
                surface === "moon" ||
                surface === "kilter" ||
                surface === "baldy",
            );

      ropeGrades
        .split(",")
        .map((grade) => grade.trim())
        .filter(Boolean)
        .forEach((grade) => {
          if (
            legacyBoardSurface &&
            !isGradeCompatibleWithSurface(legacyBoardSurface, grade)
          ) {
            return;
          }

          gradeEntries.push({ grade, surface: legacyBoardSurface ?? "lina" });
        });

      (["moon", "kilter", "baldy"] as const).forEach((surface) => {
        (training.difficultyBySurface?.[surface] ?? "")
          .split(",")
          .map((grade) => grade.trim())
          .filter(Boolean)
          .forEach((grade) => gradeEntries.push({ grade, surface }));
      });

      gradeEntries.forEach(({ grade, surface }) => {
        const key = `${surface}:${grade}`;
        const current = grades.get(key);

        grades.set(key, {
          grade,
          surface,
          count: (current?.count ?? 0) + 1,
        });
      });
    });

    return Array.from(grades.values()).sort(
      (left, right) =>
        getTrainingGradeRank(right.grade) - getTrainingGradeRank(left.grade),
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
    ascentChartRangeLabel,
    ascentGradeFrequency,
    ascentTimelineStats,
    chartRange,
    chartRangeLabel,
    currentAge,
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
    weeklyAscentStats,
    weeklyTrainingStats,
    weightChartEntries,
  };
}
