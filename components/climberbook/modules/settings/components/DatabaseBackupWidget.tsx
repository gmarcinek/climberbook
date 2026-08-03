import {
  backupDropzoneStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Input } from "@/components/climberbook/common/FormControls";
import { Modal } from "@/components/climberbook/common/Modal";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  defaultFullDatabaseExportOptions,
  type FullDatabaseExportOptions,
} from "@/lib/climbs-db";
import styles from "./DatabaseBackupWidget.module.css";
import type { DatabaseBackupWidgetProps } from "./SettingsWidgetTypes";

const fullExportOptionLabels: Array<{
  key: Exclude<keyof FullDatabaseExportOptions, "athleteIds">;
  label: string;
}> = [
  { key: "sections", label: "Sekcje" },
  { key: "facilities", label: "Obiekty" },
  { key: "climbs", label: "Drogi" },
  { key: "trainings", label: "Treningi" },
  { key: "ascents", label: "Przejścia" },
  { key: "profiles", label: "Profile" },
  { key: "weightEntries", label: "Pomiary wagi" },
];

export function DatabaseBackupWidget({
  backupImportInputRef,
  athletes,
  profileAthleteId,
  onDatabaseExport,
  onDatabaseImport,
  isBackupDropActive,
  setIsBackupDropActive,
  onBackupDrop,
}: DatabaseBackupWidgetProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<FullDatabaseExportOptions>(
    defaultFullDatabaseExportOptions,
  );
  const profileAthlete =
    athletes.find((athlete) => athlete.id === profileAthleteId) ??
    athletes[0] ??
    null;

  function openExportModal() {
    setExportOptions({
      ...defaultFullDatabaseExportOptions,
      athleteIds: athletes.map((athlete) => athlete.id),
    });
    setIsExportModalOpen(true);
  }

  function toggleExportOption(option: keyof FullDatabaseExportOptions) {
    setExportOptions((current) => ({
      ...current,
      [option]: !current[option],
    }));
  }

  function toggleAthlete(athleteId: string) {
    if (athleteId === profileAthlete?.id) return;

    setExportOptions((current) => ({
      ...current,
      athleteIds: current.athleteIds.includes(athleteId)
        ? current.athleteIds.filter((id) => id !== athleteId)
        : [...current.athleteIds, athleteId],
    }));
  }

  async function confirmExport() {
    await onDatabaseExport(exportOptions);
    setIsExportModalOpen(false);
  }

  return (
    <>
      <Panel gap="md">
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Dane</span>
            <h2 style={sectionTitleStyle}>Pełna kopia bazy</h2>
          </div>
          <span style={softTagStyle}>Całość danych</span>
        </div>
        <p style={mutedParagraphStyle}>
          Eksport zapisuje wszystkich zawodników i ich dane. Import rozpoznaje
          backup całej bazy albo pojedynczego zawodnika.
        </p>
        <Stack direction="row" gap="sm" wrap>
          <Button variant="quadrary" onClick={openExportModal}>
            Eksport całości
          </Button>
          <Input
            ref={backupImportInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onDatabaseImport}
            style={{ display: "none" }}
          />
          <Button
            variant="tertiary"
            onClick={() => backupImportInputRef.current?.click()}
          >
            Import z pliku
          </Button>
        </Stack>
        <div
          className={styles.dropzone}
          style={{
            ...backupDropzoneStyle,
            borderColor: isBackupDropActive
              ? "var(--accent)"
              : "var(--border-strong)",
            background: isBackupDropActive
              ? "rgba(195, 102, 58, 0.1)"
              : "var(--component-backup-dropzone-background, rgba(255,255,255,0.38))",
          }}
          role="button"
          tabIndex={0}
          onClick={() => backupImportInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              backupImportInputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsBackupDropActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsBackupDropActive(false)}
          onDrop={onBackupDrop}
        >
          {isBackupDropActive
            ? "Upuść backup JSON"
            : "Przeciągnij backup JSON tutaj"}
        </div>
      </Panel>
      {isExportModalOpen ? (
        <Modal
          labelledBy="full-database-export-modal-title"
          onClose={() => setIsExportModalOpen(false)}
          className={styles.exportDialog}
        >
          <div className={styles.exportDialogBody}>
            <div>
              <span style={moduleEyebrowStyle}>Eksport całości</span>
              <h3
                id="full-database-export-modal-title"
                style={sectionTitleStyle}
              >
                Wybierz dane do eksportu
              </h3>
            </div>
            <p className={styles.exportDescription}>
              Wybierz zawodników oraz dane, które mają znaleźć się w backupie.
            </p>
            <section
              className={styles.exportGroup}
              aria-labelledby="full-export-athletes-title"
            >
              <h4
                id="full-export-athletes-title"
                className={styles.exportGroupTitle}
              >
                Zawodnicy
              </h4>
              <div className={styles.exportOptions}>
                {athletes.map((athlete) => {
                  const isProfileAthlete = athlete.id === profileAthlete?.id;

                  return (
                    <label key={athlete.id} className={styles.exportOption}>
                      <input
                        type="checkbox"
                        checked={
                          isProfileAthlete ||
                          exportOptions.athleteIds.includes(athlete.id)
                        }
                        disabled={isProfileAthlete}
                        onChange={() => toggleAthlete(athlete.id)}
                      />
                      <span>{athlete.name}</span>
                      {isProfileAthlete ? (
                        <small>Zawodnik profilowy</small>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>
            <div
              className={styles.exportOptions}
              role="group"
              aria-label="Dane do eksportu"
            >
              {fullExportOptionLabels.map(({ key, label }) => (
                <label key={key} className={styles.exportOption}>
                  <input
                    type="checkbox"
                    checked={exportOptions[key]}
                    onChange={() => toggleExportOption(key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className={styles.exportActions}>
              <Button
                variant="ghost"
                onClick={() => setIsExportModalOpen(false)}
              >
                Anuluj
              </Button>
              <Button variant="quadrary" onClick={() => void confirmExport()}>
                <Download aria-hidden="true" size={18} strokeWidth={2} />
                Pobierz eksport
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
