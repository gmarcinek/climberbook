import type {
  FatigueDimension,
  FatigueDimensions,
  AscentRecord,
  TrainingLoadActivity,
  TrainingRecord,
  TrainingSurface,
  FacilityRecord,
} from "@/lib/climbs-db";
import { getGradeRank } from "@/components/climberbook/common/training";
import { getObjectiveStimulusActivities } from "@/lib/training-stimulus";

const minimumCoin = 0.001;
const maxSessionLoad = 120;

export const fatigueDimensionKeys = [
  "aerobicEndurance",
  "strengthEndurance",
  "strengthPower",
  "contactStrength",
] as const;

export type { FatigueDimension, FatigueDimensions, TrainingLoadActivity };

const recoveryDimensionWeights: Record<FatigueDimension, number> = {
  aerobicEndurance: 10,
  strengthEndurance: 12,
  strengthPower: 14,
  contactStrength: 16,
};

type TrainingLoadInput = Pick<
  TrainingRecord,
  | "id"
  | "athleteId"
  | "date"
  | "surfaces"
  | "durationMinutes"
  | "caloriesBurned"
  | "difficultyBySurface"
  | "protocol"
  | "loadProfile"
  | "facilityName"
  | "ropeRoutes"
> & {
  performanceReferences?: Partial<
    Record<ClimbingSurface, PerformanceReference>
  >;
};

type ClimbingSurface = "lina" | "baldy" | "moon" | "kilter";

export type PerformanceReference = {
  grade: string;
  source: "recent_report" | "recent_training" | "lifetime_report";
};

function emptyDimensions(): FatigueDimensions {
  return {
    aerobicEndurance: 0,
    strengthEndurance: 0,
    strengthPower: 0,
    contactStrength: 0,
  };
}

function countGrades(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean).length;
}

function getHighestGrade(grades: string[]) {
  return grades.reduce<string | null>((highest, grade) => {
    const rank = getGradeRank(grade);
    if (rank < 0) return highest;
    return !highest || rank > getGradeRank(highest) ? grade : highest;
  }, null);
}

function getTrainingSurfaceGrades(
  trainings: TrainingRecord[],
  surface: ClimbingSurface,
  sinceDate: string,
) {
  return trainings
    .filter((training) => training.date >= sinceDate)
    .flatMap((training) =>
      (training.difficultyBySurface?.[surface] ?? "").split(","),
    )
    .map((grade) => grade.trim())
    .filter(Boolean);
}

export function getPerformanceReferences(
  ascents: AscentRecord[],
  trainings: TrainingRecord[],
  referenceDate: string,
): Partial<Record<ClimbingSurface, PerformanceReference>> {
  const sinceDate = new Date(`${referenceDate}T00:00:00`);
  sinceDate.setDate(sinceDate.getDate() - 30);
  const recentDate = sinceDate.toISOString().slice(0, 10);
  const references: Partial<Record<ClimbingSurface, PerformanceReference>> = {};

  (["lina", "baldy", "moon", "kilter"] as const).forEach((surface) => {
    const recentReportGrade = getHighestGrade(
      ascents
        .filter(
          (ascent) =>
            ascent.discipline === surface && ascent.date >= recentDate,
        )
        .map((ascent) => ascent.subjectiveGrade || ascent.suggestedGrade),
    );
    if (recentReportGrade) {
      references[surface] = {
        grade: recentReportGrade,
        source: "recent_report",
      };
      return;
    }

    const recentTrainingGrade = getHighestGrade(
      getTrainingSurfaceGrades(trainings, surface, recentDate),
    );
    if (recentTrainingGrade) {
      references[surface] = {
        grade: recentTrainingGrade,
        source: "recent_training",
      };
      return;
    }

    const lifetimeReportGrade = getHighestGrade(
      ascents
        .filter((ascent) => ascent.discipline === surface)
        .map((ascent) => ascent.subjectiveGrade || ascent.suggestedGrade),
    );
    if (lifetimeReportGrade) {
      references[surface] = {
        grade: lifetimeReportGrade,
        source: "lifetime_report",
      };
    }
  });

  return references;
}

function getGradeIntensityMultiplier(
  training: TrainingLoadInput,
  surface: TrainingSurface | "general",
) {
  if (
    surface === "general" ||
    !training.performanceReferences ||
    !(surface in training.performanceReferences)
  )
    return 1;

  const reference =
    training.performanceReferences?.[surface as ClimbingSurface];
  const grade = getHighestGrade(
    (training.difficultyBySurface?.[surface] ?? "")
      .split(",")
      .map((value) => value.trim()),
  );
  if (!reference || !grade) return 1;

  return Math.min(
    1.5,
    Math.max(
      0.5,
      1 + (getGradeRank(grade) - getGradeRank(reference.grade)) * 0.12,
    ),
  );
}

function getIntensityMultiplier(training: TrainingLoadInput) {
  const gradeCount = Object.values(training.difficultyBySurface ?? {}).reduce(
    (total, grades) => total + countGrades(grades),
    0,
  );
  const pullUpRepetitions = (training.protocol?.pullUp ?? []).reduce(
    (total, set) => total + set.sets * (set.repetitions ?? 1),
    0,
  );
  const hangboardSeconds = (training.protocol?.hangboard ?? []).reduce(
    (total, set) =>
      total + set.sets * (set.hangSeconds ?? 7) * (set.repetitions ?? 1),
    0,
  );
  const gradeFactor = Math.min(0.35, gradeCount * 0.04);
  const strengthFactor = Math.min(0.25, pullUpRepetitions / 200);
  const fingersFactor = Math.min(0.25, hangboardSeconds / 600);
  const calorieFactor = Math.min(
    0.15,
    (Math.max(0, training.caloriesBurned) / 1_000) * 0.15,
  );

  return 1 + gradeFactor + strengthFactor + fingersFactor + calorieFactor;
}

export function getTrainingLoadActivities(
  training: TrainingLoadInput,
  facilities: FacilityRecord[] = [],
  referenceTrainings: TrainingRecord[] = [],
): TrainingLoadActivity[] {
  return getObjectiveStimulusActivities(
    training,
    facilities,
    referenceTrainings,
  ).map((activity) => {
    const fatigueDimensions = fatigueDimensionKeys.reduce<FatigueDimensions>(
      (dimensions, dimension) => {
        dimensions[dimension] =
          activity.dimensionCoin?.[dimension] ??
          activity.coin * activity.dimensionSplit[dimension];
        return dimensions;
      },
      emptyDimensions(),
    );

    return {
      surface: activity.surface,
      coin: activity.coin,
      fatigueDimensions,
    };
  });
}

export function getTrainingFatigueDimensions(
  training: TrainingRecord,
  facilities: FacilityRecord[] = [],
  referenceTrainings: TrainingRecord[] = [],
): FatigueDimensions {
  return getTrainingLoadActivities(
    training,
    facilities,
    referenceTrainings,
  ).reduce<FatigueDimensions>((total, activity) => {
    fatigueDimensionKeys.forEach((dimension) => {
      total[dimension] += activity.fatigueDimensions[dimension];
    });
    return total;
  }, emptyDimensions());
}

export function getTrainingLoad(
  training: TrainingRecord,
  facilities: FacilityRecord[] = [],
  referenceTrainings: TrainingRecord[] = [],
) {
  const dimensions = getTrainingFatigueDimensions(
    training,
    facilities,
    referenceTrainings,
  );
  const recoveryLoad = (
    Object.entries(recoveryDimensionWeights) as Array<
      [FatigueDimension, number]
    >
  ).reduce(
    (total, [dimension, weight]) => total + dimensions[dimension] * weight,
    0,
  );

  return Math.min(maxSessionLoad, recoveryLoad);
}

export type TrainingStimulusImpact = {
  coin: number;
  dimensions: FatigueDimensions;
  recoveryLoad: number;
};

export type TrainingStimulusScale = {
  baselineCoin: number;
  ratio: number;
  sessionsCount: number;
  level: "below" | "within" | "above";
};

export function getTrainingStimulusImpact(
  training: TrainingRecord,
  facilities: FacilityRecord[] = [],
  referenceTrainings: TrainingRecord[] = [],
): TrainingStimulusImpact {
  const activities = getTrainingLoadActivities(
    training,
    facilities,
    referenceTrainings,
  );
  const dimensions = activities.reduce<FatigueDimensions>((total, activity) => {
    fatigueDimensionKeys.forEach((dimension) => {
      total[dimension] += activity.fatigueDimensions[dimension];
    });
    return total;
  }, emptyDimensions());
  const coin = fatigueDimensionKeys.reduce(
    (total, dimension) => total + dimensions[dimension],
    0,
  );

  return {
    coin,
    dimensions,
    recoveryLoad: getTrainingLoad(training, facilities, referenceTrainings),
  };
}

export function getTrainingStimulusScale(
  training: TrainingRecord,
  trainings: TrainingRecord[],
  facilities: FacilityRecord[] = [],
): TrainingStimulusScale | null {
  const startDate = new Date(`${training.date}T00:00:00`);
  startDate.setDate(startDate.getDate() - 28);
  const start = startDate.toISOString().slice(0, 10);
  const recentTrainings = trainings.filter(
    (candidate) =>
      candidate.id !== training.id &&
      candidate.date >= start &&
      candidate.date < training.date,
  );
  if (!recentTrainings.length) return null;

  const baselineCoin =
    recentTrainings.reduce(
      (total, candidate) =>
        total +
        getTrainingStimulusImpact(candidate, facilities, trainings).coin,
      0,
    ) / recentTrainings.length;
  if (baselineCoin <= 0) return null;

  const ratio =
    getTrainingStimulusImpact(training, facilities, trainings).coin /
    baselineCoin;
  return {
    baselineCoin,
    ratio,
    sessionsCount: recentTrainings.length,
    level: ratio < 0.8 ? "below" : ratio > 1.2 ? "above" : "within",
  };
}
