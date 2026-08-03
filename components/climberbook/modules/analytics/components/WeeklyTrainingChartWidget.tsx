"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import { getWeekStartIso } from "@/components/climberbook/common/training";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";

type WeeklyTrainingChartWidgetProps = {
  isMobileLayout: boolean;
  chartRangeLabel: string;
  contentOnly?: boolean;
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
};

const weeklyLegendItems = [
  { label: "Baldy", fill: "var(--component-chart-activity-boulder)" },
  { label: "Campus", fill: "var(--component-chart-activity-campus)" },
  { label: "Chwytotablica", fill: "url(#hangboard-stripes)" },
  { label: "Drążek", fill: "var(--component-chart-activity-campus)" },
  { label: "Kilter/Moon", fill: "var(--component-chart-activity-board)" },
  { label: "Lina", fill: "var(--component-chart-activity-rope)" },
  { label: "Spray/obwody", fill: "var(--component-chart-activity-spray)" },
];

function WeeklyTrainingLegend() {
  return (
    <ul style={{ margin: 0, padding: 0, textAlign: "center" }}>
      {weeklyLegendItems.map((item) => (
        <li
          key={item.label}
          style={{ display: "inline-block", marginRight: 10 }}
        >
          <svg
            aria-label={`${item.label} legend icon`}
            height="14"
            style={{
              display: "inline-block",
              marginRight: 4,
              verticalAlign: "middle",
            }}
            viewBox="0 0 14 14"
            width="14"
          >
            {item.label === "Campus" ? (
              <>
                <defs>
                  <pattern
                    id="legend-campus-dots"
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect
                      width="8"
                      height="8"
                      fill="var(--component-chart-activity-campus)"
                    />
                    <circle
                      cx="4"
                      cy="4"
                      r="1.4"
                      fill="var(--component-chart-marker-outline)"
                    />
                  </pattern>
                </defs>
                <rect fill="url(#legend-campus-dots)" height="14" width="14" />
              </>
            ) : (
              <rect fill={item.fill} height="14" width="14" />
            )}
          </svg>
          <span
            style={{
              color: item.fill.startsWith("url(")
                ? "var(--theme-text)"
                : item.fill,
            }}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function WeeklyTrainingChartWidget({
  isMobileLayout,
  chartRangeLabel,
  weeklyTrainingStats,
  contentOnly = false,
}: WeeklyTrainingChartWidgetProps) {
  const { selectedDate } = useSelectedDates();
  const selectedWeek = selectedDate ? getWeekStartIso(selectedDate) : null;
  const hasSelectedWeek =
    selectedWeek !== null &&
    weeklyTrainingStats.some((week) => week.week === selectedWeek);
  const content =
    weeklyTrainingStats.length === 0 ? (
      <EmptyState message="Dodaj treningi, aby zobaczyć tygodniowy rytm." />
    ) : (
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeklyTrainingStats}
            margin={
              isMobileLayout
                ? { top: 0, right: 0, bottom: 0, left: -10 }
                : { bottom: 12 }
            }
          >
            <defs>
              <linearGradient id="rope-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--component-chart-activity-rope)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--component-chart-activity-rope)"
                />
              </linearGradient>
              <linearGradient id="boulder-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--component-chart-activity-boulder)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--component-chart-activity-boulder)"
                />
              </linearGradient>
              <linearGradient id="board-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--component-chart-activity-board)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--component-chart-activity-board)"
                />
              </linearGradient>
              <linearGradient id="spray-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--component-chart-activity-spray)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--component-chart-activity-spray)"
                />
              </linearGradient>
              <linearGradient
                id="pullup-bar-gradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--component-chart-activity-campus)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--component-chart-activity-campus)"
                />
              </linearGradient>
              <linearGradient id="campus-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--component-chart-activity-campus)"
                />
                <stop
                  offset="100%"
                  stopColor="var(--component-chart-activity-campus)"
                />
              </linearGradient>
              <pattern
                id="hangboard-stripes"
                width="10"
                height="20"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect
                  width="10"
                  height="10"
                  fill="var(--component-chart-activity-hangboard-start)"
                />
                <rect
                  y="10"
                  width="10"
                  height="10"
                  fill="var(--component-chart-activity-hangboard-end)"
                />
              </pattern>
              <pattern
                id="campus-dots"
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill="url(#campus-gradient)" />
                <circle
                  cx="4"
                  cy="4"
                  r="1.4"
                  fill="var(--component-chart-marker-outline)"
                />
              </pattern>
              <pattern
                id="campus-dots-dense"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
              >
                <rect width="4" height="4" fill="url(#campus-gradient)" />
                <circle
                  cx="2"
                  cy="2"
                  r="1"
                  fill="var(--component-chart-marker-outline)"
                />
              </pattern>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--component-chart-grid)"
            />
            <XAxis
              dataKey="week"
              height={isMobileLayout ? 24 : undefined}
              tick={isMobileLayout ? { fontSize: "0.7rem" } : undefined}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis
              width={isMobileLayout ? 34 : undefined}
              tick={isMobileLayout ? { fontSize: "0.7rem" } : undefined}
              tickFormatter={(value) => `${value} h`}
            />
            {hasSelectedWeek && (
              <ReferenceLine
                x={selectedWeek!}
                stroke="var(--component-chart-marker-selected)"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
            <Tooltip
              formatter={(value, name) => [
                `${Number(value).toLocaleString("pl-PL", {
                  maximumFractionDigits: 1,
                })} h`,
                name,
              ]}
            />
            <Legend content={<WeeklyTrainingLegend />} />
            <Bar
              dataKey="hangboardHours"
              name="Chwytotablica"
              stackId="hours"
              fill="url(#hangboard-stripes)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="pullupBarHours"
              name="Drążek"
              stackId="hours"
              fill="url(#pullup-bar-gradient)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="campusHours"
              name="Campus"
              stackId="hours"
              fill="url(#campus-dots-dense)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="ropeHours"
              name="Lina"
              stackId="hours"
              fill="url(#rope-gradient)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="boulderHours"
              name="Baldy"
              stackId="hours"
              fill="url(#boulder-gradient)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="boardHours"
              name="Kilter/Moon"
              stackId="hours"
              fill="url(#board-gradient)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="sprayCircuitHours"
              name="Spray/obwody"
              stackId="hours"
              fill="url(#spray-gradient)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

  if (contentOnly) return content;

  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Objętość</span>
          <h2 style={sectionTitleStyle}>Tygodniowy rytm treningu</h2>
        </div>
        <span style={softTagStyle}>{chartRangeLabel}</span>
      </div>
      {content}
    </Panel>
  );
}
