import type {
  HangboardMode,
  HeartRateZone,
  RopeRoute,
  SpraywallIntensity,
  TrainingConditions,
  TrainingFocus,
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
  heartRateZoneTimes: Record<HeartRateZone, string>;
  runningDistanceKm: string;
  runningAveragePace: string;
  focus: TrainingFocus;
  conditions: TrainingConditions;
  conditionsWasSetManually: boolean;
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
  facilityId?: string;
  facilityVersion?: number;
  weatherSnapshot?: import("@/lib/climbs-db").TrainingWeatherSnapshot;
  ropeWallName: string;
  ropeRoutes: RopeRoute[];
  customSessionType: string;
  notes: string;
};
