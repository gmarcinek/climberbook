"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
} from "@/components/climberbook/common/charts/AnalyticsChartPrimitives";
import type { TrainingFocus, TrainingRecord } from "@/lib/climbs-db";

type FocusVolumeGroup = {
  focus: TrainingFocus | "none";
  label: string;
  color: string;
};

const focusVolumeGroups: FocusVolumeGroup[] = [
  {
    focus: "strength",
    label: "Siła",
    color: "var(--component-chart-focus-strength)",
  },
  {
    focus: "specific_endurance",
    label: "Wytrz. spec.",
    color: "var(--component-chart-focus-specific-endurance)",
  },
  {
    focus: "strength_endurance",
    label: "Wytrz. siłowa",
    color: "var(--component-chart-focus-strength-endurance)",
  },
  {
    focus: "finger_strength",
    label: "Palce",
    color: "var(--component-chart-focus-finger-strength)",
  },
  {
    focus: "contact_strength",
    label: "Kontakt",
    color: "var(--component-chart-focus-contact-strength)",
  },
  {
    focus: "volume",
    label: "Objętość",
    color: "var(--component-chart-focus-volume)",
  },
  {
    focus: "intervals",
    label: "Interwały",
    color: "var(--component-chart-focus-intervals)",
  },
  {
    focus: "general_conditioning",
    label: "Ogólny",
    color: "var(--component-chart-focus-general-conditioning)",
  },
  {
    focus: "none",
    label: "Bez celu",
    color: "var(--component-chart-focus-none)",
  },
];

function formatFocusVolumeData(trainings: TrainingRecord[]) {
  const minutesByFocus = new Map(
    focusVolumeGroups.map((group) => [group.focus, 0]),
  );

  trainings.forEach((training) => {
    const focus = training.loadProfile?.focus ?? "none";
    minutesByFocus.set(
      focus,
      (minutesByFocus.get(focus) ?? 0) + training.durationMinutes,
    );
  });

  return focusVolumeGroups
    .map((group) => ({
      label: group.label,
      color: group.color,
      hours:
        Math.round(((minutesByFocus.get(group.focus) ?? 0) / 60) * 10) / 10,
    }))
    .filter((group) => group.hours > 0);
}

export function SurfaceVolumeChartWidget({
  trainings,
  chartRangeLabel,
}: {
  trainings: TrainingRecord[];
  chartRangeLabel: string;
}) {
  const data = formatFocusVolumeData(trainings);

  return (
    <AnalyticsChartPanel
      eyebrow="Cel sesji"
      title="Czas według celu treningu"
      badge={chartRangeLabel}
    >
      {data.length === 0 ? (
        <EmptyState message="Dodaj treningi z określonym celem, aby porównać rozkład czasu." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 8, bottom: 4, left: -10 }}
          >
            <CartesianGrid vertical={false} {...analyticsChartGridStyle} />
            <XAxis dataKey="label" tick={analyticsChartAxisTickStyle} />
            <YAxis
              width={34}
              tick={analyticsChartAxisTickStyle}
              tickFormatter={(value) => `${value} h`}
            />
            <Tooltip formatter={(value) => [`${value} h`, "Czas"]} />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsChartPanel>
  );
}
