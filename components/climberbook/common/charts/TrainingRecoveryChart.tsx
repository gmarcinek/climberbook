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
import { addDays } from "@/components/training-calendar/training-calendar.helpers";
import {
  getTrainingLoad,
  getTrainingStimulusImpact,
  getTrainingStimulusScale,
} from "@/components/climberbook/modules/analytics/components/TrainingLoadModel";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import type { FacilityRecord, TrainingRecord } from "@/lib/climbs-db";

const desktopVisibleHistoryDays = 21;
const mobileVisibleHistoryDays = 14;
const historyDays = 42;
const maxFatigue = 150;
const fatigueScale = 0.7;

type ChartPoint = {
  timestamp: number;
  calories: number | null;
  caloriesForecast?: number | null;
  fatigue: number | null;
  fatigueForecast?: number | null;
  coin?: number | null;
  baselineCoin?: number | null;
  scalePercent?: number | null;
};

function getSessionTimestamp(training: TrainingRecord) {
  const match = training.time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  const hours = match ? Number(match[1]) : 12;
  const minutes = match ? Number(match[2]) : 0;
  const seconds = match?.[3] ? Number(match[3]) : 0;
  const validTime = hours < 24 && minutes < 60 && seconds < 60;
  const time = validTime
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : "12:00:00";
  return new Date(`${training.date}T${time}`).getTime();
}

function getDayEndTimestamp(date: string) {
  return new Date(`${addDays(date, 1)}T00:00:00`).getTime();
}

