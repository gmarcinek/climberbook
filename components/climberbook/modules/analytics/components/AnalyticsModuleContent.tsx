"use client";

import { AnalyticsHeaderWidget } from "./AnalyticsHeaderWidget";
import { AnalyticsMetricsWidget } from "./AnalyticsMetricsWidget";
import { GradeDistributionWidget } from "./GradeDistributionWidget";
import { WeeklyTrainingChartWidget } from "./WeeklyTrainingChartWidget";
import {
  moduleContentStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";

type AnalyticsModuleContentProps = {
  moduleMeta: { eyebrow: string; title: string; description: string };
  isMobileChartLayout: boolean;
  trainingsCount: number;
  averageWeight: string;
  totalCalories: number;
  totalTrainingTime: number;
  totalAttempts: number;
  chartRangeLabel: string;
  weeklyTrainingStats: Array<{
    week: string;
    duration: number;
    attempts: number;
  }>;
  highestGrade: string;
  gradeDistribution: Array<{ grade: string; count: number }>;
};

export function AnalyticsModuleContent({
  moduleMeta,
  isMobileChartLayout,
  trainingsCount,
  averageWeight,
  totalCalories,
  totalTrainingTime,
  totalAttempts,
  chartRangeLabel,
  weeklyTrainingStats,
  highestGrade,
  gradeDistribution,
}: AnalyticsModuleContentProps) {
  return (
    <div style={moduleContentStyle}>
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

      <div
        style={{
          ...twoColumnLayoutStyle,
          gridTemplateColumns: isMobileChartLayout
            ? "minmax(0, 1fr)"
            : twoColumnLayoutStyle.gridTemplateColumns,
        }}
      >
        <WeeklyTrainingChartWidget
          chartRangeLabel={chartRangeLabel}
          weeklyTrainingStats={weeklyTrainingStats}
        />
        <GradeDistributionWidget
          highestGrade={highestGrade}
          gradeDistribution={gradeDistribution}
        />
      </div>
    </div>
  );
}
