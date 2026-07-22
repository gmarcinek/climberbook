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
import type { FacilityRecord } from "@/lib/climbs-db";
import styles from "./SectionManagementWidget.module.css";

type Props = {
  facilities: FacilityRecord[];
  newFacilityName: string;
  setNewFacilityName: (name: string) => void;
  onAddFacility: (event: React.FormEvent<HTMLFormElement>) => void;
  onDeleteFacility: (facility: FacilityRecord) => Promise<void>;
};

export function FacilityManagementWidget({
  facilities,
  newFacilityName,
  setNewFacilityName,
  onAddFacility,
  onDeleteFacility,
}: Props) {
  return (
    <Form
      onSubmit={onAddFacility}
      header={
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Obiekty</span>
            <h2 style={sectionTitleStyle}>Miejsca treningu</h2>
          </div>
          <span style={softTagStyle}>{facilities.length}</span>
        </div>
      }
    >
      <input
        value={newFacilityName}
        onChange={(event) => setNewFacilityName(event.target.value)}
        placeholder="Np. Crux, Centrum Wspinaczkowe"
        style={inputStyle}
      />
      <FormActions>
        <Button type="submit" variant="tertiary">
          Dodaj obiekt
        </Button>
      </FormActions>
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
    </Form>
  );
}
