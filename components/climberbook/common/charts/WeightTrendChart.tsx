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

function getWeightTimestamp(entry: WeightEntryRecord) {
  const match = entry.time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  const hours = match ? Number(match[1]) : 12;
  const minutes = match ? Number(match[2]) : 0;
  const seconds = match?.[3] ? Number(match[3]) : 0;
  const isValidTime = hours < 24 && minutes < 60 && seconds < 60;
  const time = isValidTime
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : "12:00:00";

  return new Date(`${formatDateIso(entry.date)}T${time}`).getTime();
}

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

  const weightMeasurements = entries
    .map((entry) => ({
      ...entry,
      date: formatDateIso(entry.date),
      timestamp: getWeightTimestamp(entry),
    }))
    .sort((left, right) => left.timestamp - right.timestamp);
  const chartEntries = weightMeasurements.map((entry, index, allEntries) => {
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
      time: entry.time,
      timestamp: entry.timestamp,
      label: new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(entry.timestamp)),
      weightKg: entry.weightKg,
      weightedAverage: roundToSingleDecimal(weightSum / divisor),
    };
  });
  const measuredWeights = chartEntries.flatMap((entry) => [
    entry.weightKg,
    entry.weightedAverage,
  ]);
  const now = new Date();
  const todayTimestamp = now.getTime();
  const chartStartTimestamp = toDate(chartRange.start).getTime();
  const requestedChartEndTimestamp = new Date(`${chartRange.end}T23:59:59.999`).getTime();
  const tomorrowEnd = new Date(now);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const chartEndTimestamp = Math.min(
    requestedChartEndTimestamp,
    tomorrowEnd.getTime(),
  );
  const selectedChartDate =
    selectedDate &&
    selectedDate >= chartRange.start &&
    selectedDate <= chartRange.end
      ? formatDateIso(selectedDate)
      : null;
  const selectedChartPoint = selectedChartDate
    ? {
        date: selectedChartDate,
        timestamp: toDate(selectedChartDate).getTime(),
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
    (latestChartEntry.timestamp - previousChartEntry.timestamp) /
      86_400_000,
  );
  const trendPerDay =
    (latestChartEntry.weightedAverage - previousChartEntry.weightedAverage) /
    trendDays;
  const visibleChartEntries = chartEntries.filter(
    (entry) =>
      entry.timestamp >= chartStartTimestamp &&
      entry.timestamp <= chartEndTimestamp,
  );
  const latestVisibleChartEntry = visibleChartEntries.at(-1) ?? null;
  const estimationDays = latestVisibleChartEntry
    ? Math.max(0, (chartEndTimestamp - latestVisibleChartEntry.timestamp) / 86_400_000)
    : 0;
  const estimatedWeight = latestVisibleChartEntry && estimationDays > 0
    ? roundToSingleDecimal(
        Math.min(
          latestVisibleChartEntry.weightKg + 1,
          Math.max(
            latestVisibleChartEntry.weightKg - 1,
            latestVisibleChartEntry.weightKg + trendPerDay * estimationDays,
          ),
        ),
      )
    : null;
  const chartWeights = estimatedWeight === null
    ? measuredWeights
    : [...measuredWeights, estimatedWeight];
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
  const chartData = [] as Array<{
    timestamp: number;
    date: string;
    time: string;
    label: string;
    weightKg: number | null;
    weightedAverage: number | null;
    projectedWeight: number | null;
  }>;
  chartData.push(...visibleChartEntries.map((entry) => ({
    ...entry,
    projectedWeight:
      entry.timestamp === latestVisibleChartEntry?.timestamp
        ? entry.weightKg
        : null,
  })));
  if (estimatedWeight !== null) {
    chartData.push({
      timestamp: chartEndTimestamp,
      date: formatDateIso(new Date(chartEndTimestamp)),
      time: "23:59",
      label: new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(chartEndTimestamp)),
      weightKg: null,
      weightedAverage: null,
      projectedWeight: estimatedWeight,
    });
  }
  chartData.sort((left, right) => left.timestamp - right.timestamp);
  const showsTodayMarker =
    todayTimestamp >= chartStartTimestamp && todayTimestamp <= chartEndTimestamp;
  const showsSelectedMarker =
    selectedChartPoint !== null &&
    selectedChartPoint.timestamp >= chartStartTimestamp &&
    selectedChartPoint.timestamp <= chartEndTimestamp;

  return (
    <div style={weightChartCardStyle}>
      <div style={weightChartCanvasStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 0, bottom: 0, left: 0 }}
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
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={[chartStartTimestamp, chartEndTimestamp]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64574d", fontSize: 8.8 }}
              minTickGap={28}
              padding={{ left: 0, right: 0 }}
              tickFormatter={(timestamp) =>
                new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(timestamp))
              }
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64574d", fontSize: 8.8 }}
              tickFormatter={(value) => `${value}`}
              domain={[axisMinimum, axisMaximum]}
              ticks={fullKilogramTicks}
              width={26}
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
              labelFormatter={(_label, payload) => {
                const point = payload[0]?.payload;
                return point
                  ? `${point.date} · ${point.time}`
                  : "";
              }}
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
              dot={{ r: 3, fill: "#176f86", stroke: "white", strokeWidth: 1 }}
              activeDot={{ r: 4.5, fill: "#176f86", stroke: "white", strokeWidth: 1.5 }}
              connectNulls
              animationDuration={750}
            />
            {estimatedWeight !== null && (
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
                  x={chartEndTimestamp}
                  y={estimatedWeight}
                  r={4}
                  fill="#7050a8"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            )}
            {showsSelectedMarker && selectedChartPoint && (
              <ReferenceLine
                x={selectedChartPoint.timestamp}
                stroke="#176f86"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
            {showsTodayMarker && (
              <ReferenceLine
                x={todayTimestamp}
                stroke="#dc3e4b"
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{ value: "Dzisiaj", position: "insideTopRight", fill: "#dc3e4b", fontSize: 8.8 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={weightChartSummaryStyle}>
        <span>Trend: średnia ważona z maks. 3 pomiarów</span>
        {estimatedWeight !== null && (
          <span>
            Estymacja na {new Intl.DateTimeFormat("pl-PL", {
              day: "numeric",
              month: "short",
            }).format(new Date(chartEndTimestamp))}: {estimatedWeight.toFixed(1)} kg
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
