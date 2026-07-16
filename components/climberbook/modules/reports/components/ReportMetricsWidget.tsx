"use client";

import { MetricCard } from "@/components/climberbook/common/charts";
import { Stack } from "@/components/climberbook/common/Stack";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
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
  const { width, isMobileChartLayout } = useViewport();
  const isTabletReportLayout = width > 0 && width < 1024;

  return (
    <Stack
      style={{
        ...statsGridStyle,
        gridTemplateColumns:
          isMobileChartLayout || isTabletReportLayout
            ? "minmax(0, 1fr)"
            : statsGridStyle.gridTemplateColumns,
      }}
    >
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
    </Stack>
  );
}
