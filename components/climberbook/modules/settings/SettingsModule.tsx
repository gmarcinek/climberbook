"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { settingsTabs } from "@/components/climberbook/common/constants";
import { moduleConfig } from "@/components/climberbook/common/modules";
import { useClimberbookStats } from "@/components/climberbook/hooks/useClimberbookStats";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { SettingsAssembly } from "./components/SettingsAssembly";
import { useSettingsModule } from "@/components/climberbook/providers/ClimberbookProvider";
export function SettingsModule() {
  const app = useSettingsModule();
  const pathname = usePathname();
  const { width } = useViewport();
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const tabFromRoute =
    settingsTabs.find((tab) => tab.key === pathnameSegments[1])?.key ??
    "profil";

  useEffect(() => {
    if (app.settingsTab !== tabFromRoute) {
      app.setSettingsTab(tabFromRoute);
    }
  }, [app, tabFromRoute]);

  const stats = useClimberbookStats({
    ascents: app.ascents,
    isMobileChartLayout: width > 0 && width < 600,
    profileDraft: app.profileDraft,
    selectedDate: app.selectedDate,
    today: app.today,
    trainingRangeStart: app.trainingRangeStart,
    trainings: app.trainings,
    weightEntries: app.weightEntries,
  });
  return (
    <SettingsAssembly
      meta={moduleConfig[4]}
      currentAge={stats.currentAge}
      profileDraft={app.profileDraft}
      setProfileDraft={app.setProfileDraft}
      weightEntries={app.weightEntries}
      settingsTab={tabFromRoute}
      onSettingsSubmit={app.submitSettings}
      onDatabaseExport={app.exportDatabase}
      backupImportInputRef={app.backupImportInputRef}
      onDatabaseImport={app.importDatabase}
      importPreview={app.importPreview}
      isImportPreviewOpen={app.isImportPreviewOpen}
      isImportingBackup={app.isImportingBackup}
      onConfirmImportPreview={app.confirmImportPreview}
      onCloseImportPreview={app.closeImportPreview}
      isBackupDropActive={app.isBackupDropActive}
      setIsBackupDropActive={app.setIsBackupDropActive}
      onBackupDrop={app.dropBackup}
      athletes={app.athletes}
      activeAthleteId={app.activeAthleteId}
      sections={app.sections}
      newSectionName={app.newSectionName}
      setNewSectionName={app.setNewSectionName}
      onAddSection={app.addSection}
      onDeleteSection={app.deleteSection}
      onAssignAthleteSection={app.assignAthleteSection}
      onAthleteExport={app.exportAthlete}
      onStartAthleteEdit={app.startAthleteEdit}
      onDeleteAthlete={app.deleteAthlete}
      athleteFormMode={app.athleteFormMode}
      athleteForm={app.athleteForm}
      status={app.status}
      setAthleteForm={app.setAthleteForm}
      onAthleteFormSubmit={app.submitAthlete}
      onResetAthleteForm={app.resetAthleteForm}
      isDatabaseDeleteModalOpen={app.isDatabaseDeleteModalOpen}
      setIsDatabaseDeleteModalOpen={app.setIsDatabaseDeleteModalOpen}
      databaseDeleteConfirmation={app.databaseDeleteConfirmation}
      setDatabaseDeleteConfirmation={app.setDatabaseDeleteConfirmation}
      onDatabaseDelete={app.deleteDatabase}
      onCloseDatabaseDeleteModal={app.closeDatabaseDeleteModal}
    />
  );
}
