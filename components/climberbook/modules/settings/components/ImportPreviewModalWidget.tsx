import {
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import type { FullDatabaseImportOptions } from "@/lib/climbs-db";
import type { ImportPreviewModalWidgetProps } from "./SettingsWidgetTypes";
import styles from "./ImportPreviewModalWidget.module.css";

const countLabelMap = {
  athletes: "Zawodnicy",
  sections: "Sekcje",
  facilities: "Obiekty",
  climbs: "Wspiny",
  trainings: "Treningi",
  ascents: "Przejścia",
  profiles: "Profile",
  weightEntries: "Pomiary wagi",
} as const;

const importOptionKeys = [
  "sections",
  "facilities",
  "climbs",
  "trainings",
  "ascents",
  "profiles",
  "weightEntries",
] as const satisfies ReadonlyArray<keyof FullDatabaseImportOptions>;

function createImportOptions(
  preview: ImportPreviewModalWidgetProps["preview"],
): FullDatabaseImportOptions {
  return {
    athleteIds: preview.athletes?.map((athlete) => athlete.id) ?? [],
    sections: true,
    facilities: true,
    climbs: true,
    trainings: true,
    ascents: true,
    profiles: true,
    weightEntries: true,
    duplicateStrategy: "skip",
  };
}

export function ImportPreviewModalWidget({
  preview,
  isImporting,
  onConfirmImport,
  onCloseImportPreview,
}: ImportPreviewModalWidgetProps) {
  const [importOptions, setImportOptions] = useState(() =>
    createImportOptions(preview),
  );
  const hasSelectedAthlete = importOptions.athleteIds.length > 0;

  function toggleAthlete(athleteId: string) {
    setImportOptions((current) => ({
      ...current,
      athleteIds: current.athleteIds.includes(athleteId)
        ? current.athleteIds.filter((id) => id !== athleteId)
        : [...current.athleteIds, athleteId],
    }));
  }

  function toggleImportOption(option: (typeof importOptionKeys)[number]) {
    setImportOptions((current) => ({
      ...current,
      [option]: !current[option],
    }));
  }

  return (
    <Modal
      labelledBy="import-preview-modal-title"
      onClose={onCloseImportPreview}
      style={{ width: "min(100%, 520px)" }}
    >
      <div className={styles.body}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Konfiguracja importu</span>
            <h3 id="import-preview-modal-title" style={sectionTitleStyle}>
              {preview.title}
            </h3>
          </div>
          <span style={softTagStyle}>v{preview.formatVersion}</span>
        </div>
        <p className={styles.description}>{preview.summary}</p>
        {preview.athletes?.length ? (
          <section
            className={styles.optionGroup}
            aria-labelledby="import-athletes-title"
          >
            <h4 id="import-athletes-title" className={styles.groupTitle}>
              Zawodnicy
            </h4>
            <div className={styles.optionList}>
              {preview.athletes.map((athlete) => (
                <label key={athlete.id} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={importOptions.athleteIds.includes(athlete.id)}
                    onChange={() => toggleAthlete(athlete.id)}
                  />
                  <span>{athlete.name}</span>
                </label>
              ))}
            </div>
          </section>
        ) : null}
        <section
          className={styles.optionGroup}
          aria-labelledby="import-data-title"
        >
          <h4 id="import-data-title" className={styles.groupTitle}>
            Dane do importu
          </h4>
          <div className={styles.optionList}>
            {importOptionKeys.map((key) => (
              <label key={key} className={styles.option}>
                <input
                  type="checkbox"
                  checked={importOptions[key]}
                  onChange={() => toggleImportOption(key)}
                />
                <span>{countLabelMap[key]}</span>
                <small>{preview.counts[key]}</small>
              </label>
            ))}
          </div>
        </section>
        <section
          className={styles.optionGroup}
          aria-labelledby="duplicate-strategy-title"
        >
          <h4 id="duplicate-strategy-title" className={styles.groupTitle}>
            Duplikaty
          </h4>
          <div className={styles.duplicateOptions}>
            <label className={styles.duplicateOption}>
              <input
                type="radio"
                name="duplicate-strategy"
                checked={importOptions.duplicateStrategy === "skip"}
                onChange={() =>
                  setImportOptions((current) => ({
                    ...current,
                    duplicateStrategy: "skip",
                  }))
                }
              />
              <span>Pomijaj duplikaty</span>
            </label>
            <label className={styles.duplicateOption}>
              <input
                type="radio"
                name="duplicate-strategy"
                checked={importOptions.duplicateStrategy === "overwrite"}
                onChange={() =>
                  setImportOptions((current) => ({
                    ...current,
                    duplicateStrategy: "overwrite",
                  }))
                }
              />
              <span>Nadpisuj istniejące dane</span>
            </label>
          </div>
        </section>
        <p style={mutedParagraphStyle}>{preview.actionLabel}</p>
        <FormActions className={styles.actions}>
          <Button
            variant="ghost"
            onClick={onCloseImportPreview}
            disabled={isImporting}
          >
            Anuluj
          </Button>
          <Button
            variant="quadrary"
            onClick={() => void onConfirmImport(importOptions)}
            disabled={isImporting || !hasSelectedAthlete}
          >
            {isImporting ? "Importowanie..." : "Importuj"}
          </Button>
        </FormActions>
      </div>
    </Modal>
  );
}
