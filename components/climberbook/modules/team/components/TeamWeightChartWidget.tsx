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
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  panelStyle,
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
  return (
    <section style={panelStyle}>
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
            <ComposedChart data={teamWeightChartData}>
              <CartesianGrid
                vertical={false}
                stroke="rgba(100, 87, 77, 0.14)"
              />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={34} />
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
    </section>
  );
}
