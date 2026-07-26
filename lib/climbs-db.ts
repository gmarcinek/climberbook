export type ClimbRecord = { id?: number; athleteId: string; name: string; grade: string; createdAt: string };
export type TrainingSurface = "lina" | "baldy" | "moon" | "drazek" | "spraywall" | "kilter" | "silownia" | "chwytotablica" | "campus" | "bieznia" | "rower" | "bieg" | "treking";
export type UserSex = "" | "kobieta" | "mezczyzna" | "inna";
export type UserProfileRecord = { key: string; athleteId: string; birthDate: string; sex: UserSex; heightCm: number | null; weightKg: number | null; updatedAt: string };
export type WeightEntryRecord = { id?: number; athleteId: string; date: string; time: string; weightKg: number; createdAt: string };
export type PullUpProtocolSet = { sets: number; repetitions?: number; isOneRepMax?: boolean; loadDeloadKg: number };
export type HangboardMode = "hangs" | "intervals";
export type HangboardProtocolSet = { sets: number; mode?: HangboardMode; usesRpm: boolean; hangSeconds?: number; restSeconds?: number; repetitions?: number; loadDeloadKg: number; edgeDepthMm: number };
export type SpraywallIntensity = "soft" | "medium" | "hard";
export type TrainingProtocol = { pullUp?: PullUpProtocolSet[]; hangboard?: HangboardProtocolSet[]; spraywallIntensity?: SpraywallIntensity };
export type TrainingRecord = { id: string; sourceId?: string; athleteId: string; date: string; time: string; durationMinutes: number; bodyWeightKg?: number; ageYears: number; caloriesBurned: number; attemptsCount: number; difficultyNotes: string; difficultyBySurface?: Partial<Record<TrainingSurface, string>>; protocol?: TrainingProtocol; wellbeing: string; surfaces: TrainingSurface[]; facilityName?: string; customSessionType?: string; notes: string; createdAt: string };
export type AscentRecord = { id?: number; athleteId: string; date: string; source: "panel" | "skala"; importSource?: "8a.nu"; routeName: string; suggestedGrade: string; subjectiveGrade: string; style?: string; notes: string; createdAt: string };
export type AthleteRecord = { id: string; sourceId?: string; name: string; firstName?: string; lastName?: string; nick?: string; email?: string; sectionId?: string | null; createdAt: string };
export type SectionRecord = { id: string; sourceId?: string; name: string; facilityId?: string | null; createdAt: string };
export type FacilityRecord = { id: string; name: string; createdAt: string };
export type AthleteInput = { firstName?: string; lastName?: string; nick?: string; email?: string; name?: string; sectionId?: string | null };

export function computeAthleteName(input: AthleteInput) {
  const fullName = [input.firstName, input.lastName].map((value) => value?.trim()).filter(Boolean).join(" ");
  return input.nick?.trim() || fullName || input.name?.trim() || "Zawodnik";
}

export type ClimberbookDataInterpretation = { purpose: string; primaryDataset: "llmTrainingSessions"; datasets: Record<string, string>; trainingFields: Record<string, string>; ascentFields: Record<string, string>; relationships: Record<string, string>; interpretationRules: string[]; unsupportedInferences: string[] };
export type LlmTrainingSession = { sourceTrainingId: string; athleteId: string; date: string; time: string; durationMinutes: number; surfaces: TrainingSurface[]; difficultyBySurface: Partial<Record<TrainingSurface, { gradeScale: "french" | "boulder_gym_numeric" | "v_scale"; maxExposureGrade: string; exposureRange: { min: string; max: string } }>>; protocol?: TrainingProtocol; facilityName?: string; caloriesBurned: number; wellbeing: string; notes: string; customSessionType?: string };
export type ClimberbookDatabaseBackup = { formatVersion: 2; exportedAt: string; trainingDataDisclaimer: string; dataInterpretation: ClimberbookDataInterpretation; llmTrainingSessions: LlmTrainingSession[]; athlete: AthleteRecord; climbs: ClimbRecord[]; trainings: TrainingRecord[]; ascents: AscentRecord[]; profile: UserProfileRecord; weightEntries: WeightEntryRecord[] };
export type ClimberbookFullDatabaseBackup = { formatVersion: 3; exportedAt: string; ownerAthleteId: string; ownerEmail?: string; trainingDataDisclaimer: string; dataInterpretation: ClimberbookDataInterpretation; llmTrainingSessions: LlmTrainingSession[]; athletes: AthleteRecord[]; sections: SectionRecord[]; facilities: FacilityRecord[]; climbs: ClimbRecord[]; trainings: TrainingRecord[]; ascents: AscentRecord[]; profiles: UserProfileRecord[]; weightEntries: WeightEntryRecord[] };
export type DatabaseImportPreview = { formatVersion: number; kind: "athlete" | "full"; title: string; summary: string; actionLabel: string; athleteName?: string; counts: { athletes: number; sections: number; facilities: number; climbs: number; trainings: number; ascents: number; profiles: number; weightEntries: number } };

const emptyInterpretation: ClimberbookDataInterpretation = { purpose: "Analiza ekspozycji treningowej.", primaryDataset: "llmTrainingSessions", datasets: {}, trainingFields: {}, ascentFields: {}, relationships: {}, interpretationRules: [], unsupportedInferences: [] };

export function createEmptyUserProfile(): UserProfileRecord {
  return { key: "athlete:primary", athleteId: "primary", birthDate: "", sex: "", heightCm: null, weightKg: null, updatedAt: "" };
}

export function createTrainingExportMetadata(trainings: TrainingRecord[]) {
  return { trainingDataDisclaimer: "Dane treningowe są przeznaczone do analizy ekspozycji treningowej.", dataInterpretation: emptyInterpretation, llmTrainingSessions: trainings.map((training): LlmTrainingSession => ({ sourceTrainingId: training.id, athleteId: training.athleteId, date: training.date, time: training.time, durationMinutes: training.durationMinutes, surfaces: training.surfaces, difficultyBySurface: {}, protocol: training.protocol, facilityName: training.facilityName, caloriesBurned: training.caloriesBurned, wellbeing: training.wellbeing, notes: training.notes, customSessionType: training.customSessionType })) };
}

export async function inspectDatabaseBackup(input: unknown): Promise<DatabaseImportPreview> {
  if (!input || typeof input !== "object" || (input as { formatVersion?: unknown }).formatVersion !== 3) {
    throw new Error("Import wymaga pełnego backupu PostgreSQL w formacie 3.");
  }
  const backup = input as Partial<ClimberbookFullDatabaseBackup>;
  const count = (value: unknown) => Array.isArray(value) ? value.length : 0;
  return { formatVersion: 3, kind: "full", title: "Import backupu PostgreSQL", summary: "Dane zostaną zaimportowane do bieżącego konta.", actionLabel: "Importuj dane", counts: { athletes: count(backup.athletes), sections: count(backup.sections), facilities: count(backup.facilities), climbs: count(backup.climbs), trainings: count(backup.trainings), ascents: count(backup.ascents), profiles: count(backup.profiles), weightEntries: count(backup.weightEntries) } };
}

function legacyStorageRemoved(): never { throw new Error("Ta historyczna operacja magazynu danych została usunięta. Użyj API PostgreSQL."); }
export const getDatabase: any = legacyStorageRemoved;
export const deleteClimberbookDatabase: any = legacyStorageRemoved;
export const listClimbs: any = legacyStorageRemoved;
export const addClimb: any = legacyStorageRemoved;
export const listTrainings: (athleteId: string) => Promise<TrainingRecord[]> = legacyStorageRemoved;
export const listAllTrainings: () => Promise<TrainingRecord[]> = legacyStorageRemoved;
export const addTraining: any = legacyStorageRemoved;
export const updateTraining: any = legacyStorageRemoved;
export const deleteTraining: any = legacyStorageRemoved;
export const listAscents: (athleteId: string) => Promise<AscentRecord[]> = legacyStorageRemoved;
export const addAscent: any = legacyStorageRemoved;
export const addAscents: any = legacyStorageRemoved;
export const deleteAscentsByImportSource: any = legacyStorageRemoved;
export const updateAscent: any = legacyStorageRemoved;
export const getUserProfile: (athleteId: string) => Promise<UserProfileRecord> = legacyStorageRemoved;
export const saveUserProfile: any = legacyStorageRemoved;
export const listWeightEntries: (athleteId: string) => Promise<WeightEntryRecord[]> = legacyStorageRemoved;
export const listAllWeightEntries: () => Promise<WeightEntryRecord[]> = legacyStorageRemoved;
export const listUserProfiles: any = legacyStorageRemoved;
export const listAthletes: () => Promise<AthleteRecord[]> = legacyStorageRemoved;
export const addAthlete: any = legacyStorageRemoved;
export const updateAthlete: any = legacyStorageRemoved;
export const listSections: () => Promise<SectionRecord[]> = legacyStorageRemoved;
export const listFacilities: () => Promise<FacilityRecord[]> = legacyStorageRemoved;
export const addFacility: any = legacyStorageRemoved;
export const deleteFacility: any = legacyStorageRemoved;
export const addSection: any = legacyStorageRemoved;
export const updateSection: any = legacyStorageRemoved;
export const deleteSection: any = legacyStorageRemoved;
export const assignAthleteToSection: any = legacyStorageRemoved;
export const deleteAthlete: any = legacyStorageRemoved;
export const addWeightEntry: any = legacyStorageRemoved;
export const updateWeightEntry: any = legacyStorageRemoved;
export const deleteWeightEntry: any = legacyStorageRemoved;
export const exportDatabaseBackup: any = legacyStorageRemoved;
export const exportFullDatabaseBackup: any = legacyStorageRemoved;
export const importDatabaseBackup: any = legacyStorageRemoved;