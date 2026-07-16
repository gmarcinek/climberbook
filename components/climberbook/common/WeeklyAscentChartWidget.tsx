"use client";

import { useEffect, useState } from "react";

import {
  Bar,
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
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
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

export function WeeklyAscentChartWidget({
  chartRangeLabel,
  ascentTimelineStats,
}: WeeklyAscentChartWidgetProps) {
  const { isMobileChartLayout } = useViewport();
  const [selectedEntry, setSelectedEntry] = useState<
    WeeklyAscentChartWidgetProps["ascentTimelineStats"][number] | null
  >(null);
  const hasEntries = ascentTimelineStats.length > 0;
  const gradeIndexes = ascentTimelineStats.flatMap((entry) =>
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
  const chartData = ascentTimelineStats.map((entry) => ({
    ...entry,
    chartKey: `${entry.date}-${entry.id}`,
    suggestedValue:
      entry.suggestedGradeIndex >= 0 ? entry.suggestedGradeIndex + 1 : 0,
    subjectiveValue:
      entry.subjectiveGradeIndex >= 0 ? entry.subjectiveGradeIndex + 1 : null,
  }));
  const years = Array.from(
    new Set(chartData.map((entry) => String(toDate(entry.date).getFullYear()))),
  );
  const [activeYearIndex, setActiveYearIndex] = useState(
    Math.max(0, years.length - 1),
  );
  const activeYear = years[activeYearIndex] ?? null;
  const visibleChartData =
    isMobileChartLayout && activeYear
      ? chartData.filter(
          (entry) => String(toDate(entry.date).getFullYear()) === activeYear,
        )
      : chartData;
  const chartWidth = isMobileChartLayout
    ? Math.max(320, visibleChartData.length * 44)
    : Math.max(960, chartData.length * 42);
  const yearStartTicks = visibleChartData.reduce<string[]>(
    (ticks, entry, index) => {
      const year = toDate(entry.date).getFullYear();
      const previousYear =
        index > 0
          ? toDate(visibleChartData[index - 1].date).getFullYear()
          : null;

      if (index === 0 || previousYear !== year) {
        ticks.push(entry.chartKey);
      }

      return ticks;
    },
    [],
  );
  const yearLabelByKey = new Map(
    visibleChartData.map((entry) => [
      entry.chartKey,
      String(toDate(entry.date).getFullYear()),
    ]),
  );

  useEffect(() => {
    setActiveYearIndex(Math.max(0, years.length - 1));
  }, [years.length]);
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
          <h2 style={sectionTitleStyle}>Stan przejść w czasie</h2>
        </div>
        {isMobileChartLayout && activeYear ? (
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
                setActiveYearIndex((current) => Math.max(0, current - 1))
              }
              disabled={activeYearIndex === 0}
              style={{
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.6)",
                color: "var(--text)",
                width: 32,
                height: 32,
                borderRadius: 999,
                cursor: activeYearIndex === 0 ? "default" : "pointer",
                opacity: activeYearIndex === 0 ? 0.45 : 1,
              }}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <span style={softTagStyle}>{activeYear}</span>
            <button
              type="button"
              onClick={() =>
                setActiveYearIndex((current) =>
                  Math.min(years.length - 1, current + 1),
                )
              }
              disabled={activeYearIndex === years.length - 1}
              style={{
                border: "1px solid var(--border-strong)",
                background: "rgba(255,255,255,0.6)",
                color: "var(--text)",
                width: 32,
                height: 32,
                borderRadius: 999,
                cursor:
                  activeYearIndex === years.length - 1 ? "default" : "pointer",
                opacity: activeYearIndex === years.length - 1 ? 0.45 : 1,
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
          <ScrollPane
            style={{ width: "100%", minWidth: 0, overflow: "hidden" }}
            viewportStyle={{
              width: "100%",
              minWidth: 0,
              overflowX: "auto",
              overflowY: "hidden",
            }}
            contentStyle={{ width: chartWidth, height: 360 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={visibleChartData}
                margin={{ top: 16, right: 8, bottom: 56, left: -18 }}
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
                  domain={[minimumGradeIndex + 1, maximumGradeIndex + 1]}
                  ticks={Array.from(
                    { length: maximumGradeIndex - minimumGradeIndex + 1 },
                    (_value, index) => minimumGradeIndex + index + 1,
                  )}
                  tickFormatter={(value) => ROPE_GRADE_SCALE[value - 1] ?? ""}
                />
                <Tooltip content={renderTooltip} />
                <Bar
                  dataKey="suggestedValue"
                  name="Sugerowana"
                  radius={[8, 8, 0, 0]}
                >
                  {visibleChartData.map((entry) => (
                    <Cell
                      key={entry.chartKey}
                      fill={entry.suggestedColor}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
                </Bar>
                {visibleChartData
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
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedEntry(entry)}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </ScrollPane>
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
