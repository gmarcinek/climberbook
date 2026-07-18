import {
  athleteSelectStyle,
  deleteButtonStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import type { TeamRosterSettingsWidgetProps } from "./SettingsWidgetTypes";
export function TeamRosterSettingsWidget({
  athletes,
  activeAthleteId,
  sections,
  onAssignAthleteSection,
  onAthleteExport,
  onStartAthleteEdit,
  onDeleteAthlete,
}: TeamRosterSettingsWidgetProps) {
  return (
    <Panel gap="md">
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Zespół</span>
          <h2 style={sectionTitleStyle}>Lista zawodników</h2>
        </div>
        <span style={softTagStyle}>{athletes.length}</span>
      </div>
      {athletes.length === 0 ? (
        <p style={mutedParagraphStyle}>
          Brak zawodników. Dodaj pierwszego w formularzu obok.
        </p>
      ) : (
        <Stack gap="sm">
          {athletes.map((athlete) => (
            <Stack
              key={athlete.id}
              direction="row"
              gap="sm"
              wrap
              justify="between"
              align="center"
              style={{
                padding: "7px 8px",
                border: "1px solid var(--border-strong)",
                background:
                  athlete.id === activeAthleteId
                    ? "rgba(195, 102, 58, 0.1)"
                    : "rgba(255,255,255,0.35)",
              }}
            >
              <strong style={{ minWidth: 0 }}>{athlete.name}</strong>
              <Stack direction="row" gap="sm" wrap>
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
                <Button
                  size="small"
                  variant="quadrary"
                  onClick={() => void onAthleteExport(athlete)}
                >
                  Eksport
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => void onStartAthleteEdit(athlete)}
                >
                  Edytuj
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  style={deleteButtonStyle}
                  onClick={() => void onDeleteAthlete(athlete)}
                >
                  Usuń
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Panel>
  );
}
