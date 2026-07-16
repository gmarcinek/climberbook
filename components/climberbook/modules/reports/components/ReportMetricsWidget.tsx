"use client";

import { MetricCard } from "@/components/climberbook/common/charts";
import { statsGridStyle } from "@/components/climberbook/common/styles";
type ReportMetricsWidgetProps = {
  ascentsCount: number;
  panelAscents: number;
  rockAscents: number;
};
export function ReportMetricsWidget({
  ascentsCount,
  panelAscents,
  rockAscents,
}: ReportMetricsWidgetProps) {
  return (
    <div style={statsGridStyle}>
      <MetricCard
        label="Wpisy raportowe"
        value={String(ascentsCount)}
        detail="Wszystkie zapisane przejścia"
      />
      <MetricCard
        label="Panel"
        value={String(panelAscents)}
        detail="Liczba przejść panelowych"
      />
      <MetricCard
        label="Skała"
        value={String(rockAscents)}
        detail="Liczba przejść skalnych"
      />
    </div>
  );
}
