"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  Bar,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { ROPE_GRADE_SCALE } from "@/components/climberbook/common/training";
import { toDate } from "@/components/training-calendar/training-calendar.helpers";

type WeeklyAscentChartWidgetProps = {
  chartRangeLabel: string;
  ascentTimelineStats: Array<{
    id: number | string;
    date: string;
    routeName: string;
    source: "panel" | "skala";
    notes: string;
    suggestedGrade: string;
    subjectiveGrade: string;
    suggestedGradeIndex: number;
    subjectiveGradeIndex: number;
    suggestedColor: string;
    subjectiveColor: string;
    attemptCount: number;
  }>;
};

type ChartEntry =
  WeeklyAscentChartWidgetProps["ascentTimelineStats"][number] & {
    chartKey: string;
    suggestedValue: number;
    subjectiveValue: number | null;
  };

type BrushRange = {
  key: string | null;
  startIndex: number;
  endIndex: number;
};

type ChartQuarter = {
  key: string;
  year: number;
  quarter: number;
};

export function WeeklyAscentChartWidget({
  chartRangeLabel,
  ascentTimelineStats,
}: WeeklyAscentChartWidgetProps) {
  const { isMobileChartLayout } = useViewport();
  const chartViewportRef = useRef<HTMLDivElement>(null);
  const [chartViewportWidth, setChartViewportWidth] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<
    WeeklyAscentChartWidgetProps["ascentTimelineStats"][number] | null
  >(null);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [isRockVisible, setIsRockVisible] = useState(true);
  const filteredAscentTimelineStats = useMemo(
    () =>
      ascentTimelineStats.filter(
        (entry) =>
          (entry.source === "panel" && isPanelVisible) ||
          (entry.source === "skala" && isRockVisible),
      ),
    [ascentTimelineStats, isPanelVisible, isRockVisible],
  );
  const hasEntries = filteredAscentTimelineStats.length > 0;
  const chartData = useMemo(
    () =>
      filteredAscentTimelineStats.map((entry) => ({
        ...entry,
        chartKey: `${entry.date}-${entry.id}`,
        suggestedValue:
          entry.suggestedGradeIndex >= 0 ? entry.suggestedGradeIndex + 1 : 0,
        subjectiveValue:
          entry.subjectiveGradeIndex >= 0
            ? entry.subjectiveGradeIndex + 1
            : null,
      })),
    [filteredAscentTimelineStats],
  );
  const quarters = Array.from(
    new Map(
      chartData.map((entry) => {
        const date = toDate(entry.date);
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const key = `${year}-Q${quarter}`;

        return [key, { key, year, quarter } satisfies ChartQuarter];
      }),
    ).values(),
  );
  const quartersKey = quarters.map((quarter) => quarter.key).join("|");
  const [activeQuarterIndex, setActiveQuarterIndex] = useState(
    Math.max(0, quarters.length - 1),
  );
  const activeQuarter = quarters[activeQuarterIndex] ?? null;
  const visibleChartData = useMemo(
    () =>
      isMobileChartLayout && activeQuarter
        ? chartData.filter((entry) => {
            const date = toDate(entry.date);

            return (
              date.getFullYear() === activeQuarter.year &&
              Math.floor(date.getMonth() / 3) + 1 === activeQuarter.quarter
            );
          })
        : chartData,
    [activeQuarter, chartData, isMobileChartLayout],
  );
  const maxVisibleEntries =
    chartViewportWidth > 0
      ? Math.max(1, Math.floor(chartViewportWidth / 10))
      : visibleChartData.length;
  const initialRangeStartIndex = Math.max(
    0,
    visibleChartData.length - maxVisibleEntries,
  );
  const brushKey = `${activeQuarter?.key ?? "all"}-${isPanelVisible}-${isRockVisible}-${visibleChartData.length}-${maxVisibleEntries}`;
  const brushRange = useRef<BrushRange>({
    key: null,
    startIndex: 0,
    endIndex: 0,
  });
  const [committedBrushRange, setCommittedBrushRange] = useState<BrushRange>(
    () => ({
      key: brushKey,
      startIndex: initialRangeStartIndex,
      endIndex: Math.max(0, visibleChartData.length - 1),
    }),
  );

  if (brushRange.current.key !== brushKey) {
    brushRange.current = {
      key: brushKey,
      startIndex: initialRangeStartIndex,
      endIndex: Math.max(0, visibleChartData.length - 1),
    };
  }
  const activeBrushRange =
    committedBrushRange.key === brushKey
      ? committedBrushRange
      : brushRange.current;
  const committedBrushKey = `${brushKey}-${activeBrushRange.startIndex}-${activeBrushRange.endIndex}`;
  const mainChartData = visibleChartData.slice(
    activeBrushRange.startIndex,
    activeBrushRange.endIndex + 1,
  );
  const gradeIndexes = mainChartData.flatMap((entry) =>
    [entry.suggestedGradeIndex, entry.subjectiveGradeIndex].filter(
      (value) => value >= 0,
    ),
  );
  const minimumGradeIndex = gradeIndexes.length
    ? Math.max(0, Math.min(...gradeIndexes) - 1)
    : 0;
  const maximumGradeIndex = gradeIndexes.length
    ? Math.min(ROPE_GRADE_SCALE.length - 1, Math.max(...gradeIndexes) + 1)
    : 8;
  const yearStartTicks = mainChartData.reduce<string[]>(
    (ticks, entry, index) => {
      const year = toDate(entry.date).getFullYear();
      const previousYear =
        index > 0 ? toDate(mainChartData[index - 1].date).getFullYear() : null;

      if (index === 0 || previousYear !== year) {
        ticks.push(entry.chartKey);
      }

      return ticks;
    },
    [],
  );
  const yearLabelByKey = new Map(
    mainChartData.map((entry) => [
      entry.chartKey,
      String(toDate(entry.date).getFullYear()),
    ]),
  );

  useEffect(() => {
    setActiveQuarterIndex(Math.max(0, quarters.length - 1));
  }, [quarters.length, quartersKey]);
  useLayoutEffect(() => {
    const chartViewport = chartViewportRef.current;

    if (!chartViewport) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setChartViewportWidth(Math.floor(entry.contentRect.width));
    });

    resizeObserver.observe(chartViewport);

    return () => resizeObserver.disconnect();
  }, [hasEntries]);
  useEffect(() => {
    if (
      selectedEntry &&
      ((selectedEntry.source === "panel" && !isPanelVisible) ||
        (selectedEntry.source === "skala" && !isRockVisible))
    ) {
      setSelectedEntry(null);
    }
  }, [isPanelVisible, isRockVisible, selectedEntry]);

  function beginBrushInteraction() {
    const commitBrushRange = () => {
      setCommittedBrushRange({ ...brushRange.current });
    };

    window.addEventListener("pointerup", commitBrushRange, { once: true });
    window.addEventListener("pointercancel", commitBrushRange, { once: true });
  }

  const selectedDateLabel = selectedEntry
    ? new Intl.DateTimeFormat("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(toDate(selectedEntry.date))
    : "";

  function renderTooltip(props: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: ChartEntry }>;
  }) {
    const entry = props.payload?.[0]?.payload;

    if (!props.active || !entry) {
      return null;
    }

    return (
      <div
        style={{
          display: "grid",
          gap: 6,
          minWidth: 220,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(28, 61, 89, 0.16)",
          background: "rgba(255, 250, 240, 0.96)",
          boxShadow: "0 14px 30px rgba(17, 24, 39, 0.12)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {entry.date} · {entry.routeName}
        </div>
        <div style={{ display: "grid", gap: 2 }}>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>WYCENA</span>
          <strong>{entry.suggestedGrade || "-"}</strong>
        </div>
        <div style={{ display: "grid", gap: 2 }}>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>
            WYCENA SUBIEKTYWNA
          </span>
          <strong>{entry.subjectiveGrade || "-"}</strong>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          Opis po kliknięciu
        </div>
      </div>
    );
  }

  return (
    <Panel style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Raporty</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={sectionTitleStyle}>Stan przejść w czasie</h2>
            <div
              role="group"
              aria-label="Filtr źródła przejść"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              <label
                style={{
                  display: "inline-flex",
                  gap: 5,
                  alignItems: "center",
                  color: "var(--muted)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPanelVisible}
                  onChange={(event) => setIsPanelVisible(event.target.checked)}
                  style={{ accentColor: "#168f91" }}
                />
                Panel
              </label>
              <label
                style={{
                  display: "inline-flex",
                  gap: 5,
                  alignItems: "center",
                  color: "var(--muted)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isRockVisible}
                  onChange={(event) => setIsRockVisible(event.target.checked)}
                  style={{ accentColor: "#e19a24" }}
                />
                Skała
              </label>
            </div>
          </div>
        </div>
        {isMobileChartLayout && activeQuarter ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setActiveQuarterIndex((current) => Math.max(0, current - 1))
              }
              disabled={activeQuarterIndex === 0}
              style={{
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.6)",
                color: "var(--text)",
                width: 32,
                height: 32,
                borderRadius: 999,
                cursor: activeQuarterIndex === 0 ? "default" : "pointer",
                opacity: activeQuarterIndex === 0 ? 0.45 : 1,
              }}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <span style={softTagStyle}>
              Q{activeQuarter.quarter} {activeQuarter.year}
            </span>
            <button
              type="button"
              onClick={() =>
                setActiveQuarterIndex((current) =>
                  Math.min(quarters.length - 1, current + 1),
                )
              }
              disabled={activeQuarterIndex === quarters.length - 1}
              style={{
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.6)",
                color: "var(--text)",
                width: 32,
                height: 32,
                borderRadius: 999,
                cursor:
                  activeQuarterIndex === quarters.length - 1
                    ? "default"
                    : "pointer",
                opacity: activeQuarterIndex === quarters.length - 1 ? 0.45 : 1,
              }}
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </div>
        ) : (
          <span style={softTagStyle}>{chartRangeLabel}</span>
        )}
      </div>
      {!hasEntries ? (
        <EmptyState message="Dodaj wpisy raportowe, aby zobaczyć przebieg wycen w czasie." />
      ) : (
        <>
          <div
            className="ascent-timeline-chart"
            ref={chartViewportRef}
            style={{ width: "100%", height: 360 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={mainChartData}
                margin={
                  isMobileChartLayout
                    ? { top: 12, right: 0, bottom: 0, left: -10 }
                    : { top: 16, right: 8, bottom: 32, left: -18 }
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(28, 61, 89, 0.12)"
                />
                <XAxis
                  dataKey="chartKey"
                  interval={0}
                  height={isMobileChartLayout ? 8 : 28}
                  ticks={isMobileChartLayout ? undefined : yearStartTicks}
                  tick={isMobileChartLayout ? false : undefined}
                  tickFormatter={(value) =>
                    yearLabelByKey.get(String(value)) ?? ""
                  }
                />
                <YAxis
                  type="number"
                  width={isMobileChartLayout ? 38 : undefined}
                  domain={[minimumGradeIndex + 1, maximumGradeIndex + 1]}
                  ticks={Array.from(
                    { length: maximumGradeIndex - minimumGradeIndex + 1 },
                    (_value, index) => minimumGradeIndex + index + 1,
                  )}
                  tick={
                    isMobileChartLayout ? { fontSize: "0.7rem" } : undefined
                  }
                  tickFormatter={(value) => ROPE_GRADE_SCALE[value - 1] ?? ""}
                />
                <Tooltip content={renderTooltip} />
                <Bar
                  dataKey="suggestedValue"
                  name="Sugerowana"
                  barSize={8}
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={false}
                >
                  {mainChartData.map((entry) => (
                    <Cell
                      key={entry.chartKey}
                      fill={entry.suggestedColor}
                      style={{ cursor: "crosshair" }}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
                </Bar>
                {mainChartData
                  .filter((entry) => entry.subjectiveValue !== null)
                  .map((entry) => (
                    <ReferenceDot
                      key={`${entry.chartKey}-subjective`}
                      x={entry.chartKey}
                      y={entry.subjectiveValue ?? undefined}
                      r={5}
                      fill={entry.subjectiveColor}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={1.5}
                      style={{ cursor: "crosshair" }}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{ width: "100%", height: 72, marginTop: 8 }}
            onPointerDownCapture={beginBrushInteraction}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleChartData}>
                <XAxis dataKey="chartKey" hide />
                <YAxis hide />
                <Bar
                  dataKey="suggestedValue"
                  fill="rgba(22, 143, 145, 0.34)"
                  isAnimationActive={false}
                />
                <Brush
                  key={committedBrushKey}
                  dataKey="chartKey"
                  height={52}
                  stroke="rgba(22, 143, 145, 0.72)"
                  fill="rgba(22, 143, 145, 0.08)"
                  travellerWidth={10}
                  startIndex={activeBrushRange.startIndex}
                  endIndex={activeBrushRange.endIndex}
                  onChange={(range) => {
                    brushRange.current.startIndex = range.startIndex;
                    brushRange.current.endIndex = range.endIndex;
                  }}
                  tickFormatter={(value) => String(value).slice(2, 10)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 10,
            }}
          >
            {selectedEntry ? (
              <>
                <div>
                  <div style={moduleEyebrowStyle}>Szczegóły wpisu</div>
                  <h2 style={{ ...sectionTitleStyle, marginTop: 4 }}>
                    {selectedEntry.routeName}
                  </h2>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    { label: "DATA", value: selectedDateLabel },
                    { label: "DROGA", value: selectedEntry.routeName },
                    {
                      label: "WYCENA",
                      value: selectedEntry.suggestedGrade || "-",
                    },
                    {
                      label: "WYCENA SUBIEKTYWNA",
                      value: selectedEntry.subjectiveGrade || "-",
                    },
                    {
                      label: "PRÓBA",
                      value: String(selectedEntry.attemptCount),
                    },
                    {
                      label: "ŹRÓDŁO",
                      value:
                        selectedEntry.source === "panel" ? "Panel" : "Skała",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "rgba(28, 61, 89, 0.05)",
                        border: "1px solid rgba(28, 61, 89, 0.08)",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginBottom: 6,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          color: "var(--text)",
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(28, 61, 89, 0.05)",
                    border: "1px solid rgba(28, 61, 89, 0.08)",
                    color: "var(--text)",
                    minHeight: 96,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginBottom: 6,
                    }}
                  >
                    OPIS
                  </div>
                  <div>
                    {selectedEntry.notes?.trim() ||
                      "Brak opisu dla tego wpisu."}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(28, 61, 89, 0.05)",
                  border: "1px solid rgba(28, 61, 89, 0.08)",
                  color: "var(--muted)",
                }}
              >
                Kliknij słupek albo punkt, aby zobaczyć opis wpisu.
              </div>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
