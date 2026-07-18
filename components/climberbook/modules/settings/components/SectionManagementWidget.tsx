import {
  inputStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { Form, FormActions } from "@/components/climberbook/common/FormLayout";
import type { SectionManagementWidgetProps } from "./SettingsWidgetTypes";
import styles from "./SectionManagementWidget.module.css";

export function SectionManagementWidget({
  sections,
  newSectionName,
  setNewSectionName,
  onAddSection,
  onDeleteSection,
}: SectionManagementWidgetProps) {
  return (
    <Form
      onSubmit={onAddSection}
      header={
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Sekcje</span>
            <h2 style={sectionTitleStyle}>Zarządzanie sekcjami</h2>
          </div>
          <span style={softTagStyle}>{sections.length}</span>
        </div>
      }
    >
      <input
        value={newSectionName}
        onChange={(event) => setNewSectionName(event.target.value)}
        placeholder="Nazwa sekcji / teamu"
        style={inputStyle}
      />
      <FormActions>
        <Button type="submit" variant="tertiary">
          Dodaj sekcję
        </Button>
      </FormActions>

      {sections.length === 0 ? (
        <p style={mutedParagraphStyle}>Nie ma jeszcze żadnych sekcji.</p>
      ) : (
        <div className={styles.sectionList}>
          {sections.map((section) => (
            <span key={section.id} className={styles.sectionChip}>
              {section.name}
              <EmotButton
                size="small"
                className={styles.deleteButton}
                onClick={() => void onDeleteSection(section)}
                aria-label={`Usuń sekcję ${section.name}`}
              >
                ×
              </EmotButton>
            </span>
          ))}
        </div>
      )}
    </Form>
  );
}
