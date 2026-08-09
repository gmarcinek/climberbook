"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import { useTheme } from "@/components/climberbook/providers/ThemeProvider";
import { getTrainingStimulusImpact } from "@/components/climberbook/modules/analytics/components/TrainingLoadModel";
import {
  addDays,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import {
  getRopeGradeColor,
  getRopeGradeIndex,
  ROPE_GRADE_SCALE,
} from "@/components/climberbook/common/training";
import { EmptyState } from "@/components/climberbook/common/charts/ChartPrimitives";
import { weightChartCanvasStyle } from "@/components/climberbook/common/styles";
import type {
  FatigueDimension,
  FatigueDimensions,
  FacilityRecord,
  SpraywallIntensity,
  TrainingRecord,
} from "@/lib/climbs-db";

const stimulusDimensionKeys = [
  "aerobicEndurance",
  "strengthEndurance",
  "strengthPower",
  "contactStrength",
] as const satisfies readonly FatigueDimension[];

const stimulusLegendDimensionKeys = [
  "aerobicEndurance",
  "strengthEndurance",
  "strengthPower",
  "contactStrength",
] as const satisfies readonly FatigueDimension[];

const stimulusDimensionConfig: Record<
  FatigueDimension,
  {
    label: string;
    color: string;
    barDataKey:
      | "barAerobicEndurance"
      | "barStrengthEndurance"
      | "barStrengthPower"
      | "barContactStrength";
  }
> = {
  aerobicEndurance: {
    label: "wytrzymałość tlenowa",
    color: "var(--component-chart-stimulus-aerobic)",
    barDataKey: "barAerobicEndurance",
  },
  strengthEndurance: {
    label: "wytrzymałość siłowa",
    color: "var(--component-chart-stimulus-strength-endurance)",
    barDataKey: "barStrengthEndurance",
  },
  strengthPower: {
    label: "siła / moc",
    color: "var(--component-chart-stimulus-strength-power)",
    barDataKey: "barStrengthPower",
  },
  contactStrength: {
    label: "siła kontaktowa",
    color: "var(--component-chart-stimulus-contact-strength)",
    barDataKey: "barContactStrength",
  },
};

const totalStimulusColor = "var(--component-chart-series-average)";
const weightedTotalStimulusColor = "var(--component-chart-series-projection)";
const sessionGradeStimulusColor = "var(--component-chart-series-average)";
const sessionGradeStimulusFillColor = "var(--component-chart-series-baseline)";
const sessionGradeStimulusLineOpacity = 0.5;
const sessionGradeStimulusFillTopOpacity = 0.24;
const sessionGradeStimulusFillBottomOpacity = 0.025;
const weightedStimulusFillTopOpacity = 0.12;
const weightedStimulusFillBottomOpacity = 0.015;

function getDayStartTimestamp(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

function getTrainingTimestamp(training: TrainingRecord) {
  const time = /^\d{2}:\d{2}$/.test(training.time) ? training.time : "12:00";
  return new Date(`${training.date}T${time}:00`).getTime();
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("var(")) {
    return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
  }

  const hexColor = color;
  const normalized = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const stimulusTabs = [
  { key: "all", label: "All" },
  { key: "bar", label: "Słupkowy" },
  { key: "aerobicEndurance", label: "Tlenowa" },
  { key: "strengthEndurance", label: "Siłowa" },
  { key: "strengthPower", label: "Siła / moc" },
  { key: "contactStrength", label: "Kontaktowa" },
] as const;

export function RopeTrainingGradesChart({
  trainings,
  chartRange,
  previewMode = false,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  previewMode?: boolean;
}) {
  const { selectedDate } = useSelectedDates();
  const { facilities } = useClimberbook();
  const [activeGradeTab, setActiveGradeTab] = useState<GradeChartTab>("all");
  const todayDate = new Date().toISOString().slice(0, 10);
  const chartEnd = previewMode
    ? chartRange.end
    : [chartRange.end, addDays(todayDate, 1)].sort()[0];
  const trainingsInRange = trainings
    .filter(
      (training) =>
        training.date >= chartRange.start && training.date <= chartEnd,
    )
    .sort((left, right) =>
      `${left.date}-${left.time}-${left.createdAt}`.localeCompare(
        `${right.date}-${right.time}-${right.createdAt}`,
      ),
    );
  const isPreviewChart = previewMode && trainingsInRange.length === 1;
  const trainingsByDate = new Map<string, TrainingRecord[]>();
  for (const training of trainingsInRange) {
    const dateTrainings = trainingsByDate.get(training.date) ?? [];
    dateTrainings.push(training);
    trainingsByDate.set(training.date, dateTrainings);
  }
  const ropeTrainings = trainingsInRange
    .map((training) => ({
      ...training,
      grades: (training.ropeRoutes?.length
        ? training.ropeRoutes.map((route) => ({
            grade: route.grade,
            completed: route.completed,
          }))
        : getSurfaceGradeValues(training.difficultyBySurface?.lina)
            .concat(
              training.difficultyBySurface?.lina ||
                !training.surfaces.includes("lina")
                ? []
                : getSurfaceGradeValues(training.difficultyNotes),
            )
            .map((grade) => ({ grade, completed: 1 }))
      )
        .map(({ grade, completed }) => ({
          grade,
          completed: Math.min(Math.max(completed ?? 1, 0), 1),
          gradeIndex: getRopeGradeIndex(grade),
          plotX: getPreviewPlotX("lina"),
        }))
        .filter((grade) => grade.gradeIndex >= 0),
    }))
    .filter((training) => training.grades.length > 0);
  const boardTrainings = trainingsInRange.flatMap((training) =>
    (["moon", "kilter", "baldy"] as const).flatMap((surface) => {
      const surfaceGrades = getSurfaceGradeValues(
        training.difficultyBySurface?.[surface],
      );

      if (surfaceGrades.length === 0) {
        return [];
      }

      return surfaceGrades
        .map((grade) => ({
          surface,
          date: training.date,
          grade,
          gradeIndex: getBoardGradeIndex(surface, grade),
          colorGradeIndex: getBoardColorGradeIndex(surface, grade),
          trainingTimestamp: getTrainingTimestamp(training),
          plotX: getPreviewPlotX(surface),
          label: `${training.date} ${training.time}`,
        }))
        .filter((grade) => grade.gradeIndex >= 0 && grade.colorGradeIndex >= 0);
    }),
  );

  const ropeGradeIndexes = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => grade.gradeIndex),
  );
  const minimumGradeIndex = ropeGradeIndexes.length
    ? Math.max(0, Math.min(...ropeGradeIndexes) - 2)
    : 0;
  const maximumGradeIndex = ropeGradeIndexes.length
    ? Math.min(ROPE_GRADE_SCALE.length - 1, Math.max(...ropeGradeIndexes) + 2)
    : ROPE_GRADE_SCALE.length - 1;
  const rawRopePoints = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => ({
      trainingTimestamp: getTrainingTimestamp(training),
      plotX: grade.plotX,
      date: training.date,
      grade: grade.grade,
      completed: grade.completed,
      gradeIndex: grade.gradeIndex,
      surface: "lina" as const,
      label: `${training.date} ${training.time}`,
    })),
  );
  const points = addOccurrenceCounts(rawRopePoints);
  const moonPoints = addOccurrenceCounts(
    boardTrainings.filter((point) => point.surface === "moon"),
  );
  const kilterPoints = addOccurrenceCounts(
    boardTrainings.filter((point) => point.surface === "kilter"),
  );
  const boulderPoints = addOccurrenceCounts(
    boardTrainings.filter((point) => point.surface === "baldy"),
  );
  const spraywallSessions = trainingsInRange
    .filter((training) => training.surfaces.includes("spraywall"))
    .map(
      (
        training,
      ): {
        trainingTimestamp: number;
        plotX: number;
        date: string;
        time: string;
        durationMinutes: number;
        intensity: SpraywallIntensity;
        bottomOffset: number;
      } => ({
        trainingTimestamp: getTrainingTimestamp(training),
        plotX: getPreviewPlotX("spraywall"),
        date: training.date,
        time: training.time,
        durationMinutes: training.durationMinutes,
        intensity: training.protocol?.spraywallIntensity ?? "medium",
        bottomOffset:
          (training.surfaces.includes("chwytotablica") ? 12 : 0) +
          (training.surfaces.includes("campus") ? 12 : 0),
      }),
    );
  const availableGradeTabs = gradeChartTabs.filter((tab) => {
    if (tab.key === "all") {
      return true;
    }

    return (
      (tab.key === "lina" && points.length > 0) ||
      (tab.key === "moon" && moonPoints.length > 0) ||
      (tab.key === "kilter" && kilterPoints.length > 0) ||
      (tab.key === "baldy" && boulderPoints.length > 0) ||
      (tab.key === "spraywall" && spraywallSessions.length > 0)
    );
  });
  const displayedGradeTab = availableGradeTabs.some(
    (tab) => tab.key === activeGradeTab,
  )
    ? activeGradeTab
    : "all";
  const showsRope = displayedGradeTab === "all" || displayedGradeTab === "lina";
  const showsBoards = displayedGradeTab !== "lina";
  const showsTrainingBlocks = displayedGradeTab === "all";
  const showsSpraywall =
    displayedGradeTab === "all" || displayedGradeTab === "spraywall";
  const visibleRopePoints = showsRope ? points : [];
  const visibleMoonPoints =
    displayedGradeTab === "all" || displayedGradeTab === "moon"
      ? moonPoints
      : [];
  const visibleKilterPoints =
    displayedGradeTab === "all" || displayedGradeTab === "kilter"
      ? kilterPoints
      : [];
  const visibleBoulderPoints =
    displayedGradeTab === "all" || displayedGradeTab === "baldy"
      ? boulderPoints
      : [];
  const gradeGroupsByDate = groupSessionGradesByDate([
    ...visibleRopePoints,
    ...visibleMoonPoints,
    ...visibleKilterPoints,
    ...visibleBoulderPoints,
  ]);
  const chartEndTimestamp = getDayStartTimestamp(addDays(chartEnd, 1));
  const firstTrainingDate = trainingsInRange[0]?.date;
  const xAxisStartDate =
    firstTrainingDate && firstTrainingDate > chartRange.start
      ? firstTrainingDate
      : chartRange.start;
  const xAxisStartTimestamp = getDayStartTimestamp(xAxisStartDate);
  const chartTicks = getDailyChartTicks(xAxisStartDate, chartEnd);
  const totalStimulusByDate = new Map<
    string,
    { coin: number; trainingTimestamp: number }
  >();
  trainingsInRange.forEach((training) => {
    const impact = getTrainingStimulusImpact(training, facilities, trainings);
    const previous = totalStimulusByDate.get(training.date);

    totalStimulusByDate.set(training.date, {
      coin: (previous?.coin ?? 0) + impact.coin,
      trainingTimestamp: Math.max(
        previous?.trainingTimestamp ?? 0,
        getTrainingTimestamp(training),
      ),
    });
  });
  const totalStimulusPoints = Array.from(
    totalStimulusByDate,
    ([date, { coin, trainingTimestamp }]) => ({
      kind: "total-stimulus" as const,
      date,
      trainingTimestamp,
      coin,
    }),
  ).sort((left, right) => left.trainingTimestamp - right.trainingTimestamp);
  const totalStimulusAxisMax = Math.max(
    0.001,
    ...totalStimulusPoints.map((point) => point.coin),
  );
  const spraywallHoverPoints = spraywallSessions.map((session) => {
    return {
      ...session,
      gradeIndex: 1,
      surface: "spraywall" as const,
    };
  });
  const trainingBlockTimelineItems = trainingsInRange.flatMap((training) =>
    (["chwytotablica", "campus"] as const)
      .filter((surface) => training.surfaces.includes(surface))
      .map((surface) => ({
        kind:
          surface === "chwytotablica"
            ? ("hangboard" as const)
            : ("campus" as const),
        trainingTimestamp: getTrainingTimestamp(training),
        plotX: getPreviewPlotX("chwytotablica"),
        date: training.date,
        time: training.time,
        gradeIndex: 1,
        bottomOffset:
          surface === "campus" && training.surfaces.includes("chwytotablica")
            ? 12
            : 0,
      })),
  );
  const boardAxisAnchors = [
    {
      trainingTimestamp: xAxisStartTimestamp,
      plotX: 0,
      gradeIndex: 1,
    },
    {
      trainingTimestamp: chartEndTimestamp,
      plotX: 2,
      gradeIndex: 9,
    },
  ];
  const hasVisibleGrades =
    visibleRopePoints.length > 0 ||
    visibleMoonPoints.length > 0 ||
    visibleKilterPoints.length > 0 ||
    visibleBoulderPoints.length > 0 ||
    (showsSpraywall && spraywallSessions.length > 0);
  const xAxisDataKey = isPreviewChart ? "plotX" : "trainingTimestamp";
  const xAxisDomain = isPreviewChart
    ? [0, 2]
    : [xAxisStartTimestamp, chartEndTimestamp];
  const xAxisTicks = isPreviewChart ? [1] : chartTicks;
  const selectedTrainingTimestamp =
    !isPreviewChart &&
    selectedDate &&
    selectedDate >= chartRange.start &&
    selectedDate <= chartEnd
      ? toDate(selectedDate).getTime()
      : null;
  const todayTimestamp = Date.now();
  const todayDateTimestamp = toDate(new Date()).getTime();
  const showsTodayMarker =
    !isPreviewChart &&
    todayDateTimestamp >= xAxisDomain[0] &&
    todayDateTimestamp <= xAxisDomain[1];
  const referenceYAxisId = showsRope ? "rope" : "board";
  const previewDate = trainingsInRange[0]?.date ?? chartRange.start;
  const visiblePreviewRopeLines = isPreviewChart
    ? visibleRopePoints.map((point, index) => ({
        key: `${point.label}-${point.grade}-${index}`,
        color: getRopeGradeColor(point.grade),
        data: [
          {
            plotX: 0,
            gradeIndex: minimumGradeIndex,
            date: point.date,
            surface: point.surface,
            grade: point.grade,
          },
          {
            plotX: 1,
            gradeIndex: point.gradeIndex,
            date: point.date,
            surface: point.surface,
            grade: point.grade,
          },
          {
            plotX: 2,
            gradeIndex: minimumGradeIndex,
            date: point.date,
            surface: point.surface,
            grade: point.grade,
          },
        ],
      }))
    : [];

  return (
    <>
      <div
        style={sessionGradeTabsStyle}
        role="tablist"
        aria-label="Wyceny na sesję"
      >
        {availableGradeTabs.map((tab) => {
          const isActive = displayedGradeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-label={`Pokaż wyceny: ${tab.label}`}
              aria-selected={isActive}
              title={tab.label}
              onClick={() => setActiveGradeTab(tab.key)}
              style={{
                ...sessionGradeTabStyle,
                ...(isActive ? sessionGradeTabActiveStyle : undefined),
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {!hasVisibleGrades ? (
        <EmptyState message="Brak wycen dla wybranej powierzchni w tym okresie." />
      ) : (
        <div
          style={{
            ...weightChartCanvasStyle,
            height: 270,
            position: "relative",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 12, right: 0, bottom: 4, left: -16 }}>
              <defs>
                <linearGradient
                  id="sessionGradeStimulusFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={sessionGradeStimulusFillColor}
                    stopOpacity={sessionGradeStimulusFillTopOpacity}
                  />
                  <stop
                    offset="85%"
                    stopColor={sessionGradeStimulusFillColor}
                    stopOpacity={sessionGradeStimulusFillBottomOpacity}
                  />
                </linearGradient>
                {Object.entries(spraywallIntensityConfig).map(
                  ([intensity, config]) => (
                    <linearGradient
                      key={intensity}
                      id={config.gradientId}
                      x1="0"
                      x2="0"
                      y1="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={config.startColor} />
                      <stop offset="100%" stopColor={config.endColor} />
                    </linearGradient>
                  ),
                )}
                <linearGradient
                  id="session-grade-campus-gradient"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--component-chart-activity-campus)"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--component-chart-activity-campus)"
                  />
                </linearGradient>
                <pattern
                  id="session-grade-hangboard-stripes"
                  width="10"
                  height="20"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect
                    width="10"
                    height="10"
                    fill="var(--component-chart-activity-hangboard-start)"
                  />
                  <rect
                    y="10"
                    width="10"
                    height="10"
                    fill="var(--component-chart-activity-hangboard-end)"
                  />
                </pattern>
                <pattern
                  id="session-grade-campus-dots-dense"
                  width="4"
                  height="4"
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    width="4"
                    height="4"
                    fill="url(#session-grade-campus-gradient)"
                  />
                  <circle
                    cx="2"
                    cy="2"
                    r="1"
                    fill="var(--component-chart-marker-outline)"
                  />
                </pattern>
              </defs>
              <CartesianGrid
                stroke="var(--component-chart-grid)"
                strokeDasharray="3 5"
              />
              <XAxis
                type="number"
                dataKey={xAxisDataKey}
                domain={xAxisDomain}
                ticks={xAxisTicks}
                interval={0}
                tick={{ fontSize: 9.6, fill: "var(--component-chart-axis)" }}
                tickFormatter={(value) =>
                  isPreviewChart
                    ? new Intl.DateTimeFormat("pl-PL", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(previewDate))
                    : new Intl.DateTimeFormat("pl-PL", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(value))
                }
              />
              {showsTodayMarker && (
                <ReferenceLine
                  yAxisId={referenceYAxisId}
                  x={todayTimestamp}
                  stroke="var(--component-chart-marker-today)"
                  strokeDasharray="5 5"
                  label={{
                    value: "Dzisiaj",
                    position: "insideTopRight",
                    fill: "var(--component-chart-marker-today)",
                    fontSize: 9.6,
                  }}
                />
              )}
              {selectedTrainingTimestamp !== null && (
                <ReferenceLine
                  x={selectedTrainingTimestamp}
                  stroke="var(--component-chart-marker-selected)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
              <YAxis
                yAxisId="rope"
                type="number"
                dataKey="gradeIndex"
                width={40}
                domain={[minimumGradeIndex, maximumGradeIndex]}
                ticks={Array.from(
                  { length: maximumGradeIndex - minimumGradeIndex + 1 },
                  (_value, index) => minimumGradeIndex + index,
                )}
                tickFormatter={(value) => ROPE_GRADE_SCALE[value] ?? ""}
                label={{
                  value: "Francuska",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 9.6 },
                }}
                tick={{ fontSize: 9.6 }}
              />
              {!isPreviewChart && totalStimulusPoints.length > 0 && (
                <YAxis
                  yAxisId="stimulus"
                  type="number"
                  hide
                  domain={[0, totalStimulusAxisMax * 1.12]}
                />
              )}
              {!isPreviewChart && totalStimulusPoints.length > 0 && (
                <Area
                  data={totalStimulusPoints}
                  type="monotone"
                  dataKey="coin"
                  name="Łączny bodziec"
                  yAxisId="stimulus"
                  stroke={sessionGradeStimulusColor}
                  strokeOpacity={sessionGradeStimulusLineOpacity}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="url(#sessionGradeStimulusFill)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: sessionGradeStimulusColor,
                    fillOpacity: sessionGradeStimulusLineOpacity,
                    stroke: "white",
                    strokeWidth: 1.5,
                  }}
                  connectNulls
                  animationDuration={400}
                />
              )}
              {visiblePreviewRopeLines.map((line) => (
                <Line
                  key={line.key}
                  data={line.data}
                  type="natural"
                  dataKey="gradeIndex"
                  yAxisId="rope"
                  stroke={line.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
              {showsBoards && (
                <YAxis
                  yAxisId="board"
                  orientation="left"
                  type="number"
                  dataKey="gradeIndex"
                  width={0}
                  domain={[1, 9]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  interval={0}
                  hide
                />
              )}
              <Tooltip
                shared={false}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const point = payload[0].payload as
                    | SessionGradePoint
                    | SpraywallHoverPoint
                    | TrainingBlockTimelinePoint
                    | TotalStimulusPoint;

                  if ("kind" in point && point.kind === "total-stimulus") {
                    const dateTrainings = trainingsByDate.get(point.date) ?? [];

                    return (
                      <div style={sessionGradeTooltipStyle}>
                        <span>{point.date}</span>
                        {dateTrainings.map((training) => (
                          <div
                            key={training.id}
                            style={sessionGradeTooltipGroupStyle}
                          >
                            <strong>
                              {training.time} · {training.durationMinutes} min
                            </strong>
                            <span>
                              {formatTrainingTooltipContent(training)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (
                    "kind" in point &&
                    (point.kind === "hangboard" || point.kind === "campus")
                  ) {
                    return (
                      <div style={sessionGradeTooltipStyle}>
                        <span>
                          {point.date} {point.time}
                        </span>
                        <div style={sessionGradeTooltipGroupStyle}>
                          <strong>
                            {point.kind === "hangboard"
                              ? "Chwytotablica"
                              : "Campus"}
                          </strong>
                        </div>
                      </div>
                    );
                  }

                  if ("surface" in point && point.surface === "spraywall") {
                    const config = spraywallIntensityConfig[point.intensity];

                    return (
                      <div style={sessionGradeTooltipStyle}>
                        <span>
                          {point.date} {point.time}
                        </span>
                        <div style={sessionGradeTooltipGroupStyle}>
                          <strong>Spraywall</strong>
                          <span>{config.label}</span>
                        </div>
                      </div>
                    );
                  }

                  const gradeGroups = gradeGroupsByDate.get(point.date) ?? [];

                  return (
                    <div style={sessionGradeTooltipStyle}>
                      <span>{point.date}</span>
                      {gradeGroups.map((group) => (
                        <div
                          key={group.surface}
                          style={sessionGradeTooltipGroupStyle}
                        >
                          <strong>{sessionSurfaceLabels[group.surface]}</strong>
                          <span>
                            {formatTooltipGrades(group.surface, group.grades)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {displayedGradeTab === "all" && (
                <CombinedSessionGradeView
                  boardAxisAnchors={boardAxisAnchors}
                  ropePoints={visibleRopePoints}
                  spraywallPoints={spraywallHoverPoints}
                  trainingBlockPoints={trainingBlockTimelineItems}
                  moonPoints={visibleMoonPoints}
                  kilterPoints={visibleKilterPoints}
                  boulderPoints={visibleBoulderPoints}
                />
              )}
              {displayedGradeTab === "lina" && (
                <RopeSessionGradeView points={visibleRopePoints} />
              )}
              {displayedGradeTab === "spraywall" && (
                <SpraywallSessionGradeView
                  boardAxisAnchors={boardAxisAnchors}
                  points={spraywallHoverPoints}
                />
              )}
              {displayedGradeTab === "baldy" && (
                <BoulderSessionGradeView
                  boardAxisAnchors={boardAxisAnchors}
                  points={visibleBoulderPoints}
                />
              )}
              {displayedGradeTab === "moon" && (
                <MoonSessionGradeView
                  boardAxisAnchors={boardAxisAnchors}
                  points={visibleMoonPoints}
                />
              )}
              {displayedGradeTab === "kilter" && (
                <KilterSessionGradeView
                  boardAxisAnchors={boardAxisAnchors}
                  points={visibleKilterPoints}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div
        className="sessionGradeLegend"
        style={sessionGradeLegendStyle}
        aria-label="Legenda wycen"
      >
        <span style={sessionGradeLegendItemStyle}>
          <i
            style={{
              ...stimulusLegendLineStyle,
              background: sessionGradeStimulusColor,
            }}
          />
          bodziec
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <RopeLegendMarker /> Lina
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <TriangleLegendMarker fill="#ee19b6" /> Moon
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <TriangleLegendMarker fill="#f5e643" /> Kilter
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <PlusLegendMarker stroke="#3b9edb" /> Baldy
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <TrainingBlockLegendMarker kind="hangboard" /> Chwytotablica
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <TrainingBlockLegendMarker kind="campus" /> Campus
        </span>
        {(Object.keys(spraywallIntensityConfig) as SpraywallIntensity[]).map(
          (intensity) => {
            const config = spraywallIntensityConfig[intensity];

            return (
              <span key={intensity} style={sessionGradeLegendItemStyle}>
                <SpraywallLegendMarker gradientId={config.gradientId} />
                {spraywallLegendLabels[intensity]}
              </span>
            );
          },
        )}
      </div>
    </>
  );
}

export function TrainingStimulusChart({
  trainings,
  chartRange,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
}) {
  const { facilities } = useClimberbook();
  const { theme } = useTheme();
  const [activeStimulusTab, setActiveStimulusTab] =
    useState<StimulusTab>("all");
  const [visibleExperimentalDimensions, setVisibleExperimentalDimensions] =
    useState<Record<FatigueDimension, boolean>>({
      aerobicEndurance: true,
      strengthEndurance: true,
      strengthPower: true,
      contactStrength: true,
    });
  const [isExperimentalStacked, setIsExperimentalStacked] = useState(true);
  const todayDate = new Date().toISOString().slice(0, 10);
  const chartEnd = [chartRange.end, addDays(todayDate, 1)].sort()[0];
  const series = getDailyStimulusSeries(
    trainings,
    chartRange.start,
    chartEnd,
    facilities,
  );
  const barSeries = series.map((point) => {
    const dimensionsTotal = stimulusDimensionKeys.reduce(
      (total, dimension) => total + (point[dimension] ?? 0),
      0,
    );
    const dimensionsScale =
      point.coin !== null && dimensionsTotal > 0
        ? point.coin / dimensionsTotal
        : 0;

    return {
      ...point,
      barTimestamp: getDayStartTimestamp(point.date) + 12 * 60 * 60 * 1000,
      barAerobicEndurance: (point.aerobicEndurance ?? 0) * dimensionsScale,
      barStrengthEndurance: (point.strengthEndurance ?? 0) * dimensionsScale,
      barStrengthPower: (point.strengthPower ?? 0) * dimensionsScale,
      barContactStrength: (point.contactStrength ?? 0) * dimensionsScale,
    };
  });
  const stimulusPoints = series.filter((point) => point.coin !== null);
  const isAllView = activeStimulusTab === "all";
  const isBarView = activeStimulusTab === "bar";
  const activeDimension =
    isAllView || isBarView ? undefined : activeStimulusTab;
  const activeDataKey = activeDimension ?? "coin";
  const activeWeightedDataKey = activeDimension
    ? weightedStimulusDataKeys[activeDimension]
    : "weightedCoin";
  const activeWeightedWindowDays = activeDimension
    ? weightedStimulusWindowDays[activeDimension]
    : 3;
  const activeColor = activeDimension
    ? stimulusDimensionConfig[activeDimension].color
    : totalStimulusColor;
  const activeLabel = activeDimension
    ? stimulusDimensionConfig[activeDimension].label
    : "suma";
  const visibleValues = isBarView
    ? barSeries.map((point) => point.coin ?? 0)
    : isAllView
      ? isExperimentalStacked
        ? series.map((point) =>
            stimulusDimensionKeys.reduce(
              (total, dimension) =>
                total +
                (visibleExperimentalDimensions[dimension]
                  ? (point[dimension] ?? 0)
                  : 0),
              0,
            ),
          )
        : series.flatMap((point) =>
            stimulusDimensionKeys
              .filter((dimension) => visibleExperimentalDimensions[dimension])
              .map((dimension) => point[dimension] ?? 0),
          )
      : series.flatMap((point) => [
          point[activeDataKey] ?? 0,
          point[activeWeightedDataKey],
        ]);
  const axisMax = Math.max(0.001, ...visibleValues);
  const hasStimulus = series.some((point) => point.coin !== null);
  const endTimestamp = getDayStartTimestamp(addDays(chartEnd, 1));
  const firstStimulusDate = series.find((point) => point.coin !== null)?.date;
  const xAxisStartDate =
    firstStimulusDate && firstStimulusDate > chartRange.start
      ? firstStimulusDate
      : chartRange.start;
  const startTimestamp = getDayStartTimestamp(xAxisStartDate);
  const todayTimestamp = Date.now();
  const todayDateTimestamp = toDate(todayDate).getTime();
  const showsTodayMarker =
    todayDateTimestamp >= startTimestamp && todayDateTimestamp <= endTimestamp;

  if (!hasStimulus) {
    return <EmptyState message="Brak danych o bodźcu w wybranym okresie." />;
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Widok i rodzaj bodźca"
        style={sessionGradeTabsStyle}
      >
        {stimulusTabs.map((tab) => {
          const isActive = activeStimulusTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStimulusTab(tab.key)}
              style={{
                ...sessionGradeTabStyle,
                ...(isActive ? sessionGradeTabActiveStyle : undefined),
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ ...weightChartCanvasStyle, height: 345 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={isBarView ? barSeries : undefined}
            barCategoryGap={4}
            barGap={0}
            margin={{ top: 12, right: 0, bottom: 4, left: -16 }}
          >
            <defs>
              <linearGradient
                id="weightedStimulusFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={weightedTotalStimulusColor}
                  stopOpacity={weightedStimulusFillTopOpacity}
                />
                <stop
                  offset="90%"
                  stopColor={weightedTotalStimulusColor}
                  stopOpacity={weightedStimulusFillBottomOpacity}
                />
              </linearGradient>
              {stimulusDimensionKeys.map((dimension) => {
                const config = stimulusDimensionConfig[dimension];

                return (
                  <linearGradient
                    key={dimension}
                    id={`bar-${dimension}-fill`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={config.color} />
                    <stop offset="100%" stopColor={config.color} />
                  </linearGradient>
                );
              })}
              {isBarView && <StimulusTextureDefs />}
            </defs>
            <CartesianGrid
              stroke="var(--component-chart-grid)"
              strokeDasharray="3 5"
            />
            <XAxis
              type="number"
              dataKey={isBarView ? "barTimestamp" : "trainingTimestamp"}
              domain={[startTimestamp, endTimestamp]}
              ticks={getDailyChartTicks(xAxisStartDate, chartEnd)}
              interval={0}
              tick={{ fontSize: 9.6, fill: "var(--component-chart-axis)" }}
              tickFormatter={(value) =>
                new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(value))
              }
            />
            {showsTodayMarker && (
              <ReferenceLine
                x={todayTimestamp}
                yAxisId={isBarView ? "bars" : undefined}
                stroke="var(--component-chart-marker-today)"
                strokeDasharray="5 5"
                label={{
                  value: "Dzisiaj",
                  position: "insideTopRight",
                  fill: "var(--component-chart-marker-today)",
                  fontSize: 9.6,
                }}
              />
            )}
            <YAxis
              type="number"
              width={44}
              domain={[0, axisMax * 1.12]}
              tickFormatter={(value) => Number(value).toFixed(2)}
              label={{
                value: "bodziec",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 9.6 },
              }}
              tick={{ fontSize: 9.6 }}
            />
            {isBarView && (
              <YAxis
                yAxisId="bars"
                type="number"
                hide
                domain={[0, axisMax * 1.12]}
              />
            )}
            <Tooltip
              shared={false}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  | DailyStimulusPoint
                  | undefined;
                if (!active || !point) return null;

                return (
                  <div style={sessionGradeTooltipStyle}>
                    <span>{point.date}</span>
                    <div style={sessionGradeTooltipGroupStyle}>
                      <span>Łącznie: {(point.coin ?? 0).toFixed(3)}</span>
                      <span>Czas: {point.durationMinutes ?? 0} min</span>
                      {stimulusDimensionKeys.map((dimension) => (
                        <span key={dimension}>
                          {stimulusDimensionConfig[dimension].label}:{" "}
                          {(point[dimension] ?? 0).toFixed(3)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            {isAllView && (
              <ExperimentalStimulusTab
                data={stimulusPoints}
                visibleDimensions={visibleExperimentalDimensions}
                isStacked={isExperimentalStacked}
              />
            )}
            {!isAllView && !isBarView && (
              <DimensionStimulusTab
                data={stimulusPoints}
                dataKey={activeDataKey}
                weightedDataKey={activeWeightedDataKey}
                weightedWindowDays={activeWeightedWindowDays}
                label={activeLabel}
                color={activeColor}
              />
            )}
            {isBarView && <StackedStimulusTab />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={sessionGradeLegendStyle} aria-label="Legenda bodźca">
        {isAllView && (
          <>
            <label style={sessionGradeLegendItemStyle}>
              <input
                type="checkbox"
                role="switch"
                checked={isExperimentalStacked}
                onChange={(event) =>
                  setIsExperimentalStacked(event.target.checked)
                }
                style={{ accentColor: "#238f8b" }}
              />
              Kumulacja
            </label>
            {stimulusLegendDimensionKeys.map((dimension) => {
              const config = stimulusDimensionConfig[dimension];

              return (
                <label key={dimension} style={sessionGradeLegendItemStyle}>
                  <input
                    type="checkbox"
                    checked={visibleExperimentalDimensions[dimension]}
                    onChange={(event) =>
                      setVisibleExperimentalDimensions((current) => ({
                        ...current,
                        [dimension]: event.target.checked,
                      }))
                    }
                    style={{ accentColor: config.color }}
                  />
                  <i
                    style={{
                      ...stimulusLegendLineStyle,
                      background: config.color,
                      border: `1px solid ${config.color}`,
                    }}
                  />
                  {config.label}
                </label>
              );
            })}
          </>
        )}
        {isBarView && (
          <>
            {stimulusLegendDimensionKeys.map((dimension) => {
              const config = stimulusDimensionConfig[dimension];

              return (
                <span key={dimension} style={sessionGradeLegendItemStyle}>
                  <StimulusBarLegendMarker
                    dimension={dimension}
                    isTextTheme={theme === "text"}
                  />
                  {config.label}
                </span>
              );
            })}
          </>
        )}
        {!isAllView && !isBarView && (
          <>
            <span style={sessionGradeLegendItemStyle}>
              <i
                style={{ ...stimulusLegendLineStyle, background: activeColor }}
              />
              {activeLabel}
            </span>
            <span style={sessionGradeLegendItemStyle}>
              <i
                style={{
                  ...stimulusLegendLineStyle,
                  background: withAlpha(activeColor, 0.72),
                }}
              />
              ważony ({activeWeightedWindowDays} dni)
            </span>
          </>
        )}
      </div>
    </>
  );
}

function DimensionStimulusTab({
  data,
  dataKey,
  weightedDataKey,
  weightedWindowDays,
  label,
  color,
}: {
  data: DailyStimulusPoint[];
  dataKey: string;
  weightedDataKey: string;
  weightedWindowDays: number;
  label: string;
  color: string;
}) {
  const weightedColor = withAlpha(color, 0.72);
  const weightedGradientId = `${weightedDataKey}-fill`;

  return (
    <>
      <defs>
        <linearGradient id={weightedGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={color}
            stopOpacity={weightedStimulusFillTopOpacity}
          />
          <stop
            offset="90%"
            stopColor={color}
            stopOpacity={weightedStimulusFillBottomOpacity}
          />
        </linearGradient>
      </defs>
      <Area
        key={`area-${weightedDataKey}`}
        data={data}
        type="monotone"
        dataKey={weightedDataKey as keyof DailyStimulusPoint}
        name={`${label}, ważony (${weightedWindowDays} dni)`}
        stroke="none"
        fill={`url(#${weightedGradientId})`}
        isAnimationActive={false}
        connectNulls
      />
      <Line
        key={`line-${dataKey}`}
        data={data}
        type="monotone"
        dataKey={dataKey as keyof DailyStimulusPoint}
        name={label}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        dot={{ r: 2.5, fill: color, stroke: "white", strokeWidth: 1 }}
        activeDot={{ r: 4, fill: color, stroke: "white", strokeWidth: 1.5 }}
        connectNulls
        animationDuration={400}
      />
      <Line
        key={`line-${weightedDataKey}`}
        data={data}
        type="monotone"
        dataKey={weightedDataKey as keyof DailyStimulusPoint}
        name={`${label}, ważony (${weightedWindowDays} dni)`}
        stroke={weightedColor}
        strokeWidth={1}
        strokeDasharray="6 4"
        strokeLinecap="round"
        dot={false}
        activeDot={{
          r: 4,
          fill: weightedColor,
          stroke: "white",
          strokeWidth: 1.5,
        }}
        isAnimationActive={false}
      />
    </>
  );
}

function ExperimentalStimulusTab({
  data,
  visibleDimensions,
  isStacked,
}: {
  data: DailyStimulusPoint[];
  visibleDimensions: Record<FatigueDimension, boolean>;
  isStacked: boolean;
}) {
  const visibleDimensionKeys = stimulusDimensionKeys.filter(
    (dimension) => visibleDimensions[dimension],
  );

  return (
    <>
      <defs>
        {visibleDimensionKeys.map((dimension) => {
          const config = stimulusDimensionConfig[dimension];

          return (
            <linearGradient
              key={dimension}
              id={`experimental-${dimension}-fill`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={config.color} />
              <stop offset="100%" stopColor={config.color} />
            </linearGradient>
          );
        })}
        <StimulusTextureDefs />
      </defs>
      {visibleDimensionKeys.map((dimension) => {
        const config = stimulusDimensionConfig[dimension];

        return (
          <Area
            key={`experimental-area-${dimension}`}
            data={data}
            type="monotone"
            dataKey={dimension}
            name={config.label}
            stackId={isStacked ? "experimental-stimulus" : undefined}
            stroke={config.color}
            strokeWidth={1.5}
            fillOpacity="var(--component-chart-stimulus-area-opacity)"
            fill={
              dimension === "aerobicEndurance" ||
              dimension === "strengthEndurance" ||
              dimension === "strengthPower" ||
              dimension === "contactStrength"
                ? `url(#experimental-${dimension}-texture)`
                : `url(#experimental-${dimension}-fill)`
            }
            isAnimationActive={false}
            connectNulls
          />
        );
      })}
    </>
  );
}

function StackedStimulusTab() {
  return (
    <>
      {stimulusDimensionKeys.map((dimension) => {
        const config = stimulusDimensionConfig[dimension];

        return (
          <Bar
            key={`bar-${dimension}`}
            dataKey={config.barDataKey}
            yAxisId="bars"
            name={config.label}
            stackId="stimulus"
            fill={
              dimension === "aerobicEndurance"
                ? `url(#bar-${dimension}-fill)`
                : `url(#experimental-${dimension}-texture)`
            }
            animationDuration={400}
          />
        );
      })}
    </>
  );
}

function StimulusTextureDefs() {
  return (
    <>
      <pattern
        id="experimental-aerobicEndurance-texture"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <rect
          width="6"
          height="6"
          fill="var(--component-chart-stimulus-aerobic)"
        />
        <circle cx="1.5" cy="1.5" r="0.45" fill="#000" opacity="0.2" />
        <circle cx="4.5" cy="4.5" r="0.45" fill="#000" opacity="0.2" />
      </pattern>
      <pattern
        id="experimental-strengthEndurance-texture"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <rect
          width="8"
          height="8"
          fill="var(--component-chart-stimulus-strength-endurance)"
        />
        <path
          d="M -4 8 L 4 0 M 0 12 L 12 0 M 4 12 L 12 4"
          stroke="var(--component-chart-stimulus-strength-endurance-texture)"
          strokeWidth="2"
        />
      </pattern>
      <pattern
        id="experimental-strengthPower-texture"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <rect
          width="8"
          height="8"
          fill="var(--component-chart-stimulus-strength-power)"
        />
        <circle
          cx="2"
          cy="2"
          r="1.6"
          fill="var(--component-chart-stimulus-strength-power-texture)"
        />
        <circle
          cx="6"
          cy="6"
          r="1.6"
          fill="var(--component-chart-stimulus-strength-power-texture)"
        />
      </pattern>
      <pattern
        id="experimental-contactStrength-texture"
        width="16"
        height="16"
        patternUnits="userSpaceOnUse"
      >
        <rect
          width="16"
          height="16"
          fill="var(--component-chart-stimulus-contact-strength)"
        />
        <circle
          cx="3"
          cy="4"
          r="0.8"
          fill="var(--component-chart-stimulus-contact-strength-texture)"
        />
        <rect
          x="11"
          y="10"
          width="1.2"
          height="1.2"
          fill="var(--component-chart-stimulus-contact-strength-texture)"
        />
      </pattern>
    </>
  );
}

function StimulusBarLegendMarker({
  dimension,
  isTextTheme,
}: {
  dimension: FatigueDimension;
  isTextTheme: boolean;
}) {
  const config = stimulusDimensionConfig[dimension];
  const markerWidth = isTextTheme ? 30 : 16;
  const markerHeight = isTextTheme ? 30 : 12;
  const viewBoxWidth = isTextTheme ? 32 : 16;
  const viewBoxHeight = isTextTheme ? 32 : 12;
  const textureId = `stimulus-legend-${dimension}-texture`;

  return (
    <svg
      width={markerWidth}
      height={markerHeight}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      aria-hidden="true"
      style={
        isTextTheme
          ? {
              border: "1px solid var(--theme-border-input)",
              boxSizing: "border-box",
            }
          : undefined
      }
    >
      {dimension !== "aerobicEndurance" && (
        <defs>
          {dimension === "strengthEndurance" && (
            <pattern
              id={textureId}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill={config.color} />
              <path
                d="M -4 8 L 4 0 M 0 12 L 12 0 M 4 12 L 12 4"
                stroke="var(--component-chart-stimulus-strength-endurance-texture)"
                strokeWidth="2"
              />
            </pattern>
          )}
          {dimension === "strengthPower" && (
            <pattern
              id={textureId}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill={config.color} />
              <circle
                cx="2"
                cy="2"
                r="1.6"
                fill="var(--component-chart-stimulus-strength-power-texture)"
              />
              <circle
                cx="6"
                cy="6"
                r="1.6"
                fill="var(--component-chart-stimulus-strength-power-texture)"
              />
            </pattern>
          )}
          {dimension === "contactStrength" && (
            <pattern
              id={textureId}
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <rect width="16" height="16" fill={config.color} />
              <circle
                cx="3"
                cy="4"
                r="0.8"
                fill="var(--component-chart-stimulus-contact-strength-texture)"
              />
              <rect
                x="11"
                y="10"
                width="1.2"
                height="1.2"
                fill="var(--component-chart-stimulus-contact-strength-texture)"
              />
            </pattern>
          )}
        </defs>
      )}
      <rect
        width={viewBoxWidth}
        height={viewBoxHeight}
        fill={
          dimension === "aerobicEndurance" ? config.color : `url(#${textureId})`
        }
      />
    </svg>
  );
}

function getSurfaceGradeValues(value?: string) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
}

type DailyStimulusPoint = {
  kind: "stimulus";
  date: string;
  trainingTimestamp: number;
  durationMinutes: number;
  coin: number | null;
  weightedCoin: number;
  weightedAerobicEndurance: number;
  weightedStrengthEndurance: number;
  weightedStrengthPower: number;
  weightedContactStrength: number;
} & Record<FatigueDimension, number | null>;

type TotalStimulusPoint = {
  kind: "total-stimulus";
  date: string;
  trainingTimestamp: number;
  coin: number;
};

type StimulusTab = (typeof stimulusTabs)[number]["key"];

const weightedStimulusDataKeys: Record<
  FatigueDimension,
  | "weightedAerobicEndurance"
  | "weightedStrengthEndurance"
  | "weightedStrengthPower"
  | "weightedContactStrength"
> = {
  aerobicEndurance: "weightedAerobicEndurance",
  strengthEndurance: "weightedStrengthEndurance",
  strengthPower: "weightedStrengthPower",
  contactStrength: "weightedContactStrength",
};

const weightedStimulusWindowDays: Record<FatigueDimension, number> = {
  aerobicEndurance: 4,
  strengthEndurance: 4,
  strengthPower: 4,
  contactStrength: 4,
};

function getDailyStimulusSeries(
  trainings: TrainingRecord[],
  start: string,
  end: string,
  facilities: FacilityRecord[],
): DailyStimulusPoint[] {
  const coinsByDate = new Map<string, number>();
  const dimensionsByDate = new Map<string, FatigueDimensions>();
  const durationByDate = new Map<string, number>();
  const latestTrainingTimestampByDate = new Map<string, number>();
  trainings.forEach((training) => {
    const impact = getTrainingStimulusImpact(training, facilities, trainings);
    coinsByDate.set(
      training.date,
      (coinsByDate.get(training.date) ?? 0) + impact.coin,
    );
    durationByDate.set(
      training.date,
      (durationByDate.get(training.date) ?? 0) +
        (training.durationMinutes ?? 0),
    );
    latestTrainingTimestampByDate.set(
      training.date,
      Math.max(
        latestTrainingTimestampByDate.get(training.date) ?? 0,
        getTrainingTimestamp(training),
      ),
    );
    const dimensions = dimensionsByDate.get(training.date) ?? {
      aerobicEndurance: 0,
      strengthEndurance: 0,
      strengthPower: 0,
      contactStrength: 0,
    };
    stimulusDimensionKeys.forEach((dimension) => {
      dimensions[dimension] += impact.dimensions[dimension];
    });
    dimensionsByDate.set(training.date, dimensions);
  });

  const series: DailyStimulusPoint[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const dimensions = dimensionsByDate.get(date);
    series.push({
      kind: "stimulus",
      date,
      trainingTimestamp:
        latestTrainingTimestampByDate.get(date) ?? getDayStartTimestamp(date),
      durationMinutes: durationByDate.get(date) ?? 0,
      coin: coinsByDate.get(date) ?? null,
      weightedCoin: 0,
      weightedAerobicEndurance: 0,
      weightedStrengthEndurance: 0,
      weightedStrengthPower: 0,
      weightedContactStrength: 0,
      aerobicEndurance: dimensions?.aerobicEndurance ?? null,
      strengthEndurance: dimensions?.strengthEndurance ?? null,
      strengthPower: dimensions?.strengthPower ?? null,
      contactStrength: dimensions?.contactStrength ?? null,
    });
  }

  return series.map((point, index) => ({
    ...point,
    weightedCoin:
      (point.coin ?? 0) * 0.5 +
      (series[index - 1]?.coin ?? 0) * 0.3 +
      (series[index - 2]?.coin ?? 0) * 0.2,
    weightedAerobicEndurance: getRecencyWeightedAverage(
      series,
      index,
      "aerobicEndurance",
      4,
    ),
    weightedStrengthEndurance: getRecencyWeightedAverage(
      series,
      index,
      "strengthEndurance",
      4,
    ),
    weightedStrengthPower: getRecencyWeightedAverage(
      series,
      index,
      "strengthPower",
      4,
    ),
    weightedContactStrength: getRecencyWeightedAverage(
      series,
      index,
      "contactStrength",
      4,
    ),
  }));
}

function getRecencyWeightedAverage(
  series: DailyStimulusPoint[],
  index: number,
  key: FatigueDimension,
  days: number,
) {
  const totalWeight = (days * (days + 1)) / 2;
  const initialValues = series
    .map((point) => point[key])
    .filter((value): value is number => value !== null)
    .slice(0, 7);
  const initialAverage = initialValues.length
    ? initialValues.reduce((total, value) => total + value, 0) /
      initialValues.length
    : 0;

  return (
    Array.from({ length: days }, (_value, offset) => {
      const weight = days - offset;
      const historicalPoint = series[index - offset];

      return (
        (historicalPoint ? (historicalPoint[key] ?? 0) : initialAverage) *
        weight
      );
    }).reduce((total, value) => total + value, 0) / totalWeight
  );
}

function getStimulusGapSegments(series: DailyStimulusPoint[]) {
  const sessionPoints = series.filter(
    (point): point is DailyStimulusPoint & { coin: number } =>
      point.coin !== null,
  );
  return sessionPoints.slice(1).flatMap((point, index) => {
    const previous = sessionPoints[index];
    return point.trainingTimestamp - previous.trainingTimestamp > 86_400_000
      ? [[previous, point]]
      : [];
  });
}

function getDailyChartTicks(start: string, end: string) {
  const ticks: number[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    ticks.push(getDayStartTimestamp(date));
  }
  return ticks;
}

const sessionGradeLegendStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "0.75rem",
  alignItems: "center",
  color: "var(--muted)",
  fontSize: "0.8rem",
};

type GradeChartTab = "all" | "lina" | "baldy" | "moon" | "kilter" | "spraywall";

const gradeChartTabs: Array<{ key: GradeChartTab; label: string }> = [
  { key: "all", label: "Zbiorczo" },
  { key: "lina", label: "Lina" },
  { key: "spraywall", label: "Spray" },
  { key: "baldy", label: "Baldy" },
  { key: "moon", label: "Moon" },
  { key: "kilter", label: "Kilter" },
];

const sessionGradeTabsStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 4,
};

const sessionGradeTabStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--component-chart-tab-inactive-border)",
  padding: "0.3rem 0.55rem",
  background: "var(--component-chart-tab-inactive-background)",
  color: "var(--component-chart-tab-inactive-text)",
  cursor: "pointer",
  fontSize: "0.8rem",
};

const sessionGradeTabActiveStyle = {
  borderColor: "var(--component-chart-tab-active-border)",
  background: "var(--component-chart-tab-active-background)",
  color: "var(--component-chart-tab-active-text)",
};

const sessionGradeTooltipStyle = {
  display: "grid",
  gap: "0.35rem",
  padding: "0.45rem 0.6rem",
  border: "var(--component-chart-tooltip-border)",
  borderRadius: 4,
  background: "var(--component-chart-tooltip-background)",
  color: "var(--component-chart-tooltip-text)",
  fontSize: "0.8rem",
};

const sessionGradeTooltipGroupStyle = {
  display: "grid",
  gap: "0.1rem",
  paddingTop: "0.3rem",
  borderTop: "1px solid var(--component-chart-tooltip-divider)",
};

const sessionSurfaceLabels = {
  lina: "Lina",
  moon: "Moon",
  kilter: "Kilter",
  baldy: "Baldy",
} as const;

const trainingSurfaceLabels: Record<
  TrainingRecord["surfaces"][number],
  string
> = {
  lina: "Lina",
  baldy: "Baldy",
  moon: "Moon",
  drazek: "Drążek",
  spraywall: "Spraywall",
  kilter: "Kilter",
  silownia: "Siłownia",
  chwytotablica: "Chwytotablica",
  campus: "Campus",
  bieznia: "Bieżnia",
  rower: "Rower",
  bieg: "Bieg",
  treking: "Trekking",
};

const spraywallIntensityConfig: Record<
  SpraywallIntensity,
  {
    label: string;
    minimumGrade: number;
    maximumGrade: number;
    gradientId: string;
    startColor: string;
    endColor: string;
  }
> = {
  soft: {
    label: "Regeneracja tlenowa",
    minimumGrade: 1,
    maximumGrade: 3,
    gradientId: "spraywall-soft-gradient",
    startColor: "var(--component-chart-spraywall-soft-start)",
    endColor: "var(--component-chart-spraywall-soft-end)",
  },
  medium: {
    label: "Obwody (V3-V6)",
    minimumGrade: 3,
    maximumGrade: 6,
    gradientId: "spraywall-medium-gradient",
    startColor: "var(--component-chart-spraywall-medium-start)",
    endColor: "var(--component-chart-spraywall-medium-end)",
  },
  hard: {
    label: "Projekty",
    minimumGrade: 4,
    maximumGrade: 7,
    gradientId: "spraywall-hard-gradient",
    startColor: "var(--component-chart-spraywall-hard-start)",
    endColor: "var(--component-chart-spraywall-hard-end)",
  },
};

const spraywallLegendLabels: Record<SpraywallIntensity, string> = {
  soft: "Regeneracja",
  medium: "Obwody",
  hard: "Projekty",
};

function formatTrainingTooltipContent(training: TrainingRecord) {
  return training.surfaces
    .map((surface) => {
      if (surface === "spraywall") {
        const intensity = training.protocol?.spraywallIntensity ?? "medium";
        return `${trainingSurfaceLabels[surface]}: ${spraywallIntensityConfig[intensity].label}`;
      }

      const grades = getSurfaceGradeValues(
        training.difficultyBySurface?.[surface],
      );
      const fallbackGrades =
        surface === "lina" && grades.length === 0
          ? getSurfaceGradeValues(training.difficultyNotes)
          : grades;
      const formattedGrades =
        surface === "lina" ||
        surface === "baldy" ||
        surface === "moon" ||
        surface === "kilter"
          ? formatTooltipGrades(surface, fallbackGrades)
          : "";

      return formattedGrades
        ? `${trainingSurfaceLabels[surface]}: ${formattedGrades}`
        : trainingSurfaceLabels[surface];
    })
    .join(" · ");
}

type SpraywallHoverPoint = {
  trainingTimestamp: number;
  plotX: number;
  date: string;
  time: string;
  durationMinutes: number;
  intensity: SpraywallIntensity;
  bottomOffset: number;
  gradeIndex: number;
  surface: "spraywall";
};

type TrainingBlockTimelinePoint = {
  kind: "hangboard" | "campus";
  trainingTimestamp: number;
  plotX: number;
  date: string;
  time: string;
  bottomOffset: number;
  gradeIndex: number;
};

function SpraywallDurationBar({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: SpraywallHoverPoint;
}) {
  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }
  const config = spraywallIntensityConfig[payload.intensity];
  const height = Math.max(8, (payload.durationMinutes / 120) * 100);
  const bottom = cy - payload.bottomOffset;
  const labelY = bottom - height / 2 + 3;

  return (
    <g>
      <rect
        x={cx - 12.5}
        y={bottom - height}
        width={25}
        height={height}
        fill={`url(#${config.gradientId})`}
      />
      <text
        x={cx + 2}
        y={labelY}
        fill="#ffffff"
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
        transform={`rotate(-90 ${cx + 2} ${labelY})`}
      >
        {payload.durationMinutes} min
      </text>
    </g>
  );
}

function TrainingTimelineBlock({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: TrainingBlockTimelinePoint;
}) {
  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }

  const x = cx - 12.5;
  const y = cy - payload.bottomOffset - 12;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={25}
        height={12}
        fill={
          payload.kind === "campus"
            ? "url(#session-grade-campus-dots-dense)"
            : "url(#session-grade-hangboard-stripes)"
        }
      />
      <line x1={x} y1={y} x2={x + 25} y2={y} stroke="#000000" />
    </g>
  );
}

type SessionGradePoint = {
  date: string;
  grade: string;
  surface: keyof typeof sessionSurfaceLabels;
};

type BoardAxisAnchor = {
  trainingTimestamp: number;
  plotX: number;
  gradeIndex: number;
};

type RopeGradePlotPoint = SessionGradePoint & {
  surface: "lina";
  trainingTimestamp: number;
  plotX: number;
  gradeIndex: number;
  completed: number;
  label: string;
  occurrenceCount: number;
};

type BoardGradePlotPoint = SessionGradePoint & {
  surface: "moon" | "kilter" | "baldy";
  trainingTimestamp: number;
  plotX: number;
  gradeIndex: number;
  colorGradeIndex: number;
  label: string;
  occurrenceCount: number;
};

function CombinedSessionGradeView({
  boardAxisAnchors,
  ropePoints,
  spraywallPoints,
  trainingBlockPoints,
  moonPoints,
  kilterPoints,
  boulderPoints,
}: {
  boardAxisAnchors: BoardAxisAnchor[];
  ropePoints: RopeGradePlotPoint[];
  spraywallPoints: SpraywallHoverPoint[];
  trainingBlockPoints: TrainingBlockTimelinePoint[];
  moonPoints: BoardGradePlotPoint[];
  kilterPoints: BoardGradePlotPoint[];
  boulderPoints: BoardGradePlotPoint[];
}) {
  return (
    <>
      <RopeSessionGradeView points={ropePoints} />
      <BoardAxisAnchorSeries points={boardAxisAnchors} />
      <TrainingBlockSessionGradeSeries points={trainingBlockPoints} />
      <SpraywallSessionGradeSeries points={spraywallPoints} />
      <MoonSessionGradeSeries points={moonPoints} />
      <KilterSessionGradeSeries points={kilterPoints} />
      <BoulderSessionGradeSeries points={boulderPoints} />
    </>
  );
}

function RopeSessionGradeView({ points }: { points: RopeGradePlotPoint[] }) {
  return (
    <Scatter data={points} name="Lina" yAxisId="rope" shape={RopeAttemptMarker}>
      {points.map((point, index) => (
        <Cell
          key={`${point.label}-${point.grade}-${index}`}
          fill={getRopeGradeColor(point.grade)}
        />
      ))}
    </Scatter>
  );
}

function SpraywallSessionGradeView({
  boardAxisAnchors,
  points,
}: {
  boardAxisAnchors: BoardAxisAnchor[];
  points: SpraywallHoverPoint[];
}) {
  const groundAlignedPoints = points.map((point) => ({
    ...point,
    bottomOffset: 0,
  }));

  return (
    <>
      <BoardAxisAnchorSeries points={boardAxisAnchors} />
      <SpraywallSessionGradeSeries points={groundAlignedPoints} />
    </>
  );
}

function BoulderSessionGradeView({
  boardAxisAnchors,
  points,
}: {
  boardAxisAnchors: BoardAxisAnchor[];
  points: BoardGradePlotPoint[];
}) {
  return (
    <>
      <BoardAxisAnchorSeries points={boardAxisAnchors} />
      <BoulderSessionGradeSeries points={points} />
    </>
  );
}

function MoonSessionGradeView({
  boardAxisAnchors,
  points,
}: {
  boardAxisAnchors: BoardAxisAnchor[];
  points: BoardGradePlotPoint[];
}) {
  return (
    <>
      <BoardAxisAnchorSeries points={boardAxisAnchors} />
      <MoonSessionGradeSeries points={points} />
    </>
  );
}

function KilterSessionGradeView({
  boardAxisAnchors,
  points,
}: {
  boardAxisAnchors: BoardAxisAnchor[];
  points: BoardGradePlotPoint[];
}) {
  return (
    <>
      <BoardAxisAnchorSeries points={boardAxisAnchors} />
      <KilterSessionGradeSeries points={points} />
    </>
  );
}

function BoardAxisAnchorSeries({ points }: { points: BoardAxisAnchor[] }) {
  return <Scatter data={points} yAxisId="board" shape={() => null} />;
}

function TrainingBlockSessionGradeSeries({
  points,
}: {
  points: TrainingBlockTimelinePoint[];
}) {
  return (
    <Scatter
      data={points}
      name="Chwytotablica i campus"
      yAxisId="board"
      shape={TrainingTimelineBlock}
    />
  );
}

function SpraywallSessionGradeSeries({
  points,
}: {
  points: SpraywallHoverPoint[];
}) {
  return (
    <Scatter
      data={points}
      name="Spraywall"
      yAxisId="board"
      shape={SpraywallDurationBar}
    />
  );
}

function MoonSessionGradeSeries({ points }: { points: BoardGradePlotPoint[] }) {
  return (
    <Scatter data={points} name="Moon" yAxisId="board" shape={TriangleMarker}>
      {points.map((point, index) => (
        <Cell
          key={`${point.label}-${point.grade}-${index}`}
          fill={getBoardGradeColor("moon", point.colorGradeIndex)}
        />
      ))}
    </Scatter>
  );
}

function KilterSessionGradeSeries({
  points,
}: {
  points: BoardGradePlotPoint[];
}) {
  return (
    <Scatter
      data={points}
      name="Kilter"
      yAxisId="board"
      shape={InvertedTriangleMarker}
    >
      {points.map((point, index) => (
        <Cell
          key={`${point.label}-${point.grade}-${index}`}
          fill={getBoardGradeColor("kilter", point.colorGradeIndex)}
        />
      ))}
    </Scatter>
  );
}

function BoulderSessionGradeSeries({
  points,
}: {
  points: BoardGradePlotPoint[];
}) {
  return (
    <Scatter data={points} name="Baldy" yAxisId="board" shape={PlusMarker}>
      {points.map((point, index) => (
        <Cell
          key={`${point.label}-${point.grade}-${index}`}
          fill={getBoardGradeColor("baldy", point.colorGradeIndex)}
        />
      ))}
    </Scatter>
  );
}

function addOccurrenceCounts<T extends { date: string; grade: string }>(
  points: T[],
) {
  const occurrences = points.reduce((counts, point) => {
    const key = `${point.date}-${point.grade}`;

    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return points.map((point) => ({
    ...point,
    occurrenceCount: occurrences.get(`${point.date}-${point.grade}`) ?? 1,
  }));
}

function groupSessionGradesByDate(points: SessionGradePoint[]) {
  const gradesByDate = new Map<
    string,
    Map<SessionGradePoint["surface"], string[]>
  >();

  for (const point of points) {
    const gradesBySurface = gradesByDate.get(point.date) ?? new Map();
    const grades = gradesBySurface.get(point.surface) ?? [];

    grades.push(point.grade);
    gradesBySurface.set(point.surface, grades);
    gradesByDate.set(point.date, gradesBySurface);
  }

  const surfaceOrder: SessionGradePoint["surface"][] = [
    "moon",
    "lina",
    "kilter",
    "baldy",
  ];

  return new Map(
    Array.from(gradesByDate, ([date, gradesBySurface]) => [
      date,
      surfaceOrder.flatMap((surface) => {
        const grades = gradesBySurface.get(surface);
        return grades ? [{ surface, grades }] : [];
      }),
    ]),
  );
}

function formatTooltipGrades(
  surface: SessionGradePoint["surface"],
  grades: string[],
) {
  const gradeCounts = grades.reduce((counts, grade) => {
    counts.set(grade, (counts.get(grade) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return Array.from(gradeCounts, ([grade, count]) =>
    count > 1
      ? `${surface === "baldy" ? `V${grade}` : grade} (${count} powt.)`
      : surface === "baldy"
        ? `V${grade}`
        : grade,
  ).join(", ");
}

const sessionGradeLegendItemStyle = {
  display: "inline-flex",
  gap: "0.3rem",
  alignItems: "center",
};

const stimulusLegendLineStyle = {
  display: "inline-block",
  width: 16,
  height: 3,
  background: "#0d6b7c",
};

function TriangleLegendMarker({ fill }: { fill: string }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <path d="M 6 1 L 11 10 L 1 10 Z" fill={fill} stroke="white" />
    </svg>
  );
}

function PlusLegendMarker({ stroke }: { stroke: string }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M 1 6 H 11 M 6 1 V 11"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={2.5}
      />
    </svg>
  );
}

function TrainingBlockLegendMarker({
  kind,
}: {
  kind: TrainingBlockTimelinePoint["kind"];
}) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <rect
        x="1"
        y="2"
        width="10"
        height="8"
        fill={
          kind === "campus"
            ? "url(#session-grade-campus-dots-dense)"
            : "url(#session-grade-hangboard-stripes)"
        }
      />
    </svg>
  );
}

function RopeLegendMarker() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="4" fill="var(--grade-rope-7c)" />
    </svg>
  );
}

function SpraywallLegendMarker({ gradientId }: { gradientId: string }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
      <rect width="12" height="12" fill={`url(#${gradientId})`} />
    </svg>
  );
}

const moonGradeColors = [
  "var(--grade-moon-v0)",
  "var(--grade-moon-v1)",
  "var(--grade-moon-v2)",
  "var(--grade-moon-v3)",
  "var(--grade-moon-v4)",
  "var(--grade-moon-v5)",
  "var(--grade-moon-v6)",
  "var(--grade-moon-v7)",
  "var(--grade-moon-v8)",
  "var(--grade-moon-v9)",
  "var(--grade-moon-v10)",
  "var(--grade-moon-v11)",
  "var(--grade-moon-v12)",
  "var(--grade-moon-v13)",
  "var(--grade-moon-v14)",
  "var(--grade-moon-v15)",
  "var(--grade-moon-v16)",
  "var(--grade-moon-v17)",
];
const kilterGradeColors = [
  "var(--grade-kilter-v0)",
  "var(--grade-kilter-v1)",
  "var(--grade-kilter-v2)",
  "var(--grade-kilter-v3)",
  "var(--grade-kilter-v4)",
  "var(--grade-kilter-v5)",
  "var(--grade-kilter-v6)",
  "var(--grade-kilter-v7)",
  "var(--grade-kilter-v8)",
  "var(--grade-kilter-v9)",
  "var(--grade-kilter-v10)",
  "var(--grade-kilter-v11)",
  "var(--grade-kilter-v12)",
  "var(--grade-kilter-v13)",
  "var(--grade-kilter-v14)",
  "var(--grade-kilter-v15)",
  "var(--grade-kilter-v16)",
  "var(--grade-kilter-v17)",
];
const boulderGradeColors = [
  "var(--grade-boulder-v1)",
  "var(--grade-boulder-v2)",
  "var(--grade-boulder-v3)",
  "var(--grade-boulder-v4)",
  "var(--grade-boulder-v5)",
  "var(--grade-boulder-v6)",
  "var(--grade-boulder-v7)",
  "var(--grade-boulder-v8)",
  "var(--grade-boulder-v9)",
];

type ChartMarkerProps = {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: { occurrenceCount?: number; completed?: number };
};

function getMarkerScale(occurrenceCount = 1) {
  return Math.sqrt(Math.min(occurrenceCount, 5));
}

function RopeAttemptMarker({
  cx = 0,
  cy = 0,
  fill = "#343a40",
  payload,
}: ChartMarkerProps) {
  const radius = 9 * getMarkerScale(payload?.occurrenceCount);
  const completed = Math.min(Math.max(payload?.completed ?? 1, 0), 1);

  if (completed === 1) {
    return <circle cx={cx} cy={cy} r={radius} fill={fill} />;
  }

  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * completed;
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const completionPath = `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${completed > 0.5 ? 1 : 0} 1 ${endX} ${endY} Z`;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={withAlpha(fill, 0.18)}
        stroke={fill}
        strokeWidth={1}
      />
      {completed > 0 && <path d={completionPath} fill={fill} />}
    </g>
  );
}

function TriangleMarker({
  cx = 0,
  cy = 0,
  fill = "#343a40",
  payload,
}: ChartMarkerProps) {
  const scale = getMarkerScale(payload?.occurrenceCount);

  return (
    <path
      d={`M ${cx} ${cy - 6 * scale} L ${cx + 6 * scale} ${cy + 5 * scale} L ${cx - 6 * scale} ${cy + 5 * scale} Z`}
      fill={fill}
      stroke="white"
      strokeWidth={1}
    />
  );
}

function InvertedTriangleMarker({
  cx = 0,
  cy = 0,
  fill = "#343a40",
  payload,
}: ChartMarkerProps) {
  const scale = getMarkerScale(payload?.occurrenceCount);

  return (
    <path
      d={`M ${cx} ${cy + 6 * scale} L ${cx + 6 * scale} ${cy - 5 * scale} L ${cx - 6 * scale} ${cy - 5 * scale} Z`}
      fill={fill}
      stroke="#888"
      strokeWidth={1}
    />
  );
}

function PlusMarker({
  cx = 0,
  cy = 0,
  fill = "#343a40",
  payload,
}: ChartMarkerProps) {
  const radius = 5 * getMarkerScale(payload?.occurrenceCount);

  return (
    <path
      d={`M ${cx - radius} ${cy} H ${cx + radius} M ${cx} ${cy - radius} V ${cy + radius}`}
      fill="none"
      stroke={fill}
      strokeLinecap="round"
      strokeWidth={3}
    />
  );
}

function getBoardGradeIndex(
  surface: "moon" | "kilter" | "baldy",
  grade: string,
) {
  if (surface === "baldy") {
    const boulderGrade = Number(grade);
    return Number.isInteger(boulderGrade) &&
      boulderGrade >= 1 &&
      boulderGrade <= 9
      ? boulderGrade
      : -1;
  }

  const match = /^V(\d+)$/.exec(grade);
  const boardGrade = match ? Number(match[1]) : -1;
  return boardGrade >= 0 && boardGrade <= 17
    ? Math.min(Math.max(boardGrade, 1), 9)
    : -1;
}

function getBoardColorGradeIndex(
  surface: "moon" | "kilter" | "baldy",
  grade: string,
) {
  if (surface === "baldy") {
    const boulderGrade = Number(grade) - 1;
    return Number.isInteger(boulderGrade) &&
      boulderGrade >= 0 &&
      boulderGrade <= 8
      ? boulderGrade
      : -1;
  }

  const match = /^V(\d+)$/.exec(grade);
  const boardGrade = match ? Number(match[1]) : -1;
  return boardGrade >= 0 && boardGrade <= 17 ? boardGrade : -1;
}

function getBoardGradeColor(
  surface: "moon" | "kilter" | "baldy",
  gradeIndex: number,
) {
  const colors =
    surface === "moon"
      ? moonGradeColors
      : surface === "kilter"
        ? kilterGradeColors
        : boulderGradeColors;
  return colors[Math.round(gradeIndex)] ?? "var(--theme-text-muted)";
}

function getPreviewPlotX(
  surface: "lina" | "moon" | "kilter" | "baldy" | "spraywall" | "chwytotablica",
) {
  switch (surface) {
    case "lina":
      return 1;
    case "moon":
      return 1.38;
    case "kilter":
      return 1.38;
    case "baldy":
      return 1.38;
    case "spraywall":
      return 1.56;
    case "chwytotablica":
      return 1.75;
    default:
      return 1;
  }
}
