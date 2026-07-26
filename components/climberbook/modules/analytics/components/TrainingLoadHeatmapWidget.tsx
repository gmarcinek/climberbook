"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import {
  AnalyticsChartPanel,
  formatAnalyticsDate,
} from "@/components/climberbook/common/charts/AnalyticsChartPrimitives";
import { addDays } from "@/components/training-calendar/training-calendar.helpers";
import { TrainingHeatmapGrid } from "./TrainingHeatmapGrid";
import { getTrainingLoad } from "./TrainingLoadModel";
import type { TrainingRecord } from "@/lib/climbs-db";

const dailyRecoveryMultiplier = 0.72;
const baseLoadColor = "rgba(100, 87, 77, 0.12)";
const yellowLoadColor = "#f2cc4d";
const redLoadColor = "#c83d29";
const blackLoadColor = "#000000";

function formatLoadCalendarData(
  trainings: TrainingRecord[],
  chartRange: { start: string; end: string },
) {
  const loadByDate = new Map<string, number>();

  trainings.forEach((training) => {
    loadByDate.set(
      training.date,
      (loadByDate.get(training.date) ?? 0) + getTrainingLoad(training),
    );
  });

  const getMondayIndex = (date: string) =>
    (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  const year = Number(chartRange.end.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const startDate = addDays(yearStart, -getMondayIndex(yearStart));
  const endDateWithOffset = addDays(yearEnd, 6 - getMondayIndex(yearEnd));
  const data: Array<{ date: string; isOutsideRange: boolean; load: number }> = [];
  const earliestTrainingDate = trainings.reduce<string | null>(
    (earliest, training) =>
      !earliest || training.date < earliest ? training.date : earliest,
    null,
  );
  let carriedLoad = 0;

  for (
    let date = earliestTrainingDate && earliestTrainingDate < startDate
      ? earliestTrainingDate
      : startDate;
    date <= endDateWithOffset;
    date = addDays(date, 1)
  ) {
    carriedLoad = carriedLoad * dailyRecoveryMultiplier + (loadByDate.get(date) ?? 0);

    if (date >= startDate) {
      data.push({
        date,
        isOutsideRange: date < chartRange.start || date > chartRange.end,
        load: Math.round(carriedLoad * 10) / 10,
      });
    }
  }

  return { data, year };
}

function mixLoadColors(start: string, end: string, progress: number) {
  const startWeight = Math.round((1 - progress) * 100);
  const endWeight = 100 - startWeight;

  return `color-mix(in srgb, ${start} ${startWeight}%, ${end} ${endWeight}%)`;
}

function getLoadColor(load: number, _isOutsideRange: boolean) {
  if (load <= 0) return baseLoadColor;
  if (load < 50) return mixLoadColors(baseLoadColor, yellowLoadColor, load / 50);
  if (load < 100) return mixLoadColors(yellowLoadColor, redLoadColor, (load - 50) / 50);
  if (load < 200) return mixLoadColors(redLoadColor, blackLoadColor, (load - 100) / 100);

  return blackLoadColor;
}

export function TrainingLoadHeatmapWidget({
  trainings,
  chartRange,
  embedded = false,
  contentOnly = false,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  embedded?: boolean;
  contentOnly?: boolean;
}) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data, year } = formatLoadCalendarData(trainings, chartRange);
  const content = trainings.length === 0 ? (
    <EmptyState message="Dodaj treningi, aby zobaczyć obciążenie." />
  ) : (
    <TrainingHeatmapGrid weeksCount={data.length / 7}>
      {data.map(({ date, isOutsideRange, load }) => (
        <span
          key={date}
          aria-current={date === today ? "date" : undefined}
          aria-label={`${formatAnalyticsDate(date)}: obciążenie ${load}%`}
          title={`${formatAnalyticsDate(date)}: obciążenie ${load}%`}
          style={{
            background: getLoadColor(load, isOutsideRange),
            border: date === today ? "1px solid #c83d29" : "1px solid transparent",
            opacity: isOutsideRange ? 0.5 : 1,
          }}
        />
      ))}
    </TrainingHeatmapGrid>
  );

  if (contentOnly) return content;

  return (
    <AnalyticsChartPanel
      eyebrow="Heatmap"
      title={`Obciążenie treningowe ${year}`}
      badge={`${chartRange.start} - ${chartRange.end}`}
      height="auto"
      embedded={embedded}
    >
      {content}
    </AnalyticsChartPanel>
  );
}