"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softPillStyle,
} from "@/components/climberbook/common/styles";
import { addDays } from "@/components/training-calendar/training-calendar.helpers";
import {
  getTrainingFatigueDimensions,
  type FatigueDimensions,
} from "./TrainingLoadModel";
import type { FacilityRecord, TrainingRecord } from "@/lib/climbs-db";

const forecastDays = 7;
const recoveryDimensionKeys = [
  "fitness",
  "structural",
  "strength",
  "fingers",
] as const;
const dailyRecoveryMultipliers = {
  fitness: 0.72,
  structural: 0.88,
  strength: 0.8,
  fingers: 0.9,
} as const;

function getSessionTimestamp(training: TrainingRecord) {
  const time = /^\d{2}:\d{2}$/.test(training.time) ? training.time : "12:00";

  return new Date(`${training.date}T${time}:00`).getTime();
}

function formatFatigueForecastData(
  trainings: TrainingRecord[],
  facilities: FacilityRecord[],
  range: { start: string; end: string },
) {
  const sessionsByDate = new Map<string, TrainingRecord[]>();

  trainings.forEach((training) => {
    const sessions = sessionsByDate.get(training.date) ?? [];

    sessions.push(training);
    sessionsByDate.set(training.date, sessions);
  });

  const forecastEnd = addDays(range.end, forecastDays);
  const data: Array<{
    date: string;
    load: number;
    fitness: number;
    structural: number;
    strength: number;
    fingers: number;
  }> = [];
  let fatigue: FatigueDimensions = {
    fitness: 0,
    structural: 0,
    strength: 0,
    fingers: 0,
    skill: 0,
  };
  let lastTimestamp = new Date(`${range.start}T00:00:00`).getTime();

  for (let date = range.start; date <= forecastEnd; date = addDays(date, 1)) {
    const isForecast = date > range.end;
    const sessions = isForecast
      ? []
      : (sessionsByDate.get(date) ?? []).sort(
          (left, right) =>
            getSessionTimestamp(left) - getSessionTimestamp(right),
        );
    let load = 0;

    sessions.forEach((session) => {
      const sessionTimestamp = getSessionTimestamp(session);
      const recoveryDays =
        Math.max(0, sessionTimestamp - lastTimestamp) / 86_400_000;

      recoveryDimensionKeys.forEach((dimension) => {
        fatigue[dimension] *= Math.pow(
          dailyRecoveryMultipliers[dimension],
          recoveryDays,
        );
      });
      const dimensions = getTrainingFatigueDimensions(session, facilities);

      recoveryDimensionKeys.forEach((dimension) => {
        fatigue[dimension] += dimensions[dimension];
        load += dimensions[dimension];
      });
      lastTimestamp = sessionTimestamp;
    });

    const nextDayTimestamp = new Date(`${addDays(date, 1)}T00:00:00`).getTime();
    const recoveryDays =
      Math.max(0, nextDayTimestamp - lastTimestamp) / 86_400_000;

    recoveryDimensionKeys.forEach((dimension) => {
      fatigue[dimension] *= Math.pow(
        dailyRecoveryMultipliers[dimension],
        recoveryDays,
      );
    });
    lastTimestamp = nextDayTimestamp;

    data.push({
      date,
      load: Math.round(load * 10) / 10,
      fitness: Math.round(fatigue.fitness * 100) / 100,
      structural: Math.round(fatigue.structural * 100) / 100,
      strength: Math.round(fatigue.strength * 100) / 100,
      fingers: Math.round(fatigue.fingers * 100) / 100,
    });
  }

  return data;
}

export function TrainingFatigueForecastChartWidget({
  trainings,
  facilities,
  chartRange,
  chartRangeLabel,
  embedded = false,
}: {
  trainings: TrainingRecord[];
  facilities: FacilityRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  embedded?: boolean;
}) {
  const data = formatFatigueForecastData(trainings, facilities, chartRange);
  const chart =
    trainings.length === 0 ? (
      <EmptyState message="Dodaj treningi, aby wyznaczyć prognozę zmęczenia." />
    ) : (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
          <ReferenceLine
            x={chartRange.end}
            stroke="rgba(23, 111, 134, 0.56)"
            strokeDasharray="4 4"
          />
          <Tooltip
            formatter={(value, name) => [`${value}`, name]}
            labelFormatter={(label) =>
              typeof label === "string" ? formatAnalyticsDate(label) : ""
            }
          />
          <Line
            type="monotone"
            dataKey="fitness"
            name="Wydolność"
            stroke="#d16d3f"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="structural"
            name="Strukturalne"
            stroke="#176f86"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="strength"
            name="Siła"
            stroke="#7d6a34"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="fingers"
            name="Palce"
            stroke="#76516c"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );

  if (embedded) {
    return (
      <>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Prognoza</span>
            <h3 style={sectionTitleStyle}>Szacowane zmęczenie treningowe</h3>
          </div>
          <span style={softPillStyle}>
            {chartRangeLabel} + {forecastDays} dni
          </span>
        </div>
        <div style={{ height: 260 }}>{chart}</div>
      </>
    );
  }

  return (
    <AnalyticsChartPanel
      eyebrow="Prognoza"
      title="Szacowane zmęczenie treningowe"
      badge={`${chartRangeLabel} + ${forecastDays} dni`}
    >
      {chart}
    </AnalyticsChartPanel>
  );
}
