"use client";

import { moduleConfig } from "@/components/climberbook/common/modules";
import { useReportsModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { useClimberbookStats } from "@/components/climberbook/hooks/useClimberbookStats";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { ReportsAssembly } from "./components/ReportsAssembly";
import { frenchGradeOptions } from "@/components/climberbook/common/constants";
export function ReportsModule() {
  const app = useReportsModule();
  const { isMobileChartLayout } = useViewport();
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
    <ReportsAssembly
      moduleMeta={moduleConfig[1]}
      ascentsCount={app.ascents.length}
      panelAscents={stats.panelAscents}
      rockAscents={stats.rockAscents}
      ascentDraft={app.ascentDraft}
      onAscentDraftChange={app.setAscentDraft}
      onAscentSubmit={app.submitAscent}
      frenchGradeOptions={frenchGradeOptions}
    />
  );
}
