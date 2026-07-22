import type {
  HangboardMode,
  SpraywallIntensity,
  TrainingSurface,
} from "@/lib/climbs-db";

export type SurfaceOption = { value: TrainingSurface; label: string };

export type TrainingDraftValues = {
  date: string;
  time: string;
  durationMinutes: string;
  bodyWeightKg: string;
  ageYears: string;
  caloriesBurned: string;
  caloriesMode: "auto" | "manual";
  difficultyNotes: string;
  difficultyBySurface: Partial<Record<TrainingSurface, string>>;
  protocol: {
    pullUp: Array<{
      sets: string;
      repetitions: string;
      isOneRepMax: "tak" | "nie";
      loadDeloadKg: string;
    }>;
    hangboard: Array<{
      sets: string;
      mode: HangboardMode;
      usesRpm: "tak" | "nie";
      hangSeconds: string;
      restSeconds: string;
      repetitions: string;
      loadDeloadKg: string;
      edgeDepthMm: string;
    }>;
    spraywallIntensity: SpraywallIntensity;
  };
  wellbeing: string;
  surfaces: TrainingSurface[];
  facilityName: string;
  customSessionType: string;
  notes: string;
};