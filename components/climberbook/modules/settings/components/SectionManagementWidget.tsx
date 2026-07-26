import {
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import type { SectionManagementWidgetProps } from "./SettingsWidgetTypes";
import styles from "./SectionManagementWidget.module.css";

export function SectionManagementWidget({
  sections,
  facilities,
  onAddSection,
  onDeleteSection,
}: SectionManagementWidgetProps) {
  const facilityNameById = new Map(
    facilities.map((facility) => [facility.id, facility.name]),
  );

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
            <span key={section.id} className={styles.sectionChip}>
              {section.name}
              {section.facilityId ? ` · ${facilityNameById.get(section.facilityId) ?? "Obiekt usunięty"}` : ""}
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
    </Panel>
  );
}
