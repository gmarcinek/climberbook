"use client";

import {
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { Modal } from "@/components/climberbook/common/Modal";
import {
  moduleEyebrowStyle,
  moduleContainerStyle,
  moduleContentStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  settingsMainColumnStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Input, Select } from "@/components/climberbook/common/FormControls";
import { Form, FormActions } from "@/components/climberbook/common/FormLayout";
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
import styles from "./SettingsAssembly.module.css";
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
  onAddSection: (event: FormEvent<HTMLFormElement>, facilityId?: string) => void;
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
  onAthleteFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
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
  const [isAthleteFormModalOpen, setIsAthleteFormModalOpen] = useState(false);
  const [isSectionFormModalOpen, setIsSectionFormModalOpen] = useState(false);
  const [isFacilityFormModalOpen, setIsFacilityFormModalOpen] = useState(false);
  const [sectionFacilityId, setSectionFacilityId] = useState("");

  function openAthleteForm() {
    onResetAthleteForm();
    setIsAthleteFormModalOpen(true);
  }

  async function editAthlete(athlete: AthleteRecord) {
    await onStartAthleteEdit(athlete);
    setIsAthleteFormModalOpen(true);
  }

  async function submitAthleteForm(event: FormEvent<HTMLFormElement>) {
    const saved = await onAthleteFormSubmit(event);
    if (saved !== false) {
      setIsAthleteFormModalOpen(false);
      onResetAthleteForm();
    }
    return saved;
  }

  function closeAthleteForm() {
    setIsAthleteFormModalOpen(false);
    onResetAthleteForm();
  }

  function openSectionForm() {
    setSectionFacilityId("");
    setIsSectionFormModalOpen(true);
  }

  function closeSectionForm() {
    setNewSectionName("");
    setSectionFacilityId("");
    setIsSectionFormModalOpen(false);
  }

  async function submitSectionForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSectionName.trim()) return;
    await onAddSection(event, sectionFacilityId);
    closeSectionForm();
  }

  function openFacilityForm() {
    setIsFacilityFormModalOpen(true);
  }

  function closeFacilityForm() {
    setNewFacilityName("");
    setIsFacilityFormModalOpen(false);
  }

  async function submitFacilityForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newFacilityName.trim()) return;
    await onAddFacility(event);
    closeFacilityForm();
  }

  return (
    <>
      <div style={{ ...moduleContainerStyle, ...moduleContentStyle }}>
        <SettingsHeaderWidget meta={meta} accountEmail={accountEmail} />
        <SettingsTabsWidget settingsTab={settingsTab} />
        {settingsTab === "profil" && (
          <div style={settingsMainColumnStyle}>
            <div style={settingsMainColumnStyle}>
              <div className={styles.profileMetrics}>
                <ProfileMetricsWidget
                  profileDraft={profileDraft}
                  weightEntries={weightEntries}
                />
              </div>
              <div style={settingsMainColumnStyle}>
                <ProfileFormWidget
                  profileDraft={profileDraft}
                  weightEntries={weightEntries}
                  setProfileDraft={setProfileDraft}
                  onSettingsSubmit={onSettingsSubmit}
                />
              </div>
            </div>
          </div>
        )}
        {settingsTab === "zespol" && (
          <div style={settingsMainColumnStyle}>
            <TeamRosterSettingsWidget
              athletes={athletes}
              activeAthleteId={activeAthleteId}
              sections={sections}
              onAddAthlete={openAthleteForm}
              onAssignAthleteSection={onAssignAthleteSection}
              onAthleteExport={onAthleteExport}
              onStartAthleteEdit={editAthlete}
              onDeleteAthlete={onDeleteAthlete}
            />
            <SectionManagementWidget
              sections={sections}
              facilities={facilities}
              onAddSection={openSectionForm}
              onDeleteSection={onDeleteSection}
            />
            <FacilityManagementWidget
              facilities={facilities}
              onAddFacility={openFacilityForm}
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
      {isAthleteFormModalOpen ? (
        <Modal
          labelledBy="athlete-form-title"
          onClose={closeAthleteForm}
          style={{ width: "min(100%, 720px)", maxHeight: "90vh", overflowY: "auto" }}
        >
          <AthleteFormWidget
            athleteFormMode={athleteFormMode}
            athleteForm={athleteForm}
            validationMessage={status}
            setAthleteForm={setAthleteForm}
            sections={sections}
            onAthleteFormSubmit={submitAthleteForm}
            onResetAthleteForm={closeAthleteForm}
          />
        </Modal>
      ) : null}
      {isSectionFormModalOpen ? (
        <Modal labelledBy="section-form-title" onClose={closeSectionForm}>
          <Form
            onSubmit={submitSectionForm}
            header={
              <div style={panelHeadingStyle}>
                <div>
                  <span style={moduleEyebrowStyle}>Nowa</span>
                  <h2 id="section-form-title" style={sectionTitleStyle}>
                    Dodaj sekcję
                  </h2>
                </div>
              </div>
            }
          >
            <Input
              autoFocus
              value={newSectionName}
              onChange={(event) => setNewSectionName(event.target.value)}
              placeholder="Nazwa sekcji / teamu"
            />
            <Select
              value={sectionFacilityId}
              onChange={(event) => setSectionFacilityId(event.target.value)}
            >
              <option value="">Miejsce odbywania się: bez obiektu</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </Select>
            <FormActions layout="inline">
              <Button type="submit" variant="tertiary">Dodaj sekcję</Button>
              <Button variant="secondary" onClick={closeSectionForm}>Anuluj</Button>
            </FormActions>
          </Form>
        </Modal>
      ) : null}
      {isFacilityFormModalOpen ? (
        <Modal labelledBy="facility-form-title" onClose={closeFacilityForm}>
          <Form
            onSubmit={submitFacilityForm}
            header={
              <div style={panelHeadingStyle}>
                <div>
                  <span style={moduleEyebrowStyle}>Nowy</span>
                  <h2 id="facility-form-title" style={sectionTitleStyle}>
                    Dodaj obiekt
                  </h2>
                </div>
              </div>
            }
          >
            <Input
              autoFocus
              value={newFacilityName}
              onChange={(event) => setNewFacilityName(event.target.value)}
              placeholder="Np. Crux, Centrum Wspinaczkowe"
            />
            <FormActions layout="inline">
              <Button type="submit" variant="tertiary">Dodaj obiekt</Button>
              <Button variant="secondary" onClick={closeFacilityForm}>Anuluj</Button>
            </FormActions>
          </Form>
        </Modal>
      ) : null}
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