function getDateKey(timestamp: number) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getForecastStartTimestamp() {
  return getDayEndTimestamp(getDateKey(Date.now()));
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getRecoveryRatePerHour(age: number | null) {
  const ageAdjustment = age ? Math.max(0, age - 30) * 0.02 : 0;
  return Math.max(1.65, 2.1 - ageAdjustment);
}

function getWeightedCalories(calories: number[]) {
  const recentCalories = calories.slice(-3);
  const divisor = recentCalories.reduce(
    (sum, _calories, index) => sum + index + 1,
    0,
  );
  const weightedSum = recentCalories.reduce(
    (sum, caloriesBurned, index) => sum + caloriesBurned * (index + 1),
    0,
  );
  return divisor === 0 ? null : Math.round(weightedSum / divisor);
}

function getAxisTicks(range: { start: string; end: string }, end: string) {
  const days = Math.round(
    (new Date(`${end}T00:00:00`).getTime() -
      new Date(`${range.start}T00:00:00`).getTime()) /
      86_400_000,
  );
  const interval = Math.max(1, Math.ceil(days / 7));
  const ticks: number[] = [];

  for (let date = range.start; date <= end; date = addDays(date, interval)) {
    ticks.push(getDayEndTimestamp(date));
  }

  const finalTick = getDayEndTimestamp(end);
  if (ticks.at(-1) !== finalTick) ticks.push(finalTick);
  return ticks;
}

function getChartEnd(
  trainings: TrainingRecord[],
  range: { start: string; end: string },
  recoveryRatePerHour: number,
  facilities: FacilityRecord[],
) {
  const sessionsByDate = new Map<string, TrainingRecord[]>();
  trainings.forEach((training) => {
    const sessions = sessionsByDate.get(training.date) ?? [];
    sessions.push(training);
    sessionsByDate.set(training.date, sessions);
  });

  const modelStart = addDays(range.start, -historyDays);
  let fatigue = 0;
  let lastTimestamp = new Date(`${modelStart}T00:00:00`).getTime();
  let lastTrainingTimestamp: number | null = null;
  let fatigueAfterLastTraining = 0;

  for (let date = modelStart; date <= range.end; date = addDays(date, 1)) {
    const sessions = (sessionsByDate.get(date) ?? []).sort(
      (left, right) => getSessionTimestamp(left) - getSessionTimestamp(right),
    );
    sessions.forEach((session) => {
      const timestamp = getSessionTimestamp(session);
      fatigue = Math.max(
        0,
        fatigue -
          ((timestamp - lastTimestamp) / 3_600_000) * recoveryRatePerHour,
      );
      fatigue = Math.min(
        maxFatigue,
        fatigue + getTrainingLoad(session, facilities),
      );
      lastTimestamp = timestamp;
      lastTrainingTimestamp = timestamp;
      fatigueAfterLastTraining = fatigue;
    });

    const dayEndTimestamp = getDayEndTimestamp(date);
    fatigue = Math.max(
      0,
      fatigue -
        ((dayEndTimestamp - lastTimestamp) / 3_600_000) * recoveryRatePerHour,
    );
    lastTimestamp = dayEndTimestamp;
  }

  if (lastTrainingTimestamp === null) {
    return {
      chartEnd: addDays(range.end, 1),
      recoveryEndTimestamp: getDayEndTimestamp(range.end),
      lastTrainingTimestamp: null,
    };
  }

  const recoveryEndTimestamp =
    lastTrainingTimestamp +
    (fatigueAfterLastTraining / recoveryRatePerHour) * 3_600_000;
  return {
    chartEnd: getDateKey(recoveryEndTimestamp),
    recoveryEndTimestamp,
    lastTrainingTimestamp,
  };
}

function getChartData(
  trainings: TrainingRecord[],
  range: { start: string; end: string },
  age: number | null,
  facilities: FacilityRecord[],
) {
  const sessionsByDate = new Map<string, TrainingRecord[]>();
  trainings.forEach((training) => {
    const sessions = sessionsByDate.get(training.date) ?? [];
    sessions.push(training);
    sessionsByDate.set(training.date, sessions);
  });

  const modelStart = addDays(range.start, -historyDays);
  const visibleStart = new Date(`${range.start}T00:00:00`).getTime();
  const recoveryRatePerHour = getRecoveryRatePerHour(age);
  const forecastStartTimestamp = getForecastStartTimestamp();
  const { recoveryEndTimestamp, lastTrainingTimestamp } = getChartEnd(
    trainings,
    range,
    recoveryRatePerHour,
    facilities,
  );
  const chartEnd = addDays(getDateKey(Date.now()), 1);
  const visibleEnd = getDayEndTimestamp(chartEnd);
  const fatiguePoints: ChartPoint[] = [];
  const caloriesPoints: ChartPoint[] = [];
  let fatigue = 0;
  let lastTimestamp = new Date(`${modelStart}T00:00:00`).getTime();
  let previousPeak: { timestamp: number; fatigue: number } | null = null;

  const recoverTo = (timestamp: number) => {
    const elapsedHours = Math.max(0, timestamp - lastTimestamp) / 3_600_000;
    fatigue = Math.max(0, fatigue - elapsedHours * recoveryRatePerHour);
    lastTimestamp = timestamp;
  };

  for (let date = modelStart; date <= chartEnd; date = addDays(date, 1)) {
    const isForecast = date > range.end;
    const sessions = isForecast
      ? []
      : (sessionsByDate.get(date) ?? []).sort(
          (left, right) =>
            getSessionTimestamp(left) - getSessionTimestamp(right),
        );

    sessions.forEach((session) => {
      const timestamp = getSessionTimestamp(session);
      if (previousPeak) {
        const fullRecoveryTimestamp =
          previousPeak.timestamp +
          (previousPeak.fatigue / recoveryRatePerHour) * 3_600_000;
        if (
          fullRecoveryTimestamp < timestamp &&
          fullRecoveryTimestamp >= visibleStart
        ) {
          fatiguePoints.push({
            timestamp: fullRecoveryTimestamp,
            calories: null,
            fatigue: 0,
          });
        }
      }
      recoverTo(timestamp);
      if (timestamp >= visibleStart) {
        fatiguePoints.push({
          timestamp,
          calories: null,
          fatigue: Math.round(fatigue),
        });
        caloriesPoints.push({
          timestamp,
          calories: session.caloriesBurned,
          fatigue: null,
        });
      }

      const load = getTrainingLoad(session, facilities);
      fatigue = Math.min(maxFatigue, fatigue + load);
      previousPeak = { timestamp, fatigue };
      if (timestamp >= visibleStart) {
        fatiguePoints.push({
          timestamp,
          calories: null,
          fatigue: Math.round(fatigue),
        });
      }
    });

    const dayEndTimestamp = getDayEndTimestamp(date);
    recoverTo(dayEndTimestamp);
  }

  if (recoveryEndTimestamp <= visibleEnd) {
    fatiguePoints.push({
      timestamp: recoveryEndTimestamp,
      calories: null,
      fatigue: 0,
    });
  } else {
    fatiguePoints.push({
      timestamp: visibleEnd,
      calories: null,
      fatigue: Math.round(fatigue),
    });
  }

  const sessionCalories = caloriesPoints
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((point) => point.calories)
    .filter((calories): calories is number => calories !== null);
  const weightedCalories = getWeightedCalories(sessionCalories);
  const calorieForecastPoint =
    weightedCalories === null
      ? []
      : [
          {
            timestamp: visibleEnd,
            calories: null,
            caloriesForecast: weightedCalories,
            fatigue: null,
          },
        ];

  const combinedData = [
    ...fatiguePoints,
    ...caloriesPoints,
    ...calorieForecastPoint,
  ].sort((left, right) => left.timestamp - right.timestamp);
  const lastObservedFatigueIndex = combinedData.reduce(
    (lastIndex, point, index) =>
      point.fatigue !== null && point.timestamp <= forecastStartTimestamp
        ? index
        : lastIndex,
    -1,
  );
  const lastObservedCaloriesIndex = combinedData.reduce(
    (lastIndex, point, index) => (point.calories !== null ? index : lastIndex),
    -1,
  );

  return {
    chartEnd,
    lastTrainingTimestamp,
    recoveryEndTimestamp,
    data: combinedData.map((point, index) => ({
      ...point,
      caloriesForecast:
        point.caloriesForecast ??
        (index === lastObservedCaloriesIndex ? point.calories : null),
      fatigue:
        point.fatigue !== null && point.timestamp <= forecastStartTimestamp
          ? Math.round(point.fatigue * fatigueScale)
          : null,
      fatigueForecast:
        point.fatigue !== null &&
        (point.timestamp > forecastStartTimestamp ||
          index === lastObservedFatigueIndex)
          ? Math.round(point.fatigue * fatigueScale)
          : null,
    })),
  };
}

function getStimulusChartData(
  trainings: TrainingRecord[],
  range: { start: string; end: string },
  facilities: FacilityRecord[],
) {
  return trainings
    .filter(
      (training) => training.date >= range.start && training.date <= range.end,
    )
    .sort(
      (left, right) => getSessionTimestamp(left) - getSessionTimestamp(right),
    )
    .map((training) => {
      const impact = getTrainingStimulusImpact(training, facilities);
      const scale = getTrainingStimulusScale(training, trainings, facilities);
      return {
        timestamp: getSessionTimestamp(training),
        coin: impact.coin,
        baselineCoin: scale?.baselineCoin ?? null,
        scalePercent: scale ? Math.round(scale.ratio * 100) : null,
      };
    });
}

function ChartLegend() {
  return (
    <div style={legendStyle}>
      <span style={legendItemStyle}>
        <i style={{ ...legendDotStyle, background: "#0d6b7c" }} />
        Impakt sesji
      </span>
      <span style={legendItemStyle}>
        <i style={{ ...legendDotStyle, background: "#d16d3f" }} />
        Średnia z 4 tygodni
      </span>
    </div>
  );
}

export function TrainingRecoveryChart({
  trainings,
  chartRange,
  chartRangeLabel,
  age,
  isMobileLayout,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  age: number | null;
  isMobileLayout: boolean;
}) {
  const { facilities } = useClimberbook();
  const visibleHistoryDays = isMobileLayout
    ? mobileVisibleHistoryDays
    : desktopVisibleHistoryDays;
  const recoveryChartEnd = addDays(getDateKey(Date.now()), 1);
  const visibleRange = {
    start: addDays(recoveryChartEnd, -(visibleHistoryDays - 1)),
    end: recoveryChartEnd,
  };
  const data = getStimulusChartData(trainings, visibleRange, facilities);
  const todayTimestamp = Date.now();
  const xAxisTicks = getAxisTicks(visibleRange, visibleRange.end);
  const highestScalePercent = Math.max(
    125,
    ...data.map((point) => point.scalePercent ?? 0),
  );
  const scaleAxisMax = Math.ceil(highestScalePercent / 25) * 25;

  return (
    <section style={chartStyle}>
      <div style={headingStyle}>
        <div>
          <span style={eyebrowStyle}>Bodziec</span>
          <h3 style={titleStyle}>Impakt treningów</h3>
        </div>
        <span style={badgeStyle}>Ostatnie {visibleHistoryDays} dni</span>
      </div>
      <div style={{ height: 290 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 14, right: 8, bottom: 4, left: -10 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="rgba(100, 87, 77, 0.14)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={xAxisTicks}
              tick={{ fontSize: 9.6 }}
              tickFormatter={formatDate}
            />
            <YAxis
              domain={[0, scaleAxisMax]}
              width={34}
              tick={{ fontSize: 9.6 }}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine
              x={todayTimestamp}
              stroke="#d34b46"
              strokeDasharray="5 5"
              label={{
                value: "Dzisiaj",
                position: "insideTopRight",
                fill: "#d34b46",
                fontSize: 9.6,
              }}
            />
            <ReferenceLine
              y={100}
              stroke="rgba(209, 109, 63, 0.7)"
              strokeDasharray="4 5"
              label={{
                value: "Średnia 4 tyg. · 100%",
                position: "insideLeft",
                fill: "#d16d3f",
                fontSize: 9.6,
              }}
            />
            <Tooltip
              labelFormatter={(label) =>
                typeof label === "number" ? formatDateTime(label) : ""
              }
              formatter={(value, name) => {
                if (name === "Impakt sesji") {
                  return [`${value ?? 0}%`, name];
                }
                return [`${Number(value ?? 0).toFixed(4)} coin`, name];
              }}
            />
            <Line
              type="monotoneX"
              dataKey="scalePercent"
              name="Impakt sesji"
              stroke="#0d6b7c"
              strokeWidth={2.5}
              strokeLinecap="round"
              dot={{ r: 3, fill: "#0d6b7c", stroke: "white", strokeWidth: 1.5 }}
              activeDot={{
                r: 4.5,
                fill: "#0d6b7c",
                stroke: "white",
                strokeWidth: 1.5,
              }}
              connectNulls
              animationDuration={400}
            />
            <Line
              type="monotoneX"
              dataKey="baselineCoin"
              name="Średnia z 4 tygodni"
              stroke="#d16d3f"
              strokeWidth={0}
              strokeLinecap="round"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend />
      <p style={noteStyle}>
        Każdy punkt to obiektywny impakt sesji względem średniej na sesję z
        poprzednich 28 dni. Linia 100% oznacza trening w skali.
      </p>
    </section>
  );
}

const chartStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.44))",
};
const headingStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  flexWrap: "wrap" as const,
};
const eyebrowStyle = {
  display: "inline-block",
  color: "var(--accent)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};
const titleStyle = { margin: "2px 0 0", fontSize: "1rem" };
const badgeStyle = {
  padding: "4px 6px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.52))",
  border: "1px solid rgba(255, 255, 255, 0.34)",
  color: "var(--muted)",
  fontSize: "0.85rem",
};
const noteStyle = {
  margin: 0,
  color: "var(--muted)",
  fontSize: "0.82rem",
  lineHeight: 1.4,
};
const legendStyle = {
  display: "flex",
  flexWrap: "nowrap" as const,
  gap: 16,
  overflowX: "auto" as const,
  padding: "0 2px",
  color: "var(--muted)",
  fontSize: "0.75rem",
};
const legendItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};
const legendDotStyle = {
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: "50%",
};
