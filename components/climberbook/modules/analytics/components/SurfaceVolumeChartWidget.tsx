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
import type { TrainingRecord, TrainingSurface } from "@/lib/climbs-db";

type SurfaceVolumeGroup = {
  label: string;
  color: string;
  surfaces: TrainingSurface[];
};

const surfaceVolumeGroups: SurfaceVolumeGroup[] = [
  { label: "Lina", color: "#176f86", surfaces: ["lina"] },
  { label: "Baldy", color: "#e19a24", surfaces: ["baldy"] },
  { label: "Boardy", color: "#8b6fc8", surfaces: ["moon", "kilter"] },
  { label: "Spraywall", color: "#d16d3f", surfaces: ["spraywall"] },
  {
    label: "Siła",
    color: "#5c8d6d",
    surfaces: ["drazek", "chwytotablica", "campus", "silownia"],
  },
  {
    label: "Kondycja",
    color: "#3b82a0",
    surfaces: ["bieznia", "rower", "bieg", "treking"],
  },
];

function formatSurfaceVolumeData(trainings: TrainingRecord[]) {
  const minutesByLabel = new Map(
    surfaceVolumeGroups.map((group) => [group.label, 0]),
  );

  trainings.forEach((training) => {
    const matchingGroups = surfaceVolumeGroups.filter((group) =>
      training.surfaces.some((surface) => group.surfaces.includes(surface)),
    );

    if (matchingGroups.length === 0) {
      return;
    }

    const minutesPerGroup = training.durationMinutes / matchingGroups.length;

    matchingGroups.forEach((group) => {
      minutesByLabel.set(
        group.label,
        (minutesByLabel.get(group.label) ?? 0) + minutesPerGroup,
      );
    });
  });

  return surfaceVolumeGroups
    .map((group) => ({
      label: group.label,
      color: group.color,
      hours: Math.round(((minutesByLabel.get(group.label) ?? 0) / 60) * 10) / 10,
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
  const data = formatSurfaceVolumeData(trainings);

  return (
    <AnalyticsChartPanel
      eyebrow="Objętość"
      title="Czas według rodzaju treningu"
      badge={chartRangeLabel}
    >
      {data.length === 0 ? (
        <EmptyState message="Dodaj treningi z wybraną powierzchnią, aby porównać objętość." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: -10 }}>
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