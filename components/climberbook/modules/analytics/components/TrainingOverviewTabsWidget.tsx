"use client";

import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type { TrainingRecord } from "@/lib/climbs-db";
import { TrainingRegularityChartWidget } from "./TrainingRegularityChartWidget";
import { WeeklyTrainingChartWidget } from "./WeeklyTrainingChartWidget";

export function TrainingOverviewTabsWidget({
  isCalendarYearSelected,
  isMobileLayout,
  chartRange,
  chartRangeLabel,
  weeklyTrainingStats,
  trainings,
}: {
  isCalendarYearSelected: boolean;
  isMobileLayout: boolean;
  chartRange: { start: string; end: string };
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
  trainings: TrainingRecord[];
}) {
  const year = chartRange.end.slice(0, 4);
  const heatmapRange = isCalendarYearSelected
    ? { start: `${year}-01-01`, end: `${year}-12-31` }
    : chartRange;
  const heatmapRangeLabel = isCalendarYearSelected
    ? `1 sty - 31 gru ${year}`
    : chartRangeLabel;
  return (
    <>
      <Panel>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Objętość</span>
            <h2 style={sectionTitleStyle}>Zawartość treningu</h2>
          </div>
          <span style={softTagStyle}>{chartRangeLabel}</span>
        </div>
        <WeeklyTrainingChartWidget
          isMobileLayout={isMobileLayout}
          chartRangeLabel={chartRangeLabel}
          weeklyTrainingStats={weeklyTrainingStats}
          contentOnly
        />
      </Panel>
      <Panel>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Regularność</span>
            <h2 style={sectionTitleStyle}>Aktywność treningowa {year}</h2>
          </div>
          <span style={softTagStyle}>{heatmapRangeLabel}</span>
        </div>
        <TrainingRegularityChartWidget
          trainings={trainings}
          chartRange={heatmapRange}
          contentOnly
        />
      </Panel>
    </>
  );
}
