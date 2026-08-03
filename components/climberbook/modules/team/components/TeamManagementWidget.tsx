"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Input, Select } from "@/components/climberbook/common/FormControls";
import { Form, FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  settingsMainColumnStyle,
} from "@/components/climberbook/common/styles";
import { AthleteFormWidget } from "@/components/climberbook/modules/settings/components/AthleteFormWidget";
import { SectionManagementWidget } from "@/components/climberbook/modules/settings/components/SectionManagementWidget";
import { TeamRosterSettingsWidget } from "@/components/climberbook/modules/settings/components/TeamRosterSettingsWidget";
import type { AthleteFormDraft } from "@/components/climberbook/modules/settings/components/SettingsWidgetTypes";
import type {
  AthleteExportOptions,
  AthleteRecord,
  FacilityRecord,
  SectionRecord,
} from "@/lib/climbs-db";

type TeamManagementWidgetProps = {
  athletes: AthleteRecord[];
  activeAthleteId: string | null;
  sections: SectionRecord[];
  facilities: FacilityRecord[];
  athleteFormMode: "add" | "edit";
  athleteForm: AthleteFormDraft;
  status: string;
  newSectionName: string;
  setAthleteForm: Dispatch<SetStateAction<AthleteFormDraft>>;
  setNewSectionName: Dispatch<SetStateAction<string>>;
  onAddSection: (
    event: FormEvent<HTMLFormElement>,
    facilityId?: string,
  ) => void;
  onUpdateSection: (section: SectionRecord, name: string) => Promise<void>;
  onDeleteSection: (section: SectionRecord) => Promise<void>;
  onAssignAthleteSection: (
    athlete: AthleteRecord,
    sectionId: string,
  ) => Promise<void>;
  onAthleteExport: (
    athlete: AthleteRecord,
    options: AthleteExportOptions,
  ) => Promise<void>;
  onStartAthleteEdit: (athlete: AthleteRecord) => Promise<void>;
  onDeleteAthlete: (athlete: AthleteRecord) => Promise<void>;
  onAthleteFormSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onResetAthleteForm: () => void;
};

export function TeamManagementWidget({
  athletes,
  activeAthleteId,
  sections,
  facilities,
  athleteFormMode,
  athleteForm,
  status,
  newSectionName,
  setAthleteForm,
  setNewSectionName,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onAssignAthleteSection,
  onAthleteExport,
  onStartAthleteEdit,
  onDeleteAthlete,
  onAthleteFormSubmit,
  onResetAthleteForm,
}: TeamManagementWidgetProps) {
  const [isAthleteFormOpen, setIsAthleteFormOpen] = useState(false);
  const [isSectionFormOpen, setIsSectionFormOpen] = useState(false);
  const [sectionFacilityId, setSectionFacilityId] = useState("");

  function openAthleteForm() {
    onResetAthleteForm();
    setIsAthleteFormOpen(true);
  }

  async function editAthlete(athlete: AthleteRecord) {
    await onStartAthleteEdit(athlete);
    setIsAthleteFormOpen(true);
  }

  async function submitAthleteForm(event: FormEvent<HTMLFormElement>) {
    const saved = await onAthleteFormSubmit(event);
    if (saved) {
      setIsAthleteFormOpen(false);
      onResetAthleteForm();
    }
    return saved;
  }

  function closeAthleteForm() {
    setIsAthleteFormOpen(false);
    onResetAthleteForm();
  }

  function openSectionForm() {
    setSectionFacilityId("");
    setIsSectionFormOpen(true);
  }

  function closeSectionForm() {
    setNewSectionName("");
    setSectionFacilityId("");
    setIsSectionFormOpen(false);
  }

  async function submitSectionForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSectionName.trim()) return;
    await onAddSection(event, sectionFacilityId);
    closeSectionForm();
  }

  return (
    <>
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
          onUpdateSection={onUpdateSection}
          onDeleteSection={onDeleteSection}
        />
      </div>
      {isAthleteFormOpen ? (
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
      {isSectionFormOpen ? (
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
    </>
  );
}
