"use client";

import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  FormEvent,
  RefObject,
  SetStateAction,
} from "react";
import {
  moduleContainerStyle,
  moduleContentStyle,
  settingsMainColumnStyle,
} from "@/components/climberbook/common/styles";
import type { UserProfileDraft } from "@/components/climberbook/common/training";
import type {
  AthleteRecord,
  FacilityRecord,
  SectionRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import { AthleteFormWidget } from "./AthleteFormWidget";
import { DangerZoneWidget } from "./DangerZoneWidget";
import { DatabaseBackupWidget } from "./DatabaseBackupWidget";
import { DatabaseDeleteModalWidget } from "./DatabaseDeleteModalWidget";
import { ImportPreviewModalWidget } from "./ImportPreviewModalWidget";
import { ProfileFormWidget } from "./ProfileFormWidget";
import { FacilityManagementWidget } from "./FacilityManagementWidget";
import { ProfileMetricsWidget } from "./ProfileMetricsWidget";
import { SectionManagementWidget } from "./SectionManagementWidget";
import { SettingsHeaderWidget } from "./SettingsHeaderWidget";
import { SettingsTabsWidget } from "./SettingsTabsWidget";
import { TeamRosterSettingsWidget } from "./TeamRosterSettingsWidget";
import type {
  AthleteFormDraft,
  ModuleMeta,
  SettingsTab,
} from "./SettingsWidgetTypes";
import type { DatabaseImportPreview } from "@/lib/climbs-db";
export type { AthleteFormDraft } from "./SettingsWidgetTypes";
type SettingsAssemblyProps = {
  meta: ModuleMeta;
  accountEmail: string | null;
  currentAge: string;
  profileDraft: UserProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<UserProfileDraft>>;
  weightEntries: WeightEntryRecord[];
  settingsTab: SettingsTab;
  onSettingsSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDatabaseExport: () => void;
  backupImportInputRef: RefObject<HTMLInputElement | null>;
  onDatabaseImport: (event: ChangeEvent<HTMLInputElement>) => void;
  importPreview: DatabaseImportPreview | null;
  isImportPreviewOpen: boolean;
  isImportingBackup: boolean;
  onConfirmImportPreview: () => Promise<void>;
  onCloseImportPreview: () => void;
  isBackupDropActive: boolean;
  setIsBackupDropActive: Dispatch<SetStateAction<boolean>>;
  onBackupDrop: (event: DragEvent<HTMLDivElement>) => void;
  athletes: AthleteRecord[];
  activeAthleteId: string | null;
  sections: SectionRecord[];
  facilities: FacilityRecord[];
  newSectionName: string;
  setNewSectionName: Dispatch<SetStateAction<string>>;
  newFacilityName: string;
  setNewFacilityName: Dispatch<SetStateAction<string>>;
  onAddSection: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteSection: (section: SectionRecord) => Promise<void>;
  onAddFacility: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteFacility: (facility: FacilityRecord) => Promise<void>;
  onAssignAthleteSection: (
    athlete: AthleteRecord,
    sectionId: string,
  ) => Promise<void>;
  onAthleteExport: (athlete: AthleteRecord) => Promise<void>;
  onStartAthleteEdit: (athlete: AthleteRecord) => Promise<void>;
  onDeleteAthlete: (athlete: AthleteRecord) => Promise<void>;
  athleteFormMode: "add" | "edit";
  athleteForm: AthleteFormDraft;
  status: string;
  setAthleteForm: Dispatch<SetStateAction<AthleteFormDraft>>;
  onAthleteFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetAthleteForm: () => void;
  isDatabaseDeleteModalOpen: boolean;
  setIsDatabaseDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
  databaseDeleteConfirmation: string;
  setDatabaseDeleteConfirmation: Dispatch<SetStateAction<string>>;
  onDatabaseDelete: (event: FormEvent<HTMLFormElement>) => void;
  onCloseDatabaseDeleteModal: () => void;
};
export function SettingsAssembly(props: SettingsAssemblyProps) {
  const {
    meta,
    accountEmail,
    currentAge,
    profileDraft,
    setProfileDraft,
    weightEntries,
    settingsTab,
    onSettingsSubmit,
    onDatabaseExport,
    backupImportInputRef,
    onDatabaseImport,
    importPreview,
    isImportPreviewOpen,
    isImportingBackup,
    onConfirmImportPreview,
    onCloseImportPreview,
    isBackupDropActive,
    setIsBackupDropActive,
    onBackupDrop,
    athletes,
    activeAthleteId,
    sections,
    facilities,
    newSectionName,
    setNewSectionName,
    newFacilityName,
    setNewFacilityName,
    onAddSection,
    onDeleteSection,
    onAddFacility,
    onDeleteFacility,
    onAssignAthleteSection,
    onAthleteExport,
    onStartAthleteEdit,
    onDeleteAthlete,
    athleteFormMode,
    athleteForm,
    status,
    setAthleteForm,
    onAthleteFormSubmit,
    onResetAthleteForm,
    isDatabaseDeleteModalOpen,
    setIsDatabaseDeleteModalOpen,
    databaseDeleteConfirmation,
    setDatabaseDeleteConfirmation,
    onDatabaseDelete,
    onCloseDatabaseDeleteModal,
  } = props;
  return (
    <>
      <div style={{ ...moduleContainerStyle, ...moduleContentStyle }}>
        <SettingsHeaderWidget meta={meta} accountEmail={accountEmail} />
        <SettingsTabsWidget settingsTab={settingsTab} />
        {settingsTab === "profil" && (
          <div style={settingsMainColumnStyle}>
            <div style={settingsMainColumnStyle}>
              <ProfileMetricsWidget
                profileDraft={profileDraft}
                weightEntries={weightEntries}
              />
              <div style={settingsMainColumnStyle}>
                <ProfileFormWidget
                  profileDraft={profileDraft}
                  setProfileDraft={setProfileDraft}
                  onSettingsSubmit={onSettingsSubmit}
                />
              </div>
            </div>
          </div>
        )}
        {settingsTab === "zespol" && (
          <div style={settingsMainColumnStyle}>
            <SectionManagementWidget
              sections={sections}
              newSectionName={newSectionName}
              setNewSectionName={setNewSectionName}
              onAddSection={onAddSection}
              onDeleteSection={onDeleteSection}
            />
            <AthleteFormWidget
              athleteFormMode={athleteFormMode}
              athleteForm={athleteForm}
              validationMessage={status}
              setAthleteForm={setAthleteForm}
              sections={sections}
              onAthleteFormSubmit={onAthleteFormSubmit}
              onResetAthleteForm={onResetAthleteForm}
            />
            <TeamRosterSettingsWidget
              athletes={athletes}
              activeAthleteId={activeAthleteId}
              sections={sections}
              onAssignAthleteSection={onAssignAthleteSection}
              onAthleteExport={onAthleteExport}
              onStartAthleteEdit={onStartAthleteEdit}
              onDeleteAthlete={onDeleteAthlete}
            />
          </div>
        )}
        {settingsTab === "obiekty" && (
          <div style={settingsMainColumnStyle}>
            <FacilityManagementWidget
              facilities={facilities}
              newFacilityName={newFacilityName}
              setNewFacilityName={setNewFacilityName}
              onAddFacility={onAddFacility}
              onDeleteFacility={onDeleteFacility}
            />
          </div>
        )}
        {settingsTab === "zaawansowane" && (
          <div style={settingsMainColumnStyle}>
            <DatabaseBackupWidget
              backupImportInputRef={backupImportInputRef}
              onDatabaseExport={onDatabaseExport}
              onDatabaseImport={onDatabaseImport}
              isBackupDropActive={isBackupDropActive}
              setIsBackupDropActive={setIsBackupDropActive}
              onBackupDrop={onBackupDrop}
            />
            <DangerZoneWidget
              setIsDatabaseDeleteModalOpen={setIsDatabaseDeleteModalOpen}
            />
          </div>
        )}
      </div>
      {isDatabaseDeleteModalOpen && (
        <DatabaseDeleteModalWidget
          databaseDeleteConfirmation={databaseDeleteConfirmation}
          setDatabaseDeleteConfirmation={setDatabaseDeleteConfirmation}
          onDatabaseDelete={onDatabaseDelete}
          onCloseDatabaseDeleteModal={onCloseDatabaseDeleteModal}
        />
      )}
      {isImportPreviewOpen && importPreview ? (
        <ImportPreviewModalWidget
          preview={importPreview}
          isImporting={isImportingBackup}
          onConfirmImport={onConfirmImportPreview}
          onCloseImportPreview={onCloseImportPreview}
        />
      ) : null}
    </>
  );
}
