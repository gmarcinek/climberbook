import {
  deleteButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Select } from "@/components/climberbook/common/FormControls";
import { Modal } from "@/components/climberbook/common/Modal";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  defaultAthleteExportOptions,
  type AthleteExportOptions,
} from "@/lib/climbs-db";
import type { TeamRosterSettingsWidgetProps } from "./SettingsWidgetTypes";
import styles from "./TeamRosterSettingsWidget.module.css";

const athleteExportOptionLabels: Array<{
  key: keyof AthleteExportOptions;
  label: string;
}> = [
  { key: "sections", label: "Sekcja" },
  { key: "facilities", label: "Obiekty" },
  { key: "climbs", label: "Drogi" },
  { key: "trainings", label: "Treningi" },
  { key: "ascents", label: "Przejścia" },
  { key: "profile", label: "Profil" },
  { key: "weightEntries", label: "Pomiary wagi" },
];

export function TeamRosterSettingsWidget({
  athletes,
  activeAthleteId,
  sections,
  onAddAthlete,
  onAssignAthleteSection,
  onAthleteExport,
  onStartAthleteEdit,
  onDeleteAthlete,
}: TeamRosterSettingsWidgetProps) {
  const [exportingAthlete, setExportingAthlete] = useState<
    (typeof athletes)[number] | null
  >(null);
  const [exportOptions, setExportOptions] = useState<AthleteExportOptions>(
    defaultAthleteExportOptions,
  );

  function openAthleteExport(athlete: (typeof athletes)[number]) {
    setExportingAthlete(athlete);
    setExportOptions({ ...defaultAthleteExportOptions });
  }

  function toggleExportOption(option: keyof AthleteExportOptions) {
    setExportOptions((current) => ({
      ...current,
      [option]: !current[option],
    }));
  }

  async function confirmAthleteExport() {
    if (!exportingAthlete) return;

    await onAthleteExport(exportingAthlete, exportOptions);
    setExportingAthlete(null);
  }

  return (
    <>
      <Panel gap="md">
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Zespół</span>
            <h2 style={sectionTitleStyle}>Lista zawodników</h2>
          </div>
          <Stack direction="row" gap="sm" align="center">
            <span style={softTagStyle}>{athletes.length}</span>
            <Button variant="primary" onClick={onAddAthlete}>
              + Zawodnik
            </Button>
          </Stack>
        </div>
        {athletes.length === 0 ? (
          <p style={mutedParagraphStyle}>
            Brak zawodników. Dodaj pierwszego zawodnika.
          </p>
        ) : (
          <Stack gap="sm">
            {athletes.map((athlete) => (
              <Stack
                key={athlete.id}
                direction="row"
                gap="sm"
                className={styles.athleteRow}
                justify="between"
                align="center"
                style={{
                  padding: "7px 8px",
                  border: "var(--component-input-border)",
                  background:
                    athlete.id === activeAthleteId
                      ? "var(--component-weight-entry-selected-background)"
                      : "var(--component-list-card-background)",
                }}
              >
                <strong style={{ minWidth: 0 }}>{athlete.name}</strong>
                <Stack
                  direction="row"
                  gap="sm"
                  className={styles.athleteActions}
                >
                  <Select
                    className={styles.sectionSelect}
                    value={athlete.sectionId ?? ""}
                    onChange={(event) =>
                      void onAssignAthleteSection(athlete, event.target.value)
                    }
                  >
                    <option value="">Bez sekcji</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="small"
                    variant="quadrary"
                    onClick={() => openAthleteExport(athlete)}
                  >
                    Eksport
                  </Button>
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() => void onStartAthleteEdit(athlete)}
                  >
                    Edytuj
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    style={deleteButtonStyle}
                    className={styles.deleteButton}
                    onClick={() => void onDeleteAthlete(athlete)}
                    aria-label={`Usuń zawodnika ${athlete.name}`}
                    title={`Usuń zawodnika ${athlete.name}`}
                  >
                    <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </Panel>
      {exportingAthlete ? (
        <Modal
          labelledBy="athlete-export-modal-title"
          onClose={() => setExportingAthlete(null)}
          className={styles.exportDialog}
        >
          <div className={styles.exportDialogBody}>
            <div>
              <span style={moduleEyebrowStyle}>Eksport zawodnika</span>
              <h3 id="athlete-export-modal-title" style={sectionTitleStyle}>
                Wybierz dane do eksportu
              </h3>
            </div>
            <p className={styles.exportDescription}>
              Przygotujesz plik dla: <strong>{exportingAthlete.name}</strong>.
            </p>
            <div
              className={styles.exportOptions}
              role="group"
              aria-label="Dane do eksportu"
            >
              <label className={styles.exportOption}>
                <input type="checkbox" checked disabled />
                <span>Dane zawodnika</span>
                <small>Zawsze dołączone</small>
              </label>
              {athleteExportOptionLabels.map(({ key, label }) => (
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
              <Button variant="ghost" onClick={() => setExportingAthlete(null)}>
                Anuluj
              </Button>
              <Button
                variant="quadrary"
                onClick={() => void confirmAthleteExport()}
              >
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
