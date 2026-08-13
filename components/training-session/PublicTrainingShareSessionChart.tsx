"use client";

import { RopeTrainingGradesChart } from "@/components/climberbook/common/charts/SessionGradesChart";
import type { PublicTrainingShare, TrainingRecord } from "@/lib/climbs-db";

type Props = {
  share: PublicTrainingShare;
};

export function PublicTrainingShareSessionChart({ share }: Props) {
  const training: TrainingRecord = {
    id: `public-${share.id}`,
    athleteId: "public-share",
    date: share.date,
    time: share.time || "12:00",
    durationMinutes: share.durationMinutes,
    ageYears: share.ageYears,
    caloriesBurned: share.caloriesBurned,
    attemptsCount: share.attemptsCount,
    difficultyNotes: share.difficultyNotes,
    difficultyBySurface: share.difficultyBySurface,
    wellbeing: share.wellbeing,
    surfaces: share.surfaces,
    facilityName: share.facilityName,
    weatherSnapshot: share.weatherSnapshot,
    ropeRoutes: share.ropeRoutes,
    customSessionType: share.activity,
    notes: share.notes,
    createdAt: share.createdAt,
  };

  return (
    <RopeTrainingGradesChart
      trainings={[training]}
      chartRange={{ start: share.date, end: share.date }}
      previewMode
    />
  );
}
