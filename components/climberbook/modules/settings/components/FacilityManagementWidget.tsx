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
import type { FacilityRecord } from "@/lib/climbs-db";
import styles from "./SectionManagementWidget.module.css";

type Props = {
  facilities: FacilityRecord[];
  onAddFacility: () => void;
  onDeleteFacility: (facility: FacilityRecord) => Promise<void>;
};

export function FacilityManagementWidget({
  facilities,
  onAddFacility,
  onDeleteFacility,
}: Props) {
  return (
    <Panel gap="md">
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Obiekty</span>
          <h2 style={sectionTitleStyle}>Lista obiektów</h2>
        </div>
        <Stack direction="row" gap="sm" align="center">
          <span style={softTagStyle}>{facilities.length}</span>
          <Button variant="primary" onClick={onAddFacility}>
            + Obiekt
          </Button>
        </Stack>
      </div>
      {facilities.length === 0 ? (
        <p style={mutedParagraphStyle}>Nie ma jeszcze żadnych obiektów.</p>
      ) : (
        <div className={styles.sectionList}>
          {facilities.map((facility) => (
            <span key={facility.id} className={styles.sectionChip}>
              {facility.name}
              <EmotButton
                size="small"
                className={styles.deleteButton}
                onClick={() => void onDeleteFacility(facility)}
                aria-label={`Usuń obiekt ${facility.name}`}
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
