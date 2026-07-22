"use client";

import { MetricCard } from "@/components/climberbook/common/charts";
import { Stack } from "@/components/climberbook/common/Stack";
import { statsGridStyle } from "@/components/climberbook/common/styles";
import { formatDurationMinutes } from "@/components/climberbook/common/training";

type AnalyticsMetricsWidgetProps = {
  trainingsCount: number;
  totalTrainingTime: number;
  averageWeight: string;
};

export function AnalyticsMetricsWidget({
  trainingsCount,
  totalTrainingTime,
  averageWeight,
}: AnalyticsMetricsWidgetProps) {
  return (
    <Stack style={statsGridStyle}>
      <MetricCard
        label="Liczba treningów"
        value={String(trainingsCount)}
        detail="Wszystkie zapisane sesje"
      />
      <MetricCard
        label="Łączny czas"
        value={formatDurationMinutes(totalTrainingTime)}
        detail="Suma czasu treningowego"
      />
      <MetricCard
        label="Średnia waga"
        value={`${averageWeight} kg`}
        detail="Na podstawie wpisów wagi"
      />
    </Stack>
  );
}
