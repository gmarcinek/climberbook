import type {
  FatigueDimension,
  FatigueDimensions,
  AscentRecord,
  TrainingLoadActivity,
  TrainingConditions,
  TrainingFocus,
  TrainingRecord,
  TrainingSurface,
  SpraywallIntensity,
  FacilityRecord,
} from "@/lib/climbs-db";
import { getGradeRank } from "@/components/climberbook/common/training";
import { getObjectiveStimulusActivities } from "@/lib/training-stimulus";

const minimumCoin = 0.001;
const maxSessionLoad = 120;

export const fatigueDimensionKeys = [
  "fitness",
  "structural",
  "strength",
  "fingers",
  "skill",
] as const;

export type { FatigueDimension, FatigueDimensions, TrainingLoadActivity };

const dimensionPrices: Record<TrainingSurface | "general", FatigueDimensions> =
  {
    lina: {
      fitness: 0.9,
      structural: 0.6,
      strength: 0.4,
      fingers: 0.45,
      skill: 0.35,
    },
    baldy: {
      fitness: 0.55,
      structural: 0.85,
      strength: 0.8,
      fingers: 0.9,
      skill: 0.5,
    },
    moon: {
      fitness: 0.5,
      structural: 1,
      strength: 0.9,
      fingers: 1,
      skill: 0.4,
    },
    kilter: {
      fitness: 0.5,
      structural: 1,
      strength: 0.9,
      fingers: 1,
      skill: 0.4,
    },
    drazek: {
      fitness: 0.4,
      structural: 0.7,
      strength: 1.2,
      fingers: 0.15,
      skill: 0.1,
    },
    spraywall: {
      fitness: 0.75,
      structural: 0.6,
      strength: 0.6,
      fingers: 0.65,
      skill: 0.65,
    },
    silownia: {
      fitness: 0.4,
      structural: 0.6,
      strength: 1,
      fingers: 0.1,
      skill: 0.1,
    },
    chwytotablica: {
      fitness: 0.2,
      structural: 0.95,
      strength: 0.6,
      fingers: 1.2,
      skill: 0.1,
    },
    campus: {
      fitness: 0.25,
      structural: 1.1,
      strength: 1.1,
      fingers: 1.2,
      skill: 0.15,
    },
    bieznia: {
      fitness: 1,
      structural: 0.2,
      strength: 0.1,
      fingers: 0,
      skill: 0.05,
    },
    rower: {
      fitness: 0.9,
      structural: 0.15,
      strength: 0.2,
      fingers: 0,
      skill: 0.05,
    },
    bieg: {
      fitness: 1,
      structural: 0.45,
      strength: 0.3,
      fingers: 0,
      skill: 0.05,
    },
    treking: {
      fitness: 0.8,
      structural: 0.35,
      strength: 0.25,
      fingers: 0,
      skill: 0.1,
    },
    general: {
      fitness: 0.5,
      structural: 0.3,
      strength: 0.3,
      fingers: 0.1,
      skill: 0.1,
    },
  };

const recoveryDimensionWeights: Record<
  Exclude<FatigueDimension, "skill">,
  number
> = {
  fitness: 10,
  structural: 14,
  strength: 12,
  fingers: 16,
};

type TrainingLoadInput = Pick<
  TrainingRecord,
  | "surfaces"
  | "durationMinutes"
  | "caloriesBurned"
  | "difficultyBySurface"
  | "protocol"
  | "facilityName"
  | "ropeRoutes"
> &
  Partial<Pick<TrainingRecord, "loadProfile">> & {
    focus?: TrainingFocus;
    conditions?: TrainingConditions;
    performanceReferences?: Partial<
      Record<ClimbingSurface, PerformanceReference>
    >;
  };

type ClimbingSurface = "lina" | "baldy" | "moon" | "kilter";

export type PerformanceReference = {
  grade: string;
  source: "recent_report" | "recent_training" | "lifetime_report";
};

const focusDimensionMultipliers: Record<
  TrainingFocus,
  Partial<FatigueDimensions>
> = {
  none: {},
  strength: { strength: 1.25 },
  specific_endurance: { fitness: 1.25 },
  strength_endurance: { fitness: 1.2, strength: 1.15 },
  finger_strength: { structural: 1.1, fingers: 1.25 },
  contact_strength: { structural: 1.15, strength: 1.2, fingers: 1.2 },
  volume: { fitness: 1.25, structural: 1.05 },
  intervals: { fitness: 1.3, strength: 1.1 },
  general_conditioning: { fitness: 1.1, structural: 1.1, strength: 1.05 },
};

const spraywallFocusDimensionMultipliers: Record<
  SpraywallIntensity,
  Record<TrainingFocus, Partial<FatigueDimensions>>
