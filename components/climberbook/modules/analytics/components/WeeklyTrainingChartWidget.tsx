"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Brush,
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
  isMobileLayout: boolean;
  chartRangeLabel: string;
  weeklyTrainingStats: Array<{
    week: string;
    totalHours: number;
    ropeHours: number;
    boulderHours: number;
    boardHours: number;
    sprayCircuitHours: number;
  }>;
};

export function WeeklyTrainingChartWidget({
  isMobileLayout,
  chartRangeLabel,
  weeklyTrainingStats,
}: WeeklyTrainingChartWidgetProps) {
  const [selectedRange, setSelectedRange] = useState({
    startIndex: 0,
    endIndex: 0,
  });

  useEffect(() => {
    setSelectedRange({
      startIndex: Math.max(0, weeklyTrainingStats.length - 12),
      endIndex: Math.max(0, weeklyTrainingStats.length - 1),
    });
  }, [weeklyTrainingStats.length]);

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
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value).toLocaleString("pl-PL", {
                    maximumFractionDigits: 1,
                  })} h`,
                  name,
                ]}
              />
              <Legend />
              <Bar
                dataKey="ropeHours"
                name="Lina"
                stackId="hours"
                fill="#168f91"
                isAnimationActive={false}
              />
              <Bar
                dataKey="boulderHours"
                name="Baldy"
                stackId="hours"
                fill="#e19a24"
                isAnimationActive={false}
              />
              <Bar
                dataKey="boardHours"
                name="Kilter/Moon"
                stackId="hours"
                fill="#8b6fc8"
                isAnimationActive={false}
              />
              <Bar
                dataKey="sprayCircuitHours"
                name="Spray/obwody"
                stackId="hours"
                fill="#d16d3f"
                isAnimationActive={false}
              />
              <Brush
                dataKey="week"
                height={isMobileLayout ? 28 : 32}
                stroke="rgba(22, 143, 145, 0.72)"
                fill="rgba(22, 143, 145, 0.08)"
                travellerWidth={10}
                startIndex={selectedRange.startIndex}
                endIndex={selectedRange.endIndex}
                tickFormatter={(value) => String(value).slice(5)}
                onChange={(range) => {
                  if (
                    range.startIndex !== undefined &&
                    range.endIndex !== undefined
                  ) {
                    setSelectedRange({
                      startIndex: range.startIndex,
                      endIndex: range.endIndex,
                    });
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
