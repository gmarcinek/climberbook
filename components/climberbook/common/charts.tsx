"use client";

import { FormEvent, useState } from "react";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";
import {
  formatDateIso,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import {
  formatWeightInput,
  getRollingChartTicks,
  getRopeGradeColor,
  getRopeGradeIndex,
  parseWeightInput,
  roundToSingleDecimal,
  ROPE_GRADE_SCALE,
  type WeightEntryDraft,
} from "@/components/climberbook/common/training";
import {
  analyticsPanelInnerStyle,
  analyticsStatsGridStyle,
  buttonStyle,
  chartCardStyle,
  fieldStyle,
  formActionsStyle,
  formStyle,
  ghostButtonStyle,
  inputStyle,
  listCardHeaderStyle,
  listCardStyle,
  metricCardStyle,
  metricValueStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  scrollListStyle,
  sectionTitleStyle,
  softPillStyle,
  softTagStyle,
  weightChartCanvasStyle,
  weightChartCardStyle,
  weightChartSummaryStyle,
  weightChartTooltipStyle,
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
import type { TrainingRecord, WeightEntryRecord } from "@/lib/climbs-db";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article style={metricCardStyle}>
      <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
        {label}
      </span>
      <strong style={metricValueStyle}>{value}</strong>
      <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
        {detail}
      </span>
    </article>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p style={{ margin: 0, color: "var(--muted)" }}>{message}</p>;
}

export function TrainingAnalyticsPanel(props: {
  latestWeightKg: number | null | undefined;
  latestWeightDate: string | null;
  latestWeightChange: number | null;
  averageWeight: string;
  totalTrainingTime: number;
  totalCalories: number;
  weightChartEntries: WeightEntryRecord[];
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  weightEntryDraft: WeightEntryDraft;
  onWeightEntryDraftChange: (draft: WeightEntryDraft) => void;
  onWeightEntrySubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  recentWeightEntries: WeightEntryRecord[];
}) {
  const {
    latestWeightKg,
    latestWeightDate,
    latestWeightChange,
    averageWeight,
    totalTrainingTime,
    totalCalories,
    weightChartEntries,
    trainings,
    chartRange,
    chartRangeLabel,
    weightEntryDraft,
    onWeightEntryDraftChange,
    onWeightEntrySubmit,
    recentWeightEntries,
  } = props;
  const [isWeightEntryModalOpen, setIsWeightEntryModalOpen] = useState(false);

  async function handleWeightEntryModalSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const wasSaved = await onWeightEntrySubmit(event);

    if (wasSaved) {
      setIsWeightEntryModalOpen(false);
    }
  }

  return (
    <div style={analyticsPanelInnerStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Analityka</span>
          <h2 style={sectionTitleStyle}>Waga i trend</h2>
        </div>
        <span style={softTagStyle}>Bieżący miesiąc</span>
      </div>

      <div style={analyticsStatsGridStyle}>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Ostatni pomiar
          </span>
          <strong style={metricValueStyle}>
            {latestWeightKg ? `${latestWeightKg.toFixed(1)} kg` : "-"}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            {latestWeightDate ?? "Brak wpisu"}
          </span>
        </article>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Zmiana
          </span>
          <strong style={metricValueStyle}>
            {latestWeightChange === null
              ? "-"
              : `${latestWeightChange > 0 ? "+" : ""}${latestWeightChange.toFixed(1)} kg`}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Vs poprzedni pomiar
          </span>
        </article>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Średnia
          </span>
          <strong style={metricValueStyle}>
            {averageWeight === "-" ? "-" : `${averageWeight} kg`}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Na bazie treningów
          </span>
        </article>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Objętość
          </span>
          <strong style={metricValueStyle}>{totalTrainingTime} min</strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Kalorie: {totalCalories}
          </span>
        </article>
      </div>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Wykres wagi</span>
            <h3 style={sectionTitleStyle}>Ostatnie pomiary</h3>
          </div>
          <span style={softPillStyle}>{weightChartEntries.length} pkt</span>
          <button
            type="button"
            onClick={() => setIsWeightEntryModalOpen(true)}
            style={{ ...buttonStyle, justifySelf: "start" }}
          >
            Dodaj pomiar
          </button>
        </div>
        <WeightTrendChart
          entries={weightChartEntries}
          chartRange={chartRange}
        />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Treningi z liną i MoonBoard</span>
            <h3 style={sectionTitleStyle}>Wyceny na sesję</h3>
          </div>
          <span style={softPillStyle}>Zakres +/- 2 stopnie</span>
        </div>
        <RopeTrainingGradesChart
          trainings={trainings}
          chartRange={chartRange}
        />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Kalorie</span>
            <h3 style={sectionTitleStyle}>Dzienne spalanie</h3>
          </div>
          <span style={softPillStyle}>{chartRangeLabel}</span>
        </div>
        <TrainingCaloriesChart trainings={trainings} chartRange={chartRange} />
      </section>

      {isWeightEntryModalOpen && (
        <div
          style={weightEntryModalOverlayStyle}
          role="presentation"
          onMouseDown={() => setIsWeightEntryModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="weight-entry-modal-title"
            style={weightEntryModalStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={panelHeadingStyle}>
              <div>
                <span style={moduleEyebrowStyle}>Pomiar wagi</span>
                <h3 id="weight-entry-modal-title" style={sectionTitleStyle}>
                  Dodaj pomiar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightEntryModalOpen(false)}
                style={ghostButtonStyle}
              >
                Zamknij
              </button>
            </div>

            <form onSubmit={handleWeightEntryModalSubmit} style={formStyle}>
              <label style={fieldStyle}>
                Data pomiaru
                <input
                  value={weightEntryDraft.date}
                  onChange={(event) =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      date: event.target.value,
                    })
                  }
                  type="date"
                  required
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                Godzina pomiaru
                <input
                  value={weightEntryDraft.time}
                  onChange={(event) =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      time: event.target.value,
                    })
                  }
                  type="time"
                  required
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                Waga (kg)
                <input
                  value={weightEntryDraft.weightKg}
                  onChange={(event) =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      weightKg: event.target.value.replaceAll(",", "."),
                    })
                  }
                  onBlur={() =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      weightKg: formatWeightInput(
                        parseWeightInput(weightEntryDraft.weightKg),
                      ),
                    })
                  }
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  style={inputStyle}
                />
              </label>

              <div style={formActionsStyle}>
                <button type="submit" style={buttonStyle}>
                  Zapisz pomiar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Szybki przegląd</span>
            <h3 style={sectionTitleStyle}>Ostatnie wpisy</h3>
          </div>
          <span style={softPillStyle}>Max 5</span>
        </div>

        <ScrollPane viewportStyle={scrollListStyle}>
          {recentWeightEntries.length === 0 && (
            <EmptyState message="Nie ma jeszcze osobnych pomiarów wagi." />
          )}
          {recentWeightEntries.slice(0, 5).map((entry) => (
            <article
              key={`${entry.id ?? entry.createdAt}-${entry.date}`}
              style={listCardStyle}
            >
              <div style={listCardHeaderStyle}>
                <strong>{entry.weightKg.toFixed(1)} kg</strong>
                <span style={softPillStyle}>
                  {entry.date} {entry.time}
                </span>
              </div>
            </article>
          ))}
        </ScrollPane>
      </section>
    </div>
  );
}

