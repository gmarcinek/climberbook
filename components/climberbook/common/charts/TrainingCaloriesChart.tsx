"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";
import {
  formatDateIso,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import { EmptyState } from "@/components/climberbook/common/charts/ChartPrimitives";
import { weightChartCanvasStyle } from "@/components/climberbook/common/styles";
import type { TrainingRecord } from "@/lib/climbs-db";
export function TrainingCaloriesChart({
  trainings,
  chartRange,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
}) {
  const { selectedDate } = useSelectedDates();
  const monthlyTrainings = trainings.filter(
    (training) =>
      training.date >= chartRange.start && training.date <= chartRange.end,
  );

  if (monthlyTrainings.length === 0) {
    return <EmptyState message="Brak treningów w wybranym okresie." />;
  }

  const caloriesByDate = monthlyTrainings.reduce((totals, training) => {
    totals.set(
      training.date,
      (totals.get(training.date) ?? 0) + training.caloriesBurned,
    );
    return totals;
  }, new Map<string, number>());
  const dailyCalories = [] as Array<{ date: string; calories: number }>;
  const cursor = toDate(chartRange.start);

  while (formatDateIso(cursor) <= chartRange.end) {
    const date = formatDateIso(cursor);
    dailyCalories.push({ date, calories: caloriesByDate.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  const selectedChartDate =
    selectedDate &&
    selectedDate >= chartRange.start &&
    selectedDate <= chartRange.end
      ? formatDateIso(selectedDate)
      : null;

  return (
    <div style={weightChartCanvasStyle}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={dailyCalories}
          margin={{ top: 12, right: 8, bottom: 4, left: -20 }}
        >
          <CartesianGrid
            stroke="rgba(100, 87, 77, 0.14)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            minTickGap={28}
            tickFormatter={(date) =>
              new Intl.DateTimeFormat("pl-PL", {
                day: "numeric",
                month: "short",
              }).format(toDate(date))
            }
          />
          <YAxis
            tickFormatter={(value) => `${value}`}
            label={{ value: "kcal", angle: -90, position: "insideLeft" }}
          />
          {selectedChartDate && (
            <ReferenceLine
              x={selectedChartDate}
              stroke="#176f86"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}
          <Tooltip
            formatter={(value) => [`${value} kcal`, "Kalorie"]}
            labelFormatter={(date) =>
              new Intl.DateTimeFormat("pl-PL", {
                day: "numeric",
                month: "short",
              }).format(toDate(String(date)))
            }
          />
          <Line
            type="monotone"
            dataKey="calories"
            name="Kalorie"
            stroke="#dc5a45"
            strokeDasharray="6 4"
            strokeWidth={2}
            dot={{ r: 3, fill: "#dc5a45", stroke: "white", strokeWidth: 1 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
