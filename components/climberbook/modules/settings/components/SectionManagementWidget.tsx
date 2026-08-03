"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import {
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Input } from "@/components/climberbook/common/FormControls";
import { Form, FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import type { SectionRecord } from "@/lib/climbs-db";
import type { SectionManagementWidgetProps } from "./SettingsWidgetTypes";
import styles from "./SectionManagementWidget.module.css";

export function SectionManagementWidget({
  sections,
  facilities,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
}: SectionManagementWidgetProps) {
  const [editingSection, setEditingSection] = useState<SectionRecord | null>(
    null,
  );
  const [sectionName, setSectionName] = useState("");
  const facilityNameById = new Map(
    facilities.map((facility) => [facility.id, facility.name]),
  );

  function openSectionEditor(section: SectionRecord) {
    setEditingSection(section);
    setSectionName(section.name);
  }

  function closeSectionEditor() {
    setEditingSection(null);
    setSectionName("");
  }

  async function submitSectionEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSection || !sectionName.trim() || !onUpdateSection) return;
    await onUpdateSection(editingSection, sectionName);
    closeSectionEditor();
  }

  return (
    <Panel gap="md">
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Sekcje</span>
          <h2 style={sectionTitleStyle}>Lista sekcji</h2>
        </div>
        <Stack direction="row" gap="sm" align="center">
          <span style={softTagStyle}>{sections.length}</span>
          <Button variant="primary" onClick={onAddSection}>
            + Sekcja
          </Button>
        </Stack>
      </div>
      {sections.length === 0 ? (
        <p style={mutedParagraphStyle}>Nie ma jeszcze żadnych sekcji.</p>
      ) : (
        <div className={styles.sectionList}>
          {sections.map((section) => (
            <div key={section.id} className={styles.sectionChip}>
              <span className={styles.sectionName}>
                {section.name}
                {section.facilityId
                  ? ` · ${facilityNameById.get(section.facilityId) ?? "Obiekt usunięty"}`
                  : ""}
              </span>
              <div className={styles.sectionActions}>
                {onUpdateSection ? (
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() => openSectionEditor(section)}
                  >
                    Edytuj
                  </Button>
                ) : null}
                <Button
                  size="small"
                  variant="secondary"
                  className={styles.deleteButton}
                  onClick={() => void onDeleteSection(section)}
                  aria-label={`Usuń sekcję ${section.name}`}
                  title={`Usuń sekcję ${section.name}`}
                >
                  <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editingSection ? (
        <Modal labelledBy="section-editor-title" onClose={closeSectionEditor}>
          <Form
            onSubmit={submitSectionEdit}
            header={
              <div style={panelHeadingStyle}>
                <div>
                  <span style={moduleEyebrowStyle}>Sekcja</span>
                  <h2 id="section-editor-title" style={sectionTitleStyle}>
                    Edytuj sekcję
                  </h2>
                </div>
              </div>
            }
          >
            <Input
              autoFocus
              value={sectionName}
              onChange={(event) => setSectionName(event.target.value)}
              aria-label="Nazwa sekcji"
            />
            <FormActions layout="inline">
              <Button type="submit" variant="primary">
                Zapisz zmiany
              </Button>
              <Button variant="secondary" onClick={closeSectionEditor}>
                Anuluj
              </Button>
            </FormActions>
          </Form>
        </Modal>
      ) : null}
    </Panel>
  );
}