export function RopeTrainingGradesChart({
  trainings,
  chartRange,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
}) {
  const ropeAndMoonTrainings = trainings
    .filter(
      (training) =>
        (training.surfaces.includes("lina") ||
          training.surfaces.includes("moon")) &&
        training.date >= chartRange.start &&
        training.date <= chartRange.end,
    )
    .sort((left, right) =>
      `${left.date}-${left.time}-${left.createdAt}`.localeCompare(
        `${right.date}-${right.time}-${right.createdAt}`,
      ),
    );
  const ropeTrainings = ropeAndMoonTrainings
    .map((training) => ({
      ...training,
      grades: training.difficultyNotes
        .split(",")
        .map((grade) => grade.trim())
        .map((grade) => ({ grade, gradeIndex: getRopeGradeIndex(grade) }))
        .filter((grade) => grade.gradeIndex >= 0),
    }))
    .filter((training) => training.grades.length > 0);

  if (ropeTrainings.length === 0) {
    return (
      <EmptyState message="Brak treningów z Liną lub MoonBoard i wycen w wybranym okresie." />
    );
  }

  const gradeIndexes = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => grade.gradeIndex),
  );
  const minimumGradeIndex = Math.max(0, Math.min(...gradeIndexes) - 2);
  const maximumGradeIndex = Math.min(
    ROPE_GRADE_SCALE.length - 1,
    Math.max(...gradeIndexes) + 2,
  );
  const points = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => ({
      trainingTimestamp: toDate(training.date).getTime(),
      grade: grade.grade,
      gradeIndex: grade.gradeIndex,
      label: `${training.date} ${training.time}`,
    })),
  );
  const chartTicks = getRollingChartTicks(chartRange.start, chartRange.end);

  return (
    <>
      <div style={weightChartCanvasStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
            <CartesianGrid
              stroke="rgba(100, 87, 77, 0.14)"
              strokeDasharray="3 5"
            />
            <XAxis
              type="number"
              dataKey="trainingTimestamp"
              domain={[
                toDate(chartRange.start).getTime(),
                toDate(chartRange.end).getTime(),
              ]}
              ticks={chartTicks}
              tickFormatter={(value) =>
                new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(value))
              }
            />
            <YAxis
              type="number"
              dataKey="gradeIndex"
              domain={[minimumGradeIndex, maximumGradeIndex]}
              ticks={Array.from(
                { length: maximumGradeIndex - minimumGradeIndex + 1 },
                (_value, index) => minimumGradeIndex + index,
              )}
              tickFormatter={(value) => ROPE_GRADE_SCALE[value] ?? ""}
              label={{ value: "Wycena", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(_value, _name, item) => [
                ROPE_GRADE_SCALE[item.payload.gradeIndex] ?? "",
                "Wycena",
              ]}
              labelFormatter={(_value, payload) =>
                payload[0]?.payload.label ?? ""
              }
            />
            <Scatter data={points} name="Wyceny">
              {points.map((point, index) => (
                <Cell
                  key={`${point.label}-${point.grade}-${index}`}
                  fill={getRopeGradeColor(point.grade)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function TrainingCaloriesChart({
  trainings,
  chartRange,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
}) {
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
