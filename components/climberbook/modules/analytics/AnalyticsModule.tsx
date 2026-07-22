"use client";

import { moduleConfig } from "@/components/climberbook/common/modules";
import { useAnalyticsModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { useClimberbookStats } from "@/components/climberbook/hooks/useClimberbookStats";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { AnalyticsModuleContent } from "./components/AnalyticsModuleContent";

export function AnalyticsModule() {
  const app = useAnalyticsModule();
  const { isMobileChartLayout } = useViewport();
  const moduleMeta = moduleConfig.find((module) => module.key === "analityka")!;
  const stats = useClimberbookStats({
    ascents: app.ascents,
    isMobileChartLayout,
    profileDraft: app.profileDraft,
    selectedDate: app.selectedDate,
    today: app.today,
    trainingRangeStart: app.trainingRangeStart,
    trainings: app.trainings,
    weightEntries: app.weightEntries,
  });
  return (
    <AnalyticsModuleContent
      moduleMeta={moduleMeta}
      isMobileChartLayout={isMobileChartLayout}
      trainings={app.trainings}
      trainingsCount={app.trainings.length}
      averageWeight={stats.averageWeight}
      totalCalories={stats.totalCalories}
      totalTrainingTime={stats.totalTrainingTime}
      chartRangeLabel={stats.chartRangeLabel}
      weeklyTrainingStats={stats.weeklyTrainingStats}
      gradeDistribution={stats.gradeDistribution}
    />
  );
}
