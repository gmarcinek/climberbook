"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/climberbook/common/charts";
import {
  AnalyticsChartPanel,
  analyticsChartAxisTickStyle,
  analyticsChartGridStyle,
  formatAnalyticsDate,
} from "@/components/climberbook/common/charts/AnalyticsChartPrimitives";
import { addDays } from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord } from "@/lib/climbs-db";

function formatAttemptsIntensityData(
  trainings: TrainingRecord[],
  range: { start: string; end: string },
) {
  const totalsByDate = new Map<string, { attempts: number; minutes: number }>();

  trainings.forEach((training) => {
    const current = totalsByDate.get(training.date) ?? {
      attempts: 0,
      minutes: 0,
    };

    current.attempts += training.attemptsCount;
    current.minutes += training.durationMinutes;
    totalsByDate.set(training.date, current);
  });

  const data: Array<{ date: string; attemptsPerHour: number }> = [];

  for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
    const total = totalsByDate.get(date);
    const attemptsPerHour =
      total && total.minutes > 0 ? (total.attempts / total.minutes) * 60 : 0;

    data.push({
      date,
      attemptsPerHour: Math.round(attemptsPerHour * 10) / 10,
    });
  }

  return data;
}

export function AttemptsIntensityChartWidget({
  trainings,
  chartRange,
  chartRangeLabel,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
}) {
  const data = formatAttemptsIntensityData(trainings, chartRange);

  return (
    <AnalyticsChartPanel
      eyebrow="Intensywność"
      title="Próby na godzinę"
      badge={chartRangeLabel}
    >
      {trainings.length === 0 ? (
        <EmptyState message="Dodaj treningi z liczbą prób, aby porównać intensywność." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 8, bottom: 4, left: -10 }}
          >
            <CartesianGrid vertical={false} {...analyticsChartGridStyle} />
            <XAxis
              dataKey="date"
              minTickGap={28}
              tick={analyticsChartAxisTickStyle}
              tickFormatter={formatAnalyticsDate}
            />
            <YAxis width={34} tick={analyticsChartAxisTickStyle} />
            <Tooltip
              formatter={(value) => [`${value}`, "Próby / h"]}
              labelFormatter={(label) =>
                typeof label === "string" ? formatAnalyticsDate(label) : ""
              }
            />
            <Bar
              dataKey="attemptsPerHour"
              fill="var(--component-chart-series-baseline)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartPanel>
  );
}
