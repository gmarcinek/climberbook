"use client";

import { AnalyticsHeaderWidget } from "./AnalyticsHeaderWidget";
import { AnalyticsMetricsWidget } from "./AnalyticsMetricsWidget";
import {
  AnalyticsPeriodControls,
  AnalyticsPeriodNavigation,
  type AnalyticsPeriodPreset,
} from "./AnalyticsPeriodControls";
import { GradeDistributionWidget } from "./GradeDistributionWidget";
import { SurfaceVolumeChartWidget } from "./SurfaceVolumeChartWidget";
import { TrainingHistoryWidget } from "./TrainingHistoryWidget";
import { TrainingFatigueForecastChartWidget } from "./TrainingFatigueForecastChartWidget";
import { TrainingOverviewTabsWidget } from "./TrainingOverviewTabsWidget";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  moduleContainerStyle,
  moduleContentStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";
import type { FacilityRecord, TrainingRecord } from "@/lib/climbs-db";
import type { TrainingSurface } from "@/lib/climbs-db";

type AnalyticsModuleContentProps = {
  moduleMeta: { eyebrow: string; title: string; description: string };
  isMobileChartLayout: boolean;
  period: { start: string; end: string };
  activePeriodPreset: AnalyticsPeriodPreset | "custom";
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onPeriodStartChange: (value: string) => void;
  onPeriodEndChange: (value: string) => void;
  onPeriodPreset: (preset: AnalyticsPeriodPreset) => void;
  facilities: FacilityRecord[];
  allTrainings: TrainingRecord[];
  trainings: TrainingRecord[];
  trainingsCount: number;
  averageWeight: string;
  totalCalories: number;
  totalTrainingTime: number;
  chartRangeLabel: string;
  weeklyTrainingStats: Array<{
    week: string;
    totalHours: number;
    ropeHours: number;
    boulderHours: number;
    boardHours: number;
    sprayCircuitHours: number;
    hangboardHours: number;
    pullupBarHours: number;
    campusHours: number;
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
  period,
  activePeriodPreset,
  onPreviousPeriod,
  onNextPeriod,
  onPeriodStartChange,
  onPeriodEndChange,
  onPeriodPreset,
  facilities,
  allTrainings,
  trainings,
  trainingsCount,
  averageWeight,
  totalCalories,
  totalTrainingTime,
  chartRangeLabel,
  weeklyTrainingStats,
  gradeDistribution,
}: AnalyticsModuleContentProps) {
  const periodNavigation = (
    <AnalyticsPeriodNavigation
      label={`${period.start} - ${period.end}`}
      onPrevious={onPreviousPeriod}
      onNext={onNextPeriod}
      canNavigate={
        activePeriodPreset !== "all" && activePeriodPreset !== "custom"
      }
    />
  );

  return (
    <Stack gap="md" style={{ ...moduleContentStyle, ...moduleContainerStyle }}>
      {isMobileChartLayout ? (
        <AnalyticsPeriodControls
          start={period.start}
          end={period.end}
          activePreset={activePeriodPreset}
          isMobileLayout={isMobileChartLayout}
          onStartChange={onPeriodStartChange}
          onEndChange={onPeriodEndChange}
          onPreset={onPeriodPreset}
        />
      ) : (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            justifyContent: "center",
          }}
        >
          <AnalyticsPeriodControls
            start={period.start}
            end={period.end}
            activePreset={activePeriodPreset}
            isMobileLayout={isMobileChartLayout}
            onStartChange={onPeriodStartChange}
            onEndChange={onPeriodEndChange}
            onPreset={onPeriodPreset}
          />
          <div style={{ flex: "0 1 360px", width: "100%" }}>
            {periodNavigation}
          </div>
        </div>
      )}
      <AnalyticsHeaderWidget
        meta={moduleMeta}
        isMobileLayout={isMobileChartLayout}
        trainingsCount={trainingsCount}
        averageWeight={averageWeight}
        totalCalories={totalCalories}
        totalTrainingTime={totalTrainingTime}
      />
      {!isMobileChartLayout ? (
        <AnalyticsMetricsWidget
          trainingsCount={trainingsCount}
          totalTrainingTime={totalTrainingTime}
          averageWeight={averageWeight}
        />
      ) : null}

      {isMobileChartLayout ? periodNavigation : null}
      <TrainingOverviewTabsWidget
        isCalendarYearSelected={activePeriodPreset === "year"}
        isMobileLayout={isMobileChartLayout}
        chartRange={period}
        chartRangeLabel={chartRangeLabel}
        weeklyTrainingStats={weeklyTrainingStats}
        trainings={allTrainings}
        facilities={facilities}
      />

      <GradeDistributionWidget gradeDistribution={gradeDistribution} />

      <div
        style={{
          ...twoColumnLayoutStyle,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <SurfaceVolumeChartWidget
          trainings={trainings}
          chartRangeLabel={chartRangeLabel}
        />
        <TrainingFatigueForecastChartWidget
          trainings={trainings}
          facilities={facilities}
          chartRange={period}
          chartRangeLabel={chartRangeLabel}
        />
      </div>

      <TrainingHistoryWidget
        isMobileLayout={isMobileChartLayout}
        trainings={trainings}
      />
    </Stack>
  );
}
