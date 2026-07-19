"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";
import { toDate } from "@/components/training-calendar/training-calendar.helpers";
import {
  getRollingChartTicks,
  getRopeGradeColor,
  getRopeGradeIndex,
  ROPE_GRADE_SCALE,
} from "@/components/climberbook/common/training";
import { EmptyState } from "@/components/climberbook/common/charts/ChartPrimitives";
import { weightChartCanvasStyle } from "@/components/climberbook/common/styles";
import type { SpraywallIntensity, TrainingRecord } from "@/lib/climbs-db";
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
  const [activeGradeTab, setActiveGradeTab] = useState<GradeChartTab>("all");
  const trainingsInRange = trainings
    .filter(
      (training) =>
        training.date >= chartRange.start && training.date <= chartRange.end,
    )
    .sort((left, right) =>
      `${left.date}-${left.time}-${left.createdAt}`.localeCompare(
        `${right.date}-${right.time}-${right.createdAt}`,
      ),
    );
  const isPreviewChart = previewMode && trainingsInRange.length === 1;
  const ropeTrainings = trainingsInRange
    .map((training) => ({
      ...training,
      grades: getSurfaceGradeValues(training.difficultyBySurface?.lina)
        .concat(
          training.difficultyBySurface?.lina ||
            !training.surfaces.includes("lina")
            ? []
            : getSurfaceGradeValues(training.difficultyNotes),
        )
        .map((grade) => ({
          grade,
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
          trainingTimestamp: toDate(training.date).getTime(),
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
  const points = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => ({
      trainingTimestamp: toDate(training.date).getTime(),
      plotX: grade.plotX,
      date: training.date,
      grade: grade.grade,
      gradeIndex: grade.gradeIndex,
      surface: "lina" as const,
      label: `${training.date} ${training.time}`,
    })),
  );
  const moonPoints = boardTrainings.filter((point) => point.surface === "moon");
  const kilterPoints = boardTrainings.filter(
    (point) => point.surface === "kilter",
  );
  const boulderPoints = boardTrainings.filter(
    (point) => point.surface === "baldy",
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
        intensity: SpraywallIntensity;
      } => ({
        trainingTimestamp: toDate(training.date).getTime(),
        plotX: getPreviewPlotX("spraywall"),
        date: training.date,
        time: training.time,
        intensity: training.protocol?.spraywallIntensity ?? "medium",
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
  const chartStartTimestamp = toDate(chartRange.start).getTime();
  const chartEndTimestamp = toDate(chartRange.end).getTime();
  const chartTicks = getRollingChartTicks(chartRange.start, chartRange.end);
  const spraywallMarkerHalfWidth =
    isPreviewChart ? 0.08 : ((chartEndTimestamp - chartStartTimestamp) * 2.5) / 480;
  const spraywallHoverPoints = spraywallSessions.map((session) => {
    const config = spraywallIntensityConfig[session.intensity];

    return {
      ...session,
      gradeIndex: (config.minimumGrade + config.maximumGrade) / 2,
      surface: "spraywall" as const,
    };
  });
  const boardAxisAnchors = [
    {
      trainingTimestamp: chartStartTimestamp,
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
  const xAxisDomain = isPreviewChart ? [0, 2] : [chartStartTimestamp, chartEndTimestamp];
  const xAxisTicks = isPreviewChart ? [1] : chartTicks;
  const selectedTrainingTimestamp =
    !isPreviewChart &&
    selectedDate &&
    selectedDate >= chartRange.start &&
    selectedDate <= chartRange.end
      ? toDate(selectedDate).getTime()
      : null;
  const previewDate = trainingsInRange[0]?.date ?? chartRange.start;
  const visiblePreviewRopeLines = isPreviewChart
    ? visibleRopePoints.map((point, index) => ({
        key: `${point.label}-${point.grade}-${index}`,
        color: getRopeGradeColor(point.grade),
        data: [
          { plotX: 0, gradeIndex: minimumGradeIndex, date: point.date, surface: point.surface, grade: point.grade },
          { plotX: 1, gradeIndex: point.gradeIndex, date: point.date, surface: point.surface, grade: point.grade },
          { plotX: 2, gradeIndex: minimumGradeIndex, date: point.date, surface: point.surface, grade: point.grade },
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
        <div style={{ ...weightChartCanvasStyle, height: 270 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 12, right: 0, bottom: 4, left: -12 }}>
              <defs>
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
              </defs>
              <CartesianGrid
                stroke="rgba(100, 87, 77, 0.14)"
                strokeDasharray="3 5"
              />
              <XAxis
                type="number"
                dataKey={xAxisDataKey}
                domain={xAxisDomain}
                ticks={xAxisTicks}
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
                {selectedTrainingTimestamp !== null && (
                  <ReferenceLine
                    x={selectedTrainingTimestamp}
                    stroke="#176f86"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )}
              {showsRope && (
                <YAxis
                  yAxisId="rope"
                  type="number"
                  dataKey="gradeIndex"
                  width={48}
                  domain={[minimumGradeIndex, maximumGradeIndex]}
                  ticks={Array.from(
                    { length: maximumGradeIndex - minimumGradeIndex + 1 },
                    (_value, index) => minimumGradeIndex + index,
                  )}
                  tickFormatter={(value) => ROPE_GRADE_SCALE[value] ?? ""}
                  label={{
                    value: "Wycena",
                    angle: -90,
                    position: "insideLeft",
                  }}
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
                  orientation="right"
                  type="number"
                  dataKey="gradeIndex"
                  width={32}
                  domain={[1, 9]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  interval={0}
                  tickFormatter={(value) => `V${value}`}
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
                    | SpraywallHoverPoint;

                  if (point.surface === "spraywall") {
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
              {showsRope && (
                <Scatter data={visibleRopePoints} name="Lina" yAxisId="rope">
                  {visibleRopePoints.map((point, index) => (
                    <Cell
                      key={`${point.label}-${point.grade}-${index}`}
                      fill={getRopeGradeColor(point.grade)}
                    />
                  ))}
                </Scatter>
              )}
              {showsBoards && (
                <Scatter
                  data={boardAxisAnchors}
                  yAxisId="board"
                  shape={() => null}
                />
              )}
              {showsSpraywall &&
                spraywallSessions.map(({ intensity, trainingTimestamp }) => {
                  const config = spraywallIntensityConfig[intensity];

                  return (
                    <ReferenceArea
                      key={`spraywall-${trainingTimestamp}-${intensity}`}
                      yAxisId="board"
                      x1={
                        isPreviewChart
                          ? getPreviewPlotX("spraywall") - spraywallMarkerHalfWidth
                          : trainingTimestamp - spraywallMarkerHalfWidth
                      }
                      x2={
                        isPreviewChart
                          ? getPreviewPlotX("spraywall") + spraywallMarkerHalfWidth
                          : trainingTimestamp + spraywallMarkerHalfWidth
                      }
                      y1={config.minimumGrade}
                      y2={config.maximumGrade}
                      fill={`url(#${config.gradientId})`}
                      fillOpacity={1}
                      stroke="none"
                    />
                  );
                })}
              {showsSpraywall && (
                <Scatter
                  data={spraywallHoverPoints}
                  name="Spraywall"
                  yAxisId="board"
                  shape={SpraywallHoverTarget}
                />
              )}
              {showsBoards && (
                <Scatter
                  data={visibleMoonPoints}
                  name="Moon"
                  yAxisId="board"
                  shape={TriangleMarker}
                >
                  {visibleMoonPoints.map((point, index) => (
                    <Cell
                      key={`${point.label}-${point.grade}-${index}`}
                      fill={getBoardGradeColor("moon", point.colorGradeIndex)}
                    />
                  ))}
                </Scatter>
              )}
              {showsBoards && (
                <Scatter
                  data={visibleKilterPoints}
                  name="Kilter"
                  yAxisId="board"
                  shape={TriangleMarker}
                >
                  {visibleKilterPoints.map((point, index) => (
                    <Cell
                      key={`${point.label}-${point.grade}-${index}`}
                      fill={getBoardGradeColor("kilter", point.colorGradeIndex)}
                    />
                  ))}
                </Scatter>
              )}
              {showsBoards && (
                <Scatter
                  data={visibleBoulderPoints}
                  name="Baldy"
                  yAxisId="board"
                  shape={PlusMarker}
                >
                  {visibleBoulderPoints.map((point, index) => (
                    <Cell
                      key={`${point.label}-${point.grade}-${index}`}
                      fill={getBoardGradeColor("baldy", point.colorGradeIndex)}
                    />
                  ))}
                </Scatter>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={sessionGradeLegendStyle} aria-label="Legenda wycen">
        <span>Lina: kropka</span>
        <span style={sessionGradeLegendItemStyle}>
          <TriangleLegendMarker fill="#ee19b6" /> Moon
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <TriangleLegendMarker fill="#f5e643" /> Kilter
        </span>
        <span style={sessionGradeLegendItemStyle}>
          <PlusLegendMarker stroke="#3b9edb" /> Baldy
        </span>
        {(Object.keys(spraywallIntensityConfig) as SpraywallIntensity[]).map(
          (intensity) => {
            const config = spraywallIntensityConfig[intensity];

            return (
              <span key={intensity} style={sessionGradeLegendItemStyle}>
                <SpraywallLegendMarker gradientId={config.gradientId} />
                Spraywall: {config.label}
              </span>
            );
          },
        )}
      </div>
    </>
  );
}

function getSurfaceGradeValues(value?: string) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
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
  { key: "spraywall", label: "Spraywall" },
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
  borderColor: "var(--border-strong)",
  padding: "0.3rem 0.55rem",
  background: "rgba(255, 255, 255, 0.5)",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: "0.8rem",
};

const sessionGradeTabActiveStyle = {
  borderColor: "#0d6b7c",
  background: "#0d6b7c",
  color: "white",
};

const sessionGradeTooltipStyle = {
  display: "grid",
  gap: "0.35rem",
  padding: "0.45rem 0.6rem",
  border: "1px solid rgba(209, 109, 63, 0.3)",
  borderRadius: 4,
  background: "rgba(255, 250, 243, 0.96)",
  color: "var(--text)",
  fontSize: "0.8rem",
};

const sessionGradeTooltipGroupStyle = {
  display: "grid",
  gap: "0.1rem",
  paddingTop: "0.3rem",
  borderTop: "1px solid rgba(100, 87, 77, 0.14)",
};

const sessionSurfaceLabels = {
  lina: "Lina",
  moon: "Moon",
  kilter: "Kilter",
  baldy: "Baldy",
} as const;

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
    label: "Soft (V1-V3)",
    minimumGrade: 1,
    maximumGrade: 3,
    gradientId: "spraywall-soft-gradient",
    startColor: "#d9dde3",
    endColor: "#8e9aaa",
  },
  medium: {
    label: "Medium (V3-V6)",
    minimumGrade: 3,
    maximumGrade: 6,
    gradientId: "spraywall-medium-gradient",
    startColor: "#ffb01f",
    endColor: "#d52d27",
  },
  hard: {
    label: "Hard (V4-V7)",
    minimumGrade: 4,
    maximumGrade: 7,
    gradientId: "spraywall-hard-gradient",
    startColor: "#e73830",
    endColor: "#171313",
  },
};

type SpraywallHoverPoint = {
  trainingTimestamp: number;
  plotX: number;
  date: string;
  time: string;
  intensity: SpraywallIntensity;
  gradeIndex: number;
  surface: "spraywall";
};

function SpraywallHoverTarget({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx === undefined || cy === undefined) {
    return null;
  }

  return (
    <rect
      x={cx - 9}
      y={cy - 50}
      width={18}
      height={100}
      fill="rgba(0, 0, 0, 0.001)"
    />
  );
}

type SessionGradePoint = {
  date: string;
  grade: string;
  surface: keyof typeof sessionSurfaceLabels;
};

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

function SpraywallLegendMarker({ gradientId }: { gradientId: string }) {
  return (
    <svg aria-hidden="true" width="12" height="16" viewBox="0 0 12 16">
      <path
        d="M 6 1 V 15"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={5}
      />
    </svg>
  );
}

const moonGradeColors = [
  "#b9c2cc",
  "#b4b5c5",
  "#bea3c8",
  "#c98fca",
  "#d27bcb",
  "#d967ca",
  "#e053c7",
  "#e63fc3",
  "#eb2abd",
  "#ee19b6",
  "#d75ca2",
  "#b76589",
  "#935d76",
  "#735264",
  "#5c4757",
  "#4b404a",
  "#403b42",
  "#343a40",
];
const kilterGradeColors = [
  "#b9c2cc",
  "#c3c8bd",
  "#ccd0ad",
  "#d5d89d",
  "#dde08d",
  "#e5e77d",
  "#ebed6d",
  "#f0ef5d",
  "#f3ec4f",
  "#f5e643",
  "#f6df37",
  "#f7d72c",
  "#f8ce22",
  "#f9c518",
  "#fac00f",
  "#fbc00b",
  "#fbc609",
  "#fccc08",
];
const boulderGradeColors = [
  "#b9c2cc",
  "#7ccb9b",
  "#48b8a0",
  "#3b9edb",
  "#f2c14e",
  "#f39a3d",
  "#e76f51",
  "#c54560",
  "#343a40",
];

type ChartMarkerProps = {
  cx?: number;
  cy?: number;
  fill?: string;
};

function TriangleMarker({
  cx = 0,
  cy = 0,
  fill = "#343a40",
}: ChartMarkerProps) {
  return (
    <path
      d={`M ${cx} ${cy - 6} L ${cx + 6} ${cy + 5} L ${cx - 6} ${cy + 5} Z`}
      fill={fill}
      stroke="white"
      strokeWidth={1}
    />
  );
}

function PlusMarker({ cx = 0, cy = 0, fill = "#343a40" }: ChartMarkerProps) {
  return (
    <path
      d={`M ${cx - 5} ${cy} H ${cx + 5} M ${cx} ${cy - 5} V ${cy + 5}`}
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
  return colors[Math.round(gradeIndex)] ?? "#343a40";
}

function getPreviewPlotX(
  surface: "lina" | "moon" | "kilter" | "baldy" | "spraywall",
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
    default:
      return 1;
  }
}
