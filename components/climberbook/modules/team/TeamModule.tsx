"use client";

import { moduleConfig } from "@/components/climberbook/common/modules";
import { useTeamSummaries } from "@/components/climberbook/hooks/useTeamSummaries";
import { TeamAssembly } from "./components/TeamAssembly";
import { useTeamModule } from "@/components/climberbook/providers/ClimberbookProvider";
export function TeamModule() {
  const app = useTeamModule();
  const moduleMeta = moduleConfig.find((module) => module.key === "team")!;
  const summaries = useTeamSummaries({
    athletes: app.athletes,
    sections: app.sections,
    teamTrainings: app.teamTrainings,
    teamWeightEntries: app.teamWeightEntries,
  });
  return (
    <TeamAssembly
      moduleMeta={moduleMeta}
      athletes={app.athletes}
      sections={app.sections}
      teamTrainingsCount={app.teamTrainings.length}
      teamSummaryGroups={summaries.teamSummaryGroups}
      activeAthleteId={app.activeAthleteId}
      onSelectAthlete={app.setActiveAthleteId}
      teamWeightChartData={summaries.teamWeightChartData}
      facilities={app.facilities}
      athleteFormMode={app.athleteFormMode}
      athleteForm={app.athleteForm}
      status={app.status}
      newSectionName={app.newSectionName}
      setAthleteForm={app.setAthleteForm}
      setNewSectionName={app.setNewSectionName}
      onAddSection={app.addSection}
      onUpdateSection={app.updateSection}
      onDeleteSection={app.deleteSection}
      onAssignAthleteSection={app.assignAthleteSection}
      onAthleteExport={app.exportAthlete}
      onStartAthleteEdit={app.startAthleteEdit}
      onDeleteAthlete={app.deleteAthlete}
      onAthleteFormSubmit={app.submitAthlete}
      onResetAthleteForm={app.resetAthleteForm}
    />
  );
}