> = {
  soft: {
    none: {},
    strength: { fitness: 0.85 },
    specific_endurance: { fitness: 1.25 },
    strength_endurance: { fitness: 1.1 },
    finger_strength: { fitness: 0.85 },
    contact_strength: { fitness: 0.8 },
    volume: { fitness: 1.2 },
    intervals: { fitness: 1.15 },
    general_conditioning: { fitness: 1.1 },
  },
  medium: {
    none: {},
    strength: { structural: 1.1, strength: 1.25 },
    specific_endurance: { fitness: 1.3, skill: 1.1 },
    strength_endurance: { fitness: 1.2, strength: 1.2, fingers: 1.1 },
    finger_strength: { structural: 1.1, fingers: 1.3 },
    contact_strength: { structural: 1.15, strength: 1.2, fingers: 1.2 },
    volume: { fitness: 1.25, structural: 1.05 },
    intervals: { fitness: 1.3, strength: 1.1 },
    general_conditioning: { fitness: 1.1, structural: 1.1, strength: 1.05 },
  },
  hard: {
    none: {},
    strength: { structural: 1.15, strength: 1.35 },
    specific_endurance: { fitness: 1.4, strength: 1.1 },
    strength_endurance: { fitness: 1.2, strength: 1.3, fingers: 1.2 },
    finger_strength: { structural: 1.2, fingers: 1.4 },
    contact_strength: { structural: 1.25, strength: 1.35, fingers: 1.35 },
    volume: { fitness: 1.15, structural: 1.15, fingers: 1.1 },
    intervals: { fitness: 1.2, strength: 1.25, fingers: 1.15 },
    general_conditioning: { fitness: 1.05, structural: 1.15, strength: 1.15 },
  },
};

const conditionsMultiplier: Record<TrainingConditions, number> = {
  optimal: 1,
  cold: 1.1,
  stuffy: 1.1,
  too_warm: 1.1,
};

function emptyDimensions(): FatigueDimensions {
  return { fitness: 0, structural: 0, strength: 0, fingers: 0, skill: 0 };
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
): TrainingLoadActivity[] {
  const focus = training.focus ?? training.loadProfile?.focus ?? "none";
  const conditionMultiplier =
    conditionsMultiplier[
      training.conditions ?? training.loadProfile?.conditions ?? "optimal"
    ];

  return getObjectiveStimulusActivities(training, facilities).map(
    (activity) => {
      const focusMultipliers =
        activity.surface === "spraywall"
          ? spraywallFocusDimensionMultipliers[
              training.protocol?.spraywallIntensity ?? "medium"
            ][focus]
          : focusDimensionMultipliers[focus];
      const fatigueDimensions = fatigueDimensionKeys.reduce<FatigueDimensions>(
        (dimensions, dimension) => {
          dimensions[dimension] =
            (activity.dimensionCoin?.[dimension] ??
              activity.coin * activity.dimensionSplit[dimension]) *
            (focusMultipliers[dimension] ?? 1) *
            conditionMultiplier;
          return dimensions;
        },
        emptyDimensions(),
      );

      return {
        surface: activity.surface,
        coin: activity.coin,
        fatigueDimensions,
      };
    },
  );
}

export function getTrainingFatigueDimensions(
  training: TrainingRecord,
  facilities: FacilityRecord[] = [],
): FatigueDimensions {
  return getTrainingLoadActivities(
    training,
    facilities,
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
) {
  const dimensions = getTrainingFatigueDimensions(training, facilities);
  const recoveryLoad = (
    Object.entries(recoveryDimensionWeights) as Array<
      [Exclude<FatigueDimension, "skill">, number]
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
): TrainingStimulusImpact {
  const activities = getTrainingLoadActivities(training, facilities);
  const dimensions = activities.reduce<FatigueDimensions>((total, activity) => {
    fatigueDimensionKeys.forEach((dimension) => {
      total[dimension] += activity.fatigueDimensions[dimension];
    });
    return total;
  }, emptyDimensions());

  return {
    coin: activities.reduce((total, activity) => total + activity.coin, 0),
    dimensions,
    recoveryLoad: getTrainingLoad(training, facilities),
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
        total + getTrainingStimulusImpact(candidate, facilities).coin,
      0,
    ) / recentTrainings.length;
  if (baselineCoin <= 0) return null;

  const ratio =
    getTrainingStimulusImpact(training, facilities).coin / baselineCoin;
  return {
    baselineCoin,
    ratio,
    sessionsCount: recentTrainings.length,
    level: ratio < 0.8 ? "below" : ratio > 1.2 ? "above" : "within",
  };
}
