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
  { label: "Baldy", fill: "#e19a24" },
  { label: "Campus", fill: "#7f8582" },
  { label: "Chwytotablica", fill: "url(#hangboard-stripes)" },
  { label: "Drążek", fill: "#7f8582" },
  { label: "Kilter/Moon", fill: "#8b6fc8" },
  { label: "Lina", fill: "#168f91" },
  { label: "Spray/obwody", fill: "#d16d3f" },
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
            style={{ display: "inline-block", marginRight: 4, verticalAlign: "middle" }}
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
                    <rect width="8" height="8" fill="#7f8582" />
                    <circle cx="4" cy="4" r="1.4" fill="#ffffff" />
                  </pattern>
                </defs>
                <rect fill="url(#legend-campus-dots)" height="14" width="14" />
              </>
            ) : (
              <rect fill={item.fill} height="14" width="14" />
            )}
          </svg>
          <span style={{ color: item.fill.startsWith("#") ? item.fill : "var(--text)" }}>
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
  const content = weeklyTrainingStats.length === 0 ? (
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
              <stop offset="0%" stopColor="#25a4a6" />
              <stop offset="100%" stopColor="#168f91" />
            </linearGradient>
            <linearGradient id="boulder-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#efb43a" />
              <stop offset="100%" stopColor="#e19a24" />
            </linearGradient>
            <linearGradient id="board-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a58cd5" />
              <stop offset="100%" stopColor="#8b6fc8" />
            </linearGradient>
            <linearGradient id="spray-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e27f4d" />
              <stop offset="100%" stopColor="#d16d3f" />
            </linearGradient>
            <linearGradient id="pullup-bar-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#9aa09d" />
              <stop offset="100%" stopColor="#7f8582" />
            </linearGradient>
            <linearGradient id="campus-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#989e9b" />
              <stop offset="100%" stopColor="#7f8582" />
            </linearGradient>
            <pattern
              id="hangboard-stripes"
              width="10"
              height="20"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="10" height="10" fill="#b83232" />
              <rect y="10" width="10" height="10" fill="#d94b4b" />
            </pattern>
            <pattern
              id="campus-dots"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill="url(#campus-gradient)" />
              <circle cx="4" cy="4" r="1.4" fill="#ffffff" />
            </pattern>
            <pattern
              id="campus-dots-dense"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="4" fill="url(#campus-gradient)" />
              <circle cx="2" cy="2" r="1" fill="#ffffff" />
            </pattern>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(28, 61, 89, 0.12)"
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
              stroke="#176f86"
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
