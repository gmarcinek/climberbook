"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/climberbook/common/charts";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type { AthleteRecord } from "@/lib/climbs-db";
const TEAM_CHART_COLORS = [
  "#c3663a",
  "#2f7d6c",
  "#3f6099",
  "#a2465b",
  "#8b6b2d",
];
type TeamWeightChartWidgetProps = {
  athletes: AthleteRecord[];
  teamWeightChartData: Array<Record<string, number | string>>;
};
export function TeamWeightChartWidget({
  athletes,
  teamWeightChartData,
}: TeamWeightChartWidgetProps) {
  const { isMobileChartLayout } = useViewport();

  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Porównanie</span>
          <h2 style={sectionTitleStyle}>Waga zawodników</h2>
        </div>
        <span style={softTagStyle}>Ostatnie 30 dat</span>
      </div>
      {teamWeightChartData.length === 0 ? (
        <EmptyState message="Dodaj pomiary wagi, aby porównać zawodników." />
      ) : (
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={teamWeightChartData}
              margin={
                isMobileChartLayout
                  ? { top: 0, right: 0, bottom: 0, left: -10 }
                  : undefined
              }
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(100, 87, 77, 0.14)"
              />
              <XAxis
                dataKey="date"
                height={isMobileChartLayout ? 24 : undefined}
                tick={{ fontSize: isMobileChartLayout ? "0.7rem" : 11 }}
              />
              <YAxis
                width={34}
                tick={{ fontSize: isMobileChartLayout ? "0.7rem" : 11 }}
              />
              <Tooltip />
              <Legend />
              {athletes.map((athlete, index) => (
                <Line
                  key={athlete.id}
                  type="monotone"
                  dataKey={athlete.id}
                  name={athlete.name}
                  stroke={TEAM_CHART_COLORS[index % TEAM_CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
