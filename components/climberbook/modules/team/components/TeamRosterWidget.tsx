"use client";

import {
  ghostButtonStyle,
  metricCardStyle,
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  panelStyle,
  sectionTitleStyle,
  softTagStyle,
  statsGridStyle,
} from "@/components/climberbook/common/styles";
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
    <section style={panelStyle}>
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
        <div key={group.id || "none"} style={{ display: "grid", gap: 6 }}>
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
                    <button
                      type="button"
                      style={ghostButtonStyle}
                      onClick={() => onSelectAthlete(summary.athlete.id)}
                    >
                      Otwórz
                    </button>
                  )}
                </div>
                <span style={mutedParagraphStyle}>
                  {summary.trainingCount} sesji | {summary.volume} min
                </span>
                <strong>
                  Waga:{" "}
                  {summary.latestWeight ? `${summary.latestWeight} kg` : "-"}
                </strong>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
