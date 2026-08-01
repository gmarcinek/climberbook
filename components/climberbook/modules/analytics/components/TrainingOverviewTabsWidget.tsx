"use client";

import { useState } from "react";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type { FacilityRecord, TrainingRecord } from "@/lib/climbs-db";
import { TrainingLoadHeatmapWidget } from "./TrainingLoadHeatmapWidget";
import { TrainingRegularityChartWidget } from "./TrainingRegularityChartWidget";
import { WeeklyTrainingChartWidget } from "./WeeklyTrainingChartWidget";

type OverviewTab = "rhythm" | "activity" | "load";

const tabs: Array<{ key: OverviewTab; label: string }> = [
  { key: "rhythm", label: "Rytm" },
  { key: "activity", label: "Aktywność" },
  { key: "load", label: "Obciążenie" },
];

export function TrainingOverviewTabsWidget({
  isCalendarYearSelected,
  isMobileLayout,
  chartRange,
  chartRangeLabel,
  weeklyTrainingStats,
  trainings,
  facilities,
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
  facilities: FacilityRecord[];
}) {
  const [activeTab, setActiveTab] = useState<OverviewTab>("rhythm");
  const year = chartRange.end.slice(0, 4);
  const heatmapRange = isCalendarYearSelected
    ? { start: `${year}-01-01`, end: `${year}-12-31` }
    : chartRange;
  const heatmapRangeLabel = isCalendarYearSelected
    ? `1 sty - 31 gru ${year}`
    : chartRangeLabel;
  const heading =
    activeTab === "rhythm"
      ? {
          eyebrow: "Objętość",
          title: "Zawartość treningu",
          badge: chartRangeLabel,
        }
      : activeTab === "activity"
        ? {
            eyebrow: "Regularność",
            title: `Aktywność treningowa ${year}`,
            badge: heatmapRangeLabel,
          }
        : {
            eyebrow: "Heatmap",
            title: `Obciążenie treningowe ${year}`,
            badge: heatmapRangeLabel,
          };

  return (
    <Panel>
      <div role="tablist" aria-label="Przegląd treningu" style={tabsStyle}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...tabStyle,
                ...(isActive ? activeTabStyle : undefined),
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>{heading.eyebrow}</span>
          <h2 style={sectionTitleStyle}>{heading.title}</h2>
        </div>
        <span style={softTagStyle}>{heading.badge}</span>
      </div>
      {activeTab === "rhythm" ? (
        <WeeklyTrainingChartWidget
          isMobileLayout={isMobileLayout}
          chartRangeLabel={chartRangeLabel}
          weeklyTrainingStats={weeklyTrainingStats}
          contentOnly
        />
      ) : activeTab === "activity" ? (
        <TrainingRegularityChartWidget
          trainings={trainings}
          chartRange={heatmapRange}
          contentOnly
        />
      ) : (
        <TrainingLoadHeatmapWidget
          trainings={trainings}
          facilities={facilities}
          chartRange={heatmapRange}
          contentOnly
        />
      )}
    </Panel>
  );
}

const tabsStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 12,
};

const tabStyle = {
  background: "transparent",
  borderWidth: 0,
  borderBottom: "2px solid transparent",
  color: "var(--muted)",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 500,
  padding: "0 0 4px",
};

const activeTabStyle = {
  borderBottom: "2px solid var(--accent)",
  color: "var(--text)",
  fontWeight: 700,
};
