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
import { AnalyticsInsightsWall } from "./AnalyticsInsightsWall";
import { GoalsPanelWidget } from "./GoalsPanelWidget";
import { TrainingOverviewTabsWidget } from "./TrainingOverviewTabsWidget";
import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts";
import { TrainingStimulusChart } from "@/components/climberbook/common/charts/SessionGradesChart";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  calendarPanelStyle,
  moduleContentStyle,
  trainingModuleStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";
import type {
  AscentRecord,
  FacilityRecord,
  GoalRecord,
  TrainingRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import type { TrainingSurface } from "@/lib/climbs-db";

type AnalyticsModuleContentProps = {
  moduleMeta: { eyebrow: string; title: string; description: string };
  isMobileChartLayout: boolean;
  isWideDesktop: boolean;
  period: { start: string; end: string };
  activePeriodPreset: AnalyticsPeriodPreset | "custom";
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onCalendarRangeChange: (range: { start: string; end: string }) => void;
  onPeriodPreset: (preset: AnalyticsPeriodPreset) => void;
  facilities: FacilityRecord[];
  athleteId: string | null;
  goals: GoalRecord[];
  ascents: AscentRecord[];
  weightEntries: WeightEntryRecord[];
  onCreateGoal: (
    input: Omit<GoalRecord, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onUpdateGoal: (
    input: Omit<GoalRecord, "createdAt" | "updatedAt">,
  ) => Promise<void>;
  onDeleteGoal: (goal: GoalRecord) => Promise<void>;
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
  isWideDesktop,
  period,
  activePeriodPreset,
  onPreviousPeriod,
  onNextPeriod,
  onCalendarRangeChange,
  onPeriodPreset,
  facilities,
  athleteId,
  goals,
  ascents,
  weightEntries,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
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
  const [mobileTab, setMobileTab] = useState<"wall" | "analysis" | "goals">(
    "analysis",
  );
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
  const goalsPanel = (
    <GoalsPanelWidget
      athleteId={athleteId}
      goals={goals}
      trainings={allTrainings}
      ascents={ascents}
      weightEntries={weightEntries}
      today={today}
      onCreateGoal={onCreateGoal}
      onUpdateGoal={onUpdateGoal}
      onDeleteGoal={onDeleteGoal}
    />
  );

  const analysisContent = (
    <Stack gap="md" style={moduleContentStyle}>
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
          isMobileLayout={isMobileChartLayout}
          isWideDesktop={isWideDesktop}
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
      {!isMobileChartLayout ? goalsPanel : null}

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

  if (isMobileChartLayout) {
    return (
      <Stack
        gap="md"
        style={{ ...moduleContentStyle, paddingTop: 0, width: "100%" }}
      >
        <div
          role="tablist"
          aria-label="Widok analityki"
          style={mobileAnalyticsTabNavStyle}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "analysis"}
            style={mobileAnalyticsTabStyle(mobileTab === "analysis")}
            onClick={() => setMobileTab("analysis")}
          >
            Analizy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "goals"}
            style={mobileAnalyticsTabStyle(mobileTab === "goals")}
            onClick={() => setMobileTab("goals")}
          >
            Cele
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "wall"}
            style={mobileAnalyticsTabStyle(mobileTab === "wall")}
            onClick={() => setMobileTab("wall")}
          >
            Wall
          </button>
        </div>
        {mobileTab === "analysis" ? (
          analysisContent
        ) : mobileTab === "goals" ? (
          goalsPanel
        ) : (
          <AnalyticsInsightsWall />
        )}
      </Stack>
    );
  }

  return (
    <div style={desktopLayoutStyle}>
      <main style={analysisColumnStyle}>
        <ScrollPane
          style={{ height: "100%", minHeight: 0 }}
          viewportStyle={analysisViewportStyle}
          contentStyle={analysisContentStyle}
        >
          {analysisContent}
        </ScrollPane>
      </main>
      <aside style={wallColumnStyle}>
        <ScrollPane
          style={{ height: "100%", minHeight: 0 }}
          viewportStyle={wallViewportStyle}
          contentStyle={wallContentStyle}
        >
          <AnalyticsInsightsWall />
        </ScrollPane>
      </aside>
    </div>
  );
}

const desktopLayoutStyle = {
  ...trainingModuleStyle,
  gap: 9,
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 0.82fr)",
  height: "100%",
  minHeight: 0,
};

const wallColumnStyle = {
  ...calendarPanelStyle,
  gridColumn: 2,
  gridRow: 1,
  gridTemplateRows: "minmax(0, 1fr)",
  height: "100%",
  overflow: "hidden" as const,
  padding: 0,
};

const wallViewportStyle = {
  background: "var(--component-calendar-viewport-background)",
  height: "100%",
  minHeight: 0,
  overflowY: "auto" as const,
};

const wallContentStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 9,
  minHeight: 0,
  padding: "1rem 11px 11px",
};

const analysisColumnStyle = {
  minHeight: 0,
  minWidth: 0,
  overflow: "hidden" as const,
};

const analysisViewportStyle = {
  height: "100%",
  minHeight: 0,
  overflowY: "auto" as const,
};

const analysisContentStyle = {
  minHeight: 0,
  padding: "1rem 11px 11px",
};

const mobileAnalyticsTabNavStyle = {
  borderBottom: "1px solid var(--border-strong)",
  display: "flex",
  gap: 4,
  marginTop: 0,
  order: -2,
  width: "100%",
};

function mobileAnalyticsTabStyle(isActive: boolean) {
  return {
    background: "transparent",
    border: 0,
    borderBottom: isActive
      ? "2px solid var(--accent)"
      : "2px solid transparent",
    color: isActive ? "var(--text)" : "var(--muted)",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: isActive ? 700 : 500,
    padding: "8px 12px",
  };
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
