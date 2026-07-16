"use client";

import { moduleContentStyle } from "@/components/climberbook/common/styles";
import { Stack } from "@/components/climberbook/common/Stack";
import { TeamHeaderWidget } from "./TeamHeaderWidget";
import { TeamRosterWidget } from "./TeamRosterWidget";
import { TeamWeightChartWidget } from "./TeamWeightChartWidget";
import type { AthleteRecord } from "@/lib/climbs-db";

type TeamSummary = {
  athlete: AthleteRecord;
  trainingCount: number;
  volume: number;
  latestWeight: number | null;
};
type TeamAssemblyProps = {
  moduleMeta: { eyebrow: string; title: string };
  athletes: AthleteRecord[];
  teamTrainingsCount: number;
  teamSummaryGroups: Array<{
    id: string;
    name: string;
    summaries: TeamSummary[];
  }>;
  activeAthleteId: string | null;
  onSelectAthlete: (athleteId: string) => void;
  teamWeightChartData: Array<Record<string, number | string>>;
};

export function TeamAssembly({
  moduleMeta,
  athletes,
  teamTrainingsCount,
  teamSummaryGroups,
  activeAthleteId,
  onSelectAthlete,
  teamWeightChartData,
}: TeamAssemblyProps) {
  return (
    <Stack gap="md" style={moduleContentStyle}>
      <TeamHeaderWidget
        moduleMeta={moduleMeta}
        athletesCount={athletes.length}
        teamTrainingsCount={teamTrainingsCount}
      />
      <TeamRosterWidget
        athletesCount={athletes.length}
        teamSummaryGroups={teamSummaryGroups}
        activeAthleteId={activeAthleteId}
        onSelectAthlete={onSelectAthlete}
      />
      <TeamWeightChartWidget
        athletes={athletes}
        teamWeightChartData={teamWeightChartData}
      />
    </Stack>
  );
}
