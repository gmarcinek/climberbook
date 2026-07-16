"use client";

import { useMemo } from "react";
import type {
  AthleteRecord,
  SectionRecord,
  TrainingRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";

type UseTeamSummariesOptions = {
  athletes: AthleteRecord[];
  sections: SectionRecord[];
  teamTrainings: TrainingRecord[];
  teamWeightEntries: WeightEntryRecord[];
};

export function useTeamSummaries({
  athletes,
  sections,
  teamTrainings,
  teamWeightEntries,
}: UseTeamSummariesOptions) {
  const teamSummaries = useMemo(
    () =>
      athletes.map((athlete) => {
        const athleteTrainings = teamTrainings.filter(
          (training) => training.athleteId === athlete.id,
        );
        const athleteWeights = teamWeightEntries
          .filter((entry) => entry.athleteId === athlete.id)
          .sort((left, right) =>
            `${left.date}-${left.time}`.localeCompare(
              `${right.date}-${right.time}`,
            ),
          );

        return {
          athlete,
          trainingCount: athleteTrainings.length,
          volume: athleteTrainings.reduce(
            (sum, training) => sum + training.durationMinutes,
            0,
          ),
          latestWeight: athleteWeights.at(-1)?.weightKg ?? null,
        };
      }),
    [athletes, teamTrainings, teamWeightEntries],
  );
  const teamSummaryGroups = useMemo(() => {
    const groups = sections.map((section) => ({
      id: section.id,
      name: section.name,
      summaries: teamSummaries.filter(
        (summary) => summary.athlete.sectionId === section.id,
      ),
    }));
    const unassigned = teamSummaries.filter(
      (summary) =>
        !summary.athlete.sectionId ||
        !sections.some((section) => section.id === summary.athlete.sectionId),
    );

    if (unassigned.length > 0) {
      groups.push({ id: "", name: "Bez sekcji", summaries: unassigned });
    }

    return groups.filter((group) => group.summaries.length > 0);
  }, [sections, teamSummaries]);
  const teamWeightChartData = useMemo(() => {
    const weightsByDate = new Map<string, Record<string, number | string>>();

    teamWeightEntries.forEach((entry) => {
      const current = weightsByDate.get(entry.date) ?? { date: entry.date };
      current[entry.athleteId] = entry.weightKg;
      weightsByDate.set(entry.date, current);
    });

    return Array.from(weightsByDate.values())
      .sort((left, right) =>
        String(left.date).localeCompare(String(right.date)),
      )
      .slice(-30);
  }, [teamWeightEntries]);

  return { teamSummaryGroups, teamWeightChartData };
}
