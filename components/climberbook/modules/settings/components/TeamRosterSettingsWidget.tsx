import {
  actionRowStyle,
  athleteSelectStyle,
  deleteButtonStyle,
  ghostButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  panelStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type { TeamRosterSettingsWidgetProps } from "./SettingsWidgetTypes";
export function TeamRosterSettingsWidget({
  athletes,
  activeAthleteId,
  sections,
  onAssignAthleteSection,
  onAthleteExport,
  onStartAthleteEdit,
  onDeleteAthlete,
  backupImportInputRef,
  onDatabaseImport,
}: TeamRosterSettingsWidgetProps) {
  return (
    <section style={panelStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Zespół</span>
          <h2 style={sectionTitleStyle}>Lista zawodników</h2>
        </div>
        <span style={softTagStyle}>{athletes.length}</span>
      </div>
      <div style={actionRowStyle}>
        <input
          ref={backupImportInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onDatabaseImport}
          style={{ display: "none" }}
        />
        <button
          type="button"
          style={ghostButtonStyle}
          onClick={() => backupImportInputRef.current?.click()}
        >
          Import z pliku
        </button>
      </div>
      {athletes.length === 0 ? (
        <p style={mutedParagraphStyle}>
          Brak zawodników. Dodaj pierwszego w formularzu obok.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap" as const,
                padding: "7px 8px",
                border: "1px solid var(--border-strong)",
                background:
                  athlete.id === activeAthleteId
                    ? "rgba(195, 102, 58, 0.1)"
                    : "rgba(255,255,255,0.35)",
              }}
            >
              <strong style={{ minWidth: 0 }}>{athlete.name}</strong>
              <div style={actionRowStyle}>
                <select
                  value={athlete.sectionId ?? ""}
                  onChange={(event) =>
                    void onAssignAthleteSection(athlete, event.target.value)
                  }
                  style={athleteSelectStyle}
                >
                  <option value="">Bez sekcji</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => void onAthleteExport(athlete)}
                >
                  Eksport
                </button>
                <button
                  type="button"
                  style={ghostButtonStyle}
                  onClick={() => void onStartAthleteEdit(athlete)}
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  style={deleteButtonStyle}
                  onClick={() => void onDeleteAthlete(athlete)}
                >
                  Usuń
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
