"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import {
  AnalyticsChartPanel,
  formatAnalyticsDate,
} from "@/components/climberbook/common/charts/AnalyticsChartPrimitives";
import { addDays } from "@/components/training-calendar/training-calendar.helpers";
import { TrainingHeatmapGrid } from "./TrainingHeatmapGrid";
import type { TrainingRecord } from "@/lib/climbs-db";

function formatActivityData(
  trainings: TrainingRecord[],
  chartRange: { start: string; end: string },
) {
  const sessionsByDate = new Map<string, number>();

  trainings.forEach((training) => {
    sessionsByDate.set(
      training.date,
      (sessionsByDate.get(training.date) ?? 0) + 1,
    );
  });

  const getMondayIndex = (date: string) =>
    (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  const year = Number(chartRange.end.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const startDate = addDays(yearStart, -getMondayIndex(yearStart));
  const endDateWithOffset = addDays(yearEnd, 6 - getMondayIndex(yearEnd));
  const data: Array<{ date: string; isOutsideRange: boolean; sessions: number }> = [];

  for (
    let date = startDate;
    date <= endDateWithOffset;
    date = addDays(date, 1)
  ) {
    const sessions = sessionsByDate.get(date) ?? 0;

    data.push({
      date,
      isOutsideRange: date < chartRange.start || date > chartRange.end,
      sessions,
    });
  }

  return { data, year };
}

export function TrainingRegularityChartWidget({
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
  const { data, year } = formatActivityData(trainings, chartRange);
  const content = trainings.length === 0 ? (
    <EmptyState message="Dodaj treningi, aby zobaczyć regularność." />
  ) : (
    <TrainingHeatmapGrid weeksCount={data.length / 7}>
      {data.map(({ date, isOutsideRange, sessions }) => (
        <span
          key={date}
          aria-current={date === today ? "date" : undefined}
          aria-label={`${formatAnalyticsDate(date)}: ${sessions} sesji`}
          title={`${formatAnalyticsDate(date)}: ${sessions} sesji`}
          style={{
            background:
              sessions > 0
                ? "#176f86"
                : isOutsideRange
                  ? "rgba(100, 87, 77, 0.06)"
                  : "rgba(100, 87, 77, 0.12)",
                border: date === today ? "1px solid #c83d29" : "1px solid transparent",
                opacity: isOutsideRange ? 0.4 : 1,
          }}
        />
      ))}
    </TrainingHeatmapGrid>
  );

  if (contentOnly) return content;

  return (
    <AnalyticsChartPanel
      eyebrow="Regularność"
      title={`Aktywność treningowa ${year}`}
      badge={`${chartRange.start} - ${chartRange.end}`}
      height="auto"
      embedded={embedded}
    >
      {content}
    </AnalyticsChartPanel>
  );
}