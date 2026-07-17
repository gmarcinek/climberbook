"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceDot,
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
import { roundToSingleDecimal } from "@/components/climberbook/common/training";
import {
  weightChartCanvasStyle,
  weightChartCardStyle,
  weightChartSummaryStyle,
  weightChartTooltipStyle,
} from "@/components/climberbook/common/styles";
import { EmptyState } from "@/components/climberbook/common/charts/ChartPrimitives";
import type { WeightEntryRecord } from "@/lib/climbs-db";
export function WeightTrendChart({
  entries,
  chartRange,
}: {
  entries: WeightEntryRecord[];
  chartRange: { start: string; end: string };
}) {
  const { selectedDate } = useSelectedDates();

  if (entries.length === 0) {
    return (
      <EmptyState message="Dodaj pierwszy pomiar, aby zobaczyć wykres wagi." />
    );
  }

  const dailyWeights = Array.from(
    entries
      .reduce((groupedEntries, entry) => {
        const date = formatDateIso(entry.date);
        const existingEntry = groupedEntries.get(date) ?? {
          date,
          totalWeight: 0,
          count: 0,
        };

        existingEntry.totalWeight += entry.weightKg;
        existingEntry.count += 1;
        groupedEntries.set(date, existingEntry);

        return groupedEntries;
      }, new Map<string, { date: string; totalWeight: number; count: number }>())
      .values(),
  )
    .map((entry) => ({
      date: entry.date,
      weightKg: roundToSingleDecimal(entry.totalWeight / entry.count),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const chartEntries = dailyWeights.map((entry, index, allEntries) => {
    const weightedEntries = allEntries.slice(Math.max(0, index - 2), index + 1);
    const weightSum = weightedEntries.reduce(
      (sum, weightEntry, weightedIndex) =>
        sum + weightEntry.weightKg * (weightedIndex + 1),
      0,
    );
    const divisor = weightedEntries.reduce(
      (sum, _weightEntry, weightedIndex) => sum + weightedIndex + 1,
      0,
    );

    return {
      date: entry.date,
      label: new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
      }).format(toDate(entry.date)),
      weightKg: entry.weightKg,
      weightedAverage: roundToSingleDecimal(weightSum / divisor),
    };
  });
  const measuredWeights = chartEntries.flatMap((entry) => [
    entry.weightKg,
    entry.weightedAverage,
  ]);
  const todayChartDate = formatDateIso(new Date());
  const selectedChartDate =
    selectedDate &&
    selectedDate >= chartRange.start &&
    selectedDate <= chartRange.end
      ? formatDateIso(selectedDate)
      : null;
  const isFutureSelectedDate =
    selectedChartDate !== null && selectedChartDate > todayChartDate;
  const selectedChartPoint = selectedChartDate
    ? {
        date: selectedChartDate,
        label: new Intl.DateTimeFormat("pl-PL", {
          day: "numeric",
          month: "short",
        }).format(toDate(selectedChartDate)),
        weightKg: null,
        weightedAverage: null,
      }
    : null;
  const latestChartEntry = chartEntries[chartEntries.length - 1];
  const previousChartEntry =
    chartEntries[chartEntries.length - 2] ?? latestChartEntry;
  const trendDays = Math.max(
    1,
    (toDate(latestChartEntry.date).getTime() -
      toDate(previousChartEntry.date).getTime()) /
      86_400_000,
  );
  const trendPerDay =
    (latestChartEntry.weightedAverage - previousChartEntry.weightedAverage) /
    trendDays;
  const selectedDayOffset = selectedChartDate
    ? (toDate(selectedChartDate).getTime() -
        toDate(latestChartEntry.date).getTime()) /
      86_400_000
    : 0;
  const projectedWeight = isFutureSelectedDate
    ? roundToSingleDecimal(
        Math.min(
          latestChartEntry.weightKg + 1,
          Math.max(
            latestChartEntry.weightKg - 1,
            latestChartEntry.weightKg + trendPerDay * selectedDayOffset,
          ),
        ),
      )
    : null;
  const chartWeights =
    projectedWeight === null
      ? measuredWeights
      : [...measuredWeights, projectedWeight];
  const minWeight = Math.min(...chartWeights);
  const maxWeight = Math.max(...chartWeights);
  const domainPadding = Math.max((maxWeight - minWeight) * 0.4, 0.5);
  const axisMinimum = Math.floor(minWeight - domainPadding);
  const axisMaximum = Math.ceil(maxWeight + domainPadding);
  const fullKilogramTicks = Array.from(
    { length: axisMaximum - axisMinimum + 1 },
    (_value, index) => axisMinimum + index,
  );
  const halfKilogramMarks = fullKilogramTicks
    .slice(0, -1)
    .map((tick) => tick + 0.5);
  const chartEntriesByDate = new Map(
    chartEntries.map((entry) => [entry.date, entry]),
  );
  const chartData = [] as Array<{
    date: string;
    label: string;
    weightKg: number | null;
    weightedAverage: number | null;
    projectedWeight: number | null;
  }>;
  const chartCursor = toDate(chartRange.start);

  while (formatDateIso(chartCursor) <= chartRange.end) {
    const date = formatDateIso(chartCursor);
    const entry = chartEntriesByDate.get(date);

    chartData.push({
      date,
      label: entry?.label ?? "",
      weightKg: entry?.weightKg ?? null,
      weightedAverage: entry?.weightedAverage ?? null,
      projectedWeight: date === selectedChartDate ? projectedWeight : null,
    });
    chartCursor.setDate(chartCursor.getDate() + 1);
  }

  return (
    <div style={weightChartCardStyle}>
      <div style={weightChartCanvasStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 8, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="weightTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d16d3f" stopOpacity={0.48} />
                <stop offset="85%" stopColor="#d16d3f" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(100, 87, 77, 0.14)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64574d", fontSize: 11 }}
              minTickGap={28}
              padding={{ left: 14, right: 14 }}
              tickFormatter={(date) =>
                new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                }).format(toDate(date))
              }
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64574d", fontSize: 11 }}
              tickFormatter={(value) => `${value}`}
              domain={[axisMinimum, axisMaximum]}
              ticks={fullKilogramTicks}
            />
            <Tooltip
              cursor={{ stroke: "rgba(209, 109, 63, 0.32)", strokeWidth: 1 }}
              contentStyle={weightChartTooltipStyle}
              formatter={(value, name) => {
                const measuredValue = Array.isArray(value) ? value[0] : value;
                const label =
                  name === "weightKg"
                    ? "Waga"
                    : name === "projectedWeight"
                      ? "Waga projektowana"
                      : "Średnia ważona";

                return [
                  `${typeof measuredValue === "number" ? measuredValue.toFixed(1) : (measuredValue ?? "-")} kg`,
                  label,
                ];
              }}
              labelFormatter={(_label, payload) =>
                payload[0]?.payload.date ?? ""
              }
            />
            {halfKilogramMarks.map((mark) => (
              <ReferenceLine
                key={mark}
                y={mark}
                stroke="rgba(100, 87, 77, 0.1)"
                strokeDasharray="2 5"
              />
            ))}
            <Area
              type="monotone"
              dataKey="weightedAverage"
              stroke="#b84f27"
              strokeWidth={2.5}
              fill="url(#weightTrendFill)"
              dot={false}
              activeDot={false}
              connectNulls
              animationDuration={750}
            />
            <Line
              type="monotone"
              dataKey="weightKg"
              stroke="#176f86"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls
              animationDuration={750}
            />
            {projectedWeight !== null && (
              <>
                <Line
                  type="linear"
                  dataKey="projectedWeight"
                  stroke="#7050a8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  animationDuration={750}
                />
                <ReferenceDot
                  x={selectedChartPoint?.date}
                  y={projectedWeight}
                  r={4}
                  fill="#7050a8"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            )}
            {selectedChartPoint && (
              <ReferenceLine
                x={selectedChartPoint.date}
                stroke="#176f86"
                strokeWidth={2}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            <ReferenceLine
              x={todayChartDate}
              stroke="#dc3e4b"
              strokeWidth={1}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={weightChartSummaryStyle}>
        <span>Trend: średnia ważona z maks. 3 pomiarów</span>
        {selectedChartDate && projectedWeight !== null && (
          <span>
            Prognoza na {selectedChartDate}: {projectedWeight.toFixed(1)} kg
          </span>
        )}
        <span>
          Min: {Math.min(...entries.map((entry) => entry.weightKg)).toFixed(1)}{" "}
          kg
        </span>
        <span>
          Max: {Math.max(...entries.map((entry) => entry.weightKg)).toFixed(1)}{" "}
          kg
        </span>
      </div>
    </div>
  );
}
