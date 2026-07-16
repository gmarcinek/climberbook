"use client";

import { MetricCard } from "@/components/climberbook/common/charts";
import { Stack } from "@/components/climberbook/common/Stack";
import { statsGridStyle } from "@/components/climberbook/common/styles";

type AnalyticsMetricsWidgetProps = {
  trainingsCount: number;
  totalTrainingTime: number;
  averageWeight: string;
  totalAttempts: number;
};

export function AnalyticsMetricsWidget({
  trainingsCount,
  totalTrainingTime,
  averageWeight,
  totalAttempts,
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
        value={`${totalTrainingTime} min`}
        detail="Suma czasu treningowego"
      />
      <MetricCard
        label="Średnia waga"
        value={`${averageWeight} kg`}
        detail="Na podstawie wpisów treningowych"
      />
      <MetricCard
        label="Łączne wstawki"
        value={String(totalAttempts)}
        detail="Suma prób ze wszystkich sesji"
      />
    </Stack>
  );
}
