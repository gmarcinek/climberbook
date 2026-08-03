"use client";

import { useState } from "react";
import { AnalyticsHeaderWidget } from "./AnalyticsHeaderWidget";
import { AnalyticsCalendarWidget } from "./AnalyticsCalendarWidget";
import { AnalyticsMetricsWidget } from "./AnalyticsMetricsWidget";
import {
  AnalyticsPeriodControls,
  AnalyticsPeriodNavigation,
  type AnalyticsPeriodPreset,
} from "./AnalyticsPeriodControls";
import { GradeDistributionWidget } from "./GradeDistributionWidget";
import { SurfaceVolumeChartWidget } from "./SurfaceVolumeChartWidget";
import { TrainingFatigueForecastChartWidget } from "./TrainingFatigueForecastChartWidget";
import { TrainingOverviewTabsWidget } from "./TrainingOverviewTabsWidget";
import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts";
import { TrainingStimulusChart } from "@/components/climberbook/common/charts/SessionGradesChart";
import { Panel } from "@/components/climberbook/common/Panel";
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
  onCalendarRangeChange: (range: { start: string; end: string }) => void;
  onPeriodPreset: (preset: AnalyticsPeriodPreset) => void;
  facilities: FacilityRecord[];
  allTrainings: TrainingRecord[];
  trainings: TrainingRecord[];
  today: string;
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
  onCalendarRangeChange,
  onPeriodPreset,
  facilities,
  allTrainings,
  trainings,
  today,
  trainingsCount,
  averageWeight,
  totalCalories,
  totalTrainingTime,
  chartRangeLabel,
  weeklyTrainingStats,
  gradeDistribution,
}: AnalyticsModuleContentProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const handlePeriodPreset = (preset: AnalyticsPeriodPreset) => {
    onPeriodPreset(preset);

    if (preset === "year") {
      setIsCalendarOpen(false);
    }
  };
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
          activePreset={activePeriodPreset}
          isMobileLayout={isMobileChartLayout}
          onCurrentPeriodSelect={() => {
            onCalendarRangeChange(period);
            setIsCalendarOpen(true);
          }}
          onPreset={handlePeriodPreset}
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
            activePreset={activePeriodPreset}
            isMobileLayout={isMobileChartLayout}
            onCurrentPeriodSelect={() => {
              onCalendarRangeChange(period);
              setIsCalendarOpen(true);
            }}
            onPreset={handlePeriodPreset}
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
      {isCalendarOpen ? (
        <AnalyticsCalendarWidget
          period={period}
          today={today}
          trainings={allTrainings}
          onVisibleRangeChange={onCalendarRangeChange}
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
      />

      <GradeDistributionWidget gradeDistribution={gradeDistribution} />

      <Panel>
        <div style={analyticsChartHeadingStyle}>
          <span style={analyticsChartEyebrowStyle}>Wyceny</span>
          <h2 style={analyticsChartTitleStyle}>Wyceny i sesje</h2>
        </div>
        <RopeTrainingGradesChart trainings={trainings} chartRange={period} />
      </Panel>

      <Panel>
        <div style={analyticsChartHeadingStyle}>
          <span style={analyticsChartEyebrowStyle}>Bodziec</span>
          <h2 style={analyticsChartTitleStyle}>Rozkład bodźca</h2>
        </div>
        <TrainingStimulusChart trainings={trainings} chartRange={period} />
      </Panel>

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
    </Stack>
  );
}

const analyticsChartHeadingStyle = {
  display: "grid",
  gap: "0.2rem",
  marginBottom: "0.9rem",
};

const analyticsChartEyebrowStyle = {
  color: "var(--accent)",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const analyticsChartTitleStyle = {
  fontSize: "1.05rem",
  margin: 0,
};
