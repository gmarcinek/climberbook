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
import { Panel } from "@/components/climberbook/common/Panel";
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
  FacilityCapabilities,
  FacilityRecord,
  RopeWallInclination,
  SectionRecord,
  TrainingSurface,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import { AthleteFormWidget } from "./AthleteFormWidget";
import { DangerZoneWidget } from "./DangerZoneWidget";
import { DatabaseBackupWidget } from "./DatabaseBackupWidget";
import { DatabaseDeleteModalWidget } from "./DatabaseDeleteModalWidget";
import { ImportPreviewModalWidget } from "./ImportPreviewModalWidget";
import { ProfileFormWidget } from "./ProfileFormWidget";
import { ProfileMetricsWidget } from "./ProfileMetricsWidget";
import { SectionManagementWidget } from "./SectionManagementWidget";
import { SettingsHeaderWidget } from "./SettingsHeaderWidget";
import { SettingsTabsWidget } from "./SettingsTabsWidget";
import { TeamRosterSettingsWidget } from "./TeamRosterSettingsWidget";
import { ThemeSelector } from "@/components/climberbook/providers/ThemeSelector";
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
  onAddSection: (
    event: FormEvent<HTMLFormElement>,
    facilityId?: string,
  ) => void;
  onDeleteSection: (section: SectionRecord) => Promise<void>;
  onAddFacility: (
    event: FormEvent<HTMLFormElement>,
    capabilities: FacilityCapabilities,
  ) => Promise<void>;
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
  const [facilityCapabilities, setFacilityCapabilities] =
    useState<FacilityCapabilities>({
      activities: [],
      ropeWalls: [],
    });
  const activeAthlete =
    athletes.find((athlete) => athlete.id === activeAthleteId) ?? null;

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
    setFacilityCapabilities({ activities: [], ropeWalls: [] });
    setIsFacilityFormModalOpen(true);
  }

  function closeFacilityForm() {
    setNewFacilityName("");
    setFacilityCapabilities({ activities: [], ropeWalls: [] });
    setIsFacilityFormModalOpen(false);
  }

  async function submitFacilityForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newFacilityName.trim()) return;
    await onAddFacility(event, facilityCapabilities);
    closeFacilityForm();
  }

  function toggleFacilityActivity(activity: TrainingSurface) {
    setFacilityCapabilities((current) => ({
      ...current,
      activities: current.activities.includes(activity)
        ? current.activities.filter((item) => item !== activity)
        : [...current.activities, activity],
    }));
  }

  function addRopeWall() {
    setFacilityCapabilities((current) => ({
      ...current,
      ropeWalls: [
        ...current.ropeWalls,
        {
          name: `Ściana ${current.ropeWalls.length + 1}`,
          lengthMeters: 18,
          inclination: "vertical",
        },
      ],
    }));
  }

  function updateRopeWall(
    index: number,
    changes: Partial<FacilityCapabilities["ropeWalls"][number]>,
  ) {
    setFacilityCapabilities((current) => ({
      ...current,
      ropeWalls: current.ropeWalls.map((wall, wallIndex) =>
        wallIndex === index ? { ...wall, ...changes } : wall,
      ),
    }));
  }

  const facilityActivityOptions: Array<{
    value: TrainingSurface;
    label: string;
  }> = [
    { value: "lina", label: "Lina" },
    { value: "baldy", label: "Baldy" },
    { value: "moon", label: "Moonboard" },
    { value: "kilter", label: "Kilterboard" },
    { value: "spraywall", label: "Spray" },
    { value: "chwytotablica", label: "Chwytotablica" },
    { value: "campus", label: "Campus" },
    { value: "drazek", label: "Drążek" },
    { value: "silownia", label: "Siłka" },
    { value: "rower", label: "Rower" },
    { value: "bieg", label: "Bieg" },
    { value: "treking", label: "Treck" },
  ];

  const ropeInclinationOptions: Array<{
    value: RopeWallInclination;
    label: string;
  }> = [
    { value: "slab", label: "Pozytyw" },
    { value: "vertical", label: "Pion" },
    { value: "slight_overhang", label: "Lekki przewis" },
    { value: "overhang", label: "Przewieszenie" },
    { value: "steep", label: "Mocne przewieszenie" },
  ];

  return (
    <>
      <div style={{ ...moduleContainerStyle, ...moduleContentStyle }}>
        <SettingsHeaderWidget meta={meta} accountEmail={accountEmail} />
        <SettingsTabsWidget settingsTab={settingsTab} />
        {settingsTab === "profil" && (
          <div style={settingsMainColumnStyle}>
            <div style={settingsMainColumnStyle}>
              <Panel gap="sm">
                <div>
                  <p style={moduleEyebrowStyle}>WYGLĄD</p>
                  <h2 style={sectionTitleStyle}>Motyw aplikacji</h2>
                </div>
                <ThemeSelector />
              </Panel>
              <div className={styles.profileMetrics}>
                <ProfileMetricsWidget
                  profileDraft={profileDraft}
                  weightEntries={weightEntries}
                />
              </div>
              <div style={settingsMainColumnStyle}>
                <ProfileFormWidget
                  activeAthlete={activeAthlete}
                  accountEmail={accountEmail}
                  profileDraft={profileDraft}
                  weightEntries={weightEntries}
                  setProfileDraft={setProfileDraft}
                  onSettingsSubmit={onSettingsSubmit}
                  onStartAthleteEdit={editAthlete}
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
          style={{
            width: "min(100%, 720px)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
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
              <Button type="submit" variant="tertiary">
                Dodaj sekcję
              </Button>
              <Button variant="secondary" onClick={closeSectionForm}>
                Anuluj
              </Button>
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
            <div style={{ display: "grid", gap: "8px" }}>
              <strong>Dostępne aktywności</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {facilityActivityOptions.map((activity) => (
                  <label
                    key={activity.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={facilityCapabilities.activities.includes(
                        activity.value,
                      )}
                      onChange={() => toggleFacilityActivity(activity.value)}
                    />
                    {activity.label}
                  </label>
                ))}
              </div>
            </div>
            {facilityCapabilities.activities.includes("lina") ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>Ściany z liną</strong>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={addRopeWall}
                  >
                    + Ściana
                  </Button>
                </div>
                {facilityCapabilities.ropeWalls.map((wall, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 2fr) 82px minmax(0, 2fr) 48px",
                      gap: "8px",
                    }}
                  >
                    <Input
                      value={wall.name}
                      placeholder="Nazwa ściany"
                      aria-label={`Nazwa ściany ${index + 1}`}
                      onChange={(event) =>
                        updateRopeWall(index, { name: event.target.value })
                      }
                    />
                    <Input
                      value={String(wall.lengthMeters)}
                      type="number"
                      min="1"
                      step="1"
                      aria-label={`Długość ściany ${index + 1}`}
                      onChange={(event) =>
                        updateRopeWall(index, {
                          lengthMeters: Number(event.target.value) || 1,
                        })
                      }
                    />
                    <Select
                      value={wall.inclination}
                      aria-label={`Profil ściany ${index + 1}`}
                      onChange={(event) =>
                        updateRopeWall(index, {
                          inclination: event.target
                            .value as RopeWallInclination,
                        })
                      }
                    >
                      {ropeInclinationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      aria-label={`Usuń ścianę ${wall.name || index + 1}`}
                      title="Usuń ścianę"
                      style={{
                        width: "48px",
                        minWidth: "48px",
                        padding: 0,
                        fontSize: "18px",
                      }}
                      onClick={() =>
                        setFacilityCapabilities((current) => ({
                          ...current,
                          ropeWalls: current.ropeWalls.filter(
                            (_, wallIndex) => wallIndex !== index,
                          ),
                        }))
                      }
                    >
                      🗑
                    </Button>
                  </div>
                ))}
                {facilityCapabilities.ropeWalls.length === 0 ? (
                  <span>Dodaj długość i profil każdej ściany z liną.</span>
                ) : null}
              </div>
            ) : null}
            <FormActions layout="inline">
              <Button type="submit" variant="tertiary">
                Dodaj obiekt
              </Button>
              <Button variant="secondary" onClick={closeFacilityForm}>
                Anuluj
              </Button>
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
