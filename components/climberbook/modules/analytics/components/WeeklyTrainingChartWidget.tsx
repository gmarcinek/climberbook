"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";

type WeeklyTrainingChartWidgetProps = {
  chartRangeLabel: string;
  weeklyTrainingStats: Array<{
    week: string;
    duration: number;
    attempts: number;
  }>;
};

export function WeeklyTrainingChartWidget({
  chartRangeLabel,
  weeklyTrainingStats,
}: WeeklyTrainingChartWidgetProps) {
  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Objętość</span>
          <h2 style={sectionTitleStyle}>Tygodniowy rytm treningu</h2>
        </div>
        <span style={softTagStyle}>{chartRangeLabel}</span>
      </div>
      {weeklyTrainingStats.length === 0 ? (
        <EmptyState message="Dodaj treningi, aby zobaczyć tygodniowy rytm." />
      ) : (
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrainingStats}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(28, 61, 89, 0.12)"
              />
              <XAxis dataKey="week" tickFormatter={(value) => value.slice(5)} />
              <YAxis yAxisId="minutes" />
              <YAxis yAxisId="attempts" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="minutes"
                dataKey="duration"
                name="Minuty"
                fill="#168f91"
              />
              <Bar
                yAxisId="attempts"
                dataKey="attempts"
                name="Wstawki"
                fill="#e19a24"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
