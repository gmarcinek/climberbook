"use client";

import { moduleConfig } from "@/components/climberbook/common/modules";
import { useTeamSummaries } from "@/components/climberbook/hooks/useTeamSummaries";
import { TeamAssembly } from "./components/TeamAssembly";
import { useTeamModule } from "@/components/climberbook/providers/ClimberbookProvider";
export function TeamModule() {
  const app = useTeamModule();
  const summaries = useTeamSummaries({
    athletes: app.athletes,
    sections: app.sections,
    teamTrainings: app.teamTrainings,
    teamWeightEntries: app.teamWeightEntries,
  });
  return (
    <TeamAssembly
      moduleMeta={moduleConfig[3]}
      athletes={app.athletes}
      teamTrainingsCount={app.teamTrainings.length}
      teamSummaryGroups={summaries.teamSummaryGroups}
      activeAthleteId={app.activeAthleteId}
      onSelectAthlete={app.setActiveAthleteId}
      teamWeightChartData={summaries.teamWeightChartData}
    />
  );
}
