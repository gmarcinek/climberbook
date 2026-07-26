"use client";

import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/climberbook/common/charts";
import {
  AnalyticsChartPanel,
  analyticsChartAxisTickStyle,
  analyticsChartGridStyle,
} from "@/components/climberbook/common/charts/AnalyticsChartPrimitives";
import {
  getRopeGradeColor,
  getRopeGradeIndex,
  ROPE_GRADE_SCALE,
} from "@/components/climberbook/common/training";
import type { TrainingRecord } from "@/lib/climbs-db";

function formatRopeDifficultyVolumeData(trainings: TrainingRecord[]) {
  return trainings.flatMap((training) => {
    const rawGrades = training.difficultyBySurface?.lina ??
      (training.surfaces.includes("lina") ? training.difficultyNotes : "");
    const gradeIndexes = rawGrades
      .split(",")
      .map((grade) => ({ grade: grade.trim(), index: getRopeGradeIndex(grade.trim()) }))
      .filter((grade) => grade.index >= 0);

    if (gradeIndexes.length === 0) {
      return [];
    }

    const highestGrade = gradeIndexes.reduce((highest, grade) =>
      grade.index > highest.index ? grade : highest,
    );

    return [{
      date: training.date,
      durationMinutes: training.durationMinutes,
      grade: highestGrade.grade,
      gradeIndex: highestGrade.index,
      color: getRopeGradeColor(highestGrade.grade),
    }];
  });
}

export function RopeDifficultyVolumeChartWidget({
  trainings,
  chartRangeLabel,
}: {
  trainings: TrainingRecord[];
  chartRangeLabel: string;
}) {
  const data = formatRopeDifficultyVolumeData(trainings);
  const gradeIndexes = data.map((entry) => entry.gradeIndex);
  const minimumGradeIndex = gradeIndexes.length
    ? Math.max(0, Math.min(...gradeIndexes) - 1)
    : 0;
  const maximumGradeIndex = gradeIndexes.length
    ? Math.min(ROPE_GRADE_SCALE.length - 1, Math.max(...gradeIndexes) + 1)
    : 1;

  return (
    <AnalyticsChartPanel
      eyebrow="Lina"
      title="Trudność a czas sesji"
      badge={chartRangeLabel}
    >
      {data.length === 0 ? (
        <EmptyState message="Dodaj wyceny z treningów na linie, aby porównać trudność z czasem sesji." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid {...analyticsChartGridStyle} />
            <XAxis
              type="number"
              dataKey="durationMinutes"
              name="Czas"
              unit=" min"
              tick={analyticsChartAxisTickStyle}
            />
            <YAxis
              type="number"
              dataKey="gradeIndex"
              name="Wycena"
              width={40}
              domain={[minimumGradeIndex, maximumGradeIndex]}
              ticks={Array.from(
                { length: maximumGradeIndex - minimumGradeIndex + 1 },
                (_value, index) => minimumGradeIndex + index,
              )}
              tick={analyticsChartAxisTickStyle}
              tickFormatter={(value) => ROPE_GRADE_SCALE[value] ?? ""}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 5" }}
              formatter={(value, name) => [
                name === "Czas" ? `${value} min` : value,
                name,
              ]}
              labelFormatter={(_label, payload) => payload[0]?.payload.date ?? ""}
            />
            <Scatter data={data} name="Sesja">
              {data.map((entry, index) => (
                <Cell key={`${entry.date}-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartPanel>
  );
}