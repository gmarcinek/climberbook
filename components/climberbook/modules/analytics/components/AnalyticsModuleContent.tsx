"use client";

import { AnalyticsHeaderWidget } from "./AnalyticsHeaderWidget";
import { AnalyticsMetricsWidget } from "./AnalyticsMetricsWidget";
import { GradeDistributionWidget } from "./GradeDistributionWidget";
import { TrainingHistoryWidget } from "./TrainingHistoryWidget";
import { WeeklyTrainingChartWidget } from "./WeeklyTrainingChartWidget";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  moduleContentStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";
import type { TrainingRecord } from "@/lib/climbs-db";
import type { TrainingSurface } from "@/lib/climbs-db";

type AnalyticsModuleContentProps = {
  moduleMeta: { eyebrow: string; title: string; description: string };
  isMobileChartLayout: boolean;
  trainings: TrainingRecord[];
  trainingsCount: number;
  averageWeight: string;
  totalCalories: number;
  totalTrainingTime: number;
  totalAttempts: number;
  chartRangeLabel: string;
  weeklyTrainingStats: Array<{
    week: string;
    totalHours: number;
    ropeHours: number;
    boulderHours: number;
    boardHours: number;
    sprayCircuitHours: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    surface: TrainingSurface | "lina";
    count: number;
  }>;
};

export function AnalyticsModuleContent({
  moduleMeta,
  isMobileChartLayout,
  trainings,
  trainingsCount,
  averageWeight,
  totalCalories,
  totalTrainingTime,
  totalAttempts,
  chartRangeLabel,
  weeklyTrainingStats,
  gradeDistribution,
}: AnalyticsModuleContentProps) {
  return (
    <Stack gap="md" style={moduleContentStyle}>
      <AnalyticsHeaderWidget
        meta={moduleMeta}
        trainingsCount={trainingsCount}
        averageWeight={averageWeight}
        totalCalories={totalCalories}
      />
      <AnalyticsMetricsWidget
        trainingsCount={trainingsCount}
        totalTrainingTime={totalTrainingTime}
        averageWeight={averageWeight}
        totalAttempts={totalAttempts}
      />

      <WeeklyTrainingChartWidget
        isMobileLayout={isMobileChartLayout}
        chartRangeLabel={chartRangeLabel}
        weeklyTrainingStats={weeklyTrainingStats}
      />

      <div
        style={{
          ...twoColumnLayoutStyle,
          gridTemplateColumns: isMobileChartLayout
            ? "minmax(0, 1fr)"
            : twoColumnLayoutStyle.gridTemplateColumns,
        }}
      >
        <GradeDistributionWidget gradeDistribution={gradeDistribution} />
        <TrainingHistoryWidget
          isMobileLayout={isMobileChartLayout}
          trainings={trainings}
        />
      </div>
    </Stack>
  );
}
