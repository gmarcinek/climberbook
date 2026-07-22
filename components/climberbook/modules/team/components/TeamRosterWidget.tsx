"use client";

import {
  metricCardStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
  statsGridStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { Stack } from "@/components/climberbook/common/Stack";
import { formatDurationMinutes } from "@/components/climberbook/common/training";
import type { AthleteRecord } from "@/lib/climbs-db";
type TeamSummary = {
  athlete: AthleteRecord;
  trainingCount: number;
  volume: number;
  latestWeight: number | null;
};
type TeamRosterWidgetProps = {
  athletesCount: number;
  teamSummaryGroups: Array<{
    id: string;
    name: string;
    summaries: TeamSummary[];
  }>;
  activeAthleteId: string | null;
  onSelectAthlete: (athleteId: string) => void;
};
export function TeamRosterWidget({
  athletesCount,
  teamSummaryGroups,
  activeAthleteId,
  onSelectAthlete,
}: TeamRosterWidgetProps) {
  return (
    <Panel gap="md">
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Skład</span>
          <h2 style={sectionTitleStyle}>Zawodnicy</h2>
        </div>
        <span style={softTagStyle}>{athletesCount}</span>
      </div>
      {athletesCount === 0 ? (
        <p style={mutedParagraphStyle}>
          Brak zawodników. Dodaj pierwszego w zakładce Zespół w Settings.
        </p>
      ) : null}
      {teamSummaryGroups.map((group) => (
        <Stack key={group.id || "none"} gap="sm">
          <div style={panelHeadingStyle}>
            <span style={moduleEyebrowStyle}>{group.name}</span>
            <span style={softTagStyle}>{group.summaries.length}</span>
          </div>
          <div style={statsGridStyle}>
            {group.summaries.map((summary) => (
              <article
                key={summary.athlete.id}
                style={{
                  ...metricCardStyle,
                  background:
                    summary.athlete.id === activeAthleteId
                      ? "rgba(195, 102, 58, 0.1)"
                      : metricCardStyle.background,
                }}
              >
                <div style={panelHeadingStyle}>
                  <strong>{summary.athlete.name}</strong>
                  {summary.athlete.id === activeAthleteId ? (
                    <span style={softTagStyle}>Wybrany</span>
                  ) : (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => onSelectAthlete(summary.athlete.id)}
                    >
                      Otwórz
                    </Button>
                  )}
                </div>
                <span style={mutedParagraphStyle}>
                  {summary.trainingCount} sesji | {formatDurationMinutes(summary.volume)}
                </span>
                <strong>
                  Waga:{" "}
                  {summary.latestWeight ? `${summary.latestWeight} kg` : "-"}
                </strong>
              </article>
            ))}
          </div>
        </Stack>
      ))}
    </Panel>
  );
}
