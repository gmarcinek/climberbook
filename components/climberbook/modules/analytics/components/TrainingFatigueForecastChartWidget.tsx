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
import { getTrainingLoad } from "./TrainingLoadModel";
import type { TrainingRecord } from "@/lib/climbs-db";

const forecastDays = 7;
const dailyRecoveryMultiplier = 0.72;

function getSessionTimestamp(training: TrainingRecord) {
  const time = /^\d{2}:\d{2}$/.test(training.time) ? training.time : "12:00";

  return new Date(`${training.date}T${time}:00`).getTime();
}

function formatFatigueForecastData(
  trainings: TrainingRecord[],
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
    fatigue: number | null;
    forecast: number | null;
  }> = [];
  let fatigue = 0;
  let lastTimestamp = new Date(`${range.start}T00:00:00`).getTime();

  for (let date = range.start; date <= forecastEnd; date = addDays(date, 1)) {
    const isForecast = date > range.end;
    const sessions = isForecast
      ? []
      : (sessionsByDate.get(date) ?? []).sort(
          (left, right) => getSessionTimestamp(left) - getSessionTimestamp(right),
        );
    let load = 0;

    sessions.forEach((session) => {
      const sessionTimestamp = getSessionTimestamp(session);
      const recoveryDays = Math.max(0, sessionTimestamp - lastTimestamp) / 86_400_000;

      fatigue *= Math.pow(dailyRecoveryMultiplier, recoveryDays);
      const sessionLoad = getTrainingLoad(session);

      load += sessionLoad;
      fatigue = Math.min(100, fatigue + sessionLoad);
      lastTimestamp = sessionTimestamp;
    });

    const nextDayTimestamp = new Date(`${addDays(date, 1)}T00:00:00`).getTime();
    const recoveryDays = Math.max(0, nextDayTimestamp - lastTimestamp) / 86_400_000;

    fatigue *= Math.pow(dailyRecoveryMultiplier, recoveryDays);
    lastTimestamp = nextDayTimestamp;
    const roundedFatigue = Math.round(fatigue * 10) / 10;

    data.push({
      date,
      load: Math.round(load * 10) / 10,
      fatigue: isForecast ? null : roundedFatigue,
      forecast: isForecast || date === range.end ? roundedFatigue : null,
    });
  }

  return data;
}

export function TrainingFatigueForecastChartWidget({
  trainings,
  chartRange,
  chartRangeLabel,
  embedded = false,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  embedded?: boolean;
}) {
  const data = formatFatigueForecastData(trainings, chartRange);
  const chart = trainings.length === 0 ? (
    <EmptyState message="Dodaj treningi, aby wyznaczyć prognozę zmęczenia." />
  ) : (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: -10 }}>
        <CartesianGrid vertical={false} {...analyticsChartGridStyle} />
        <XAxis
          dataKey="date"
          minTickGap={28}
          tick={analyticsChartAxisTickStyle}
          tickFormatter={formatAnalyticsDate}
        />
        <YAxis
          domain={[0, 100]}
          width={34}
          tick={analyticsChartAxisTickStyle}
        />
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
          dataKey="fatigue"
          name="Zmęczenie"
          stroke="#d16d3f"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Prognoza"
          stroke="#176f86"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
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
          <span style={softPillStyle}>{chartRangeLabel} + {forecastDays} dni</span>
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