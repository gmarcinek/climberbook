export type ClimbRecord = {
  id?: number;
  athleteId: string;
  name: string;
  grade: string;
  createdAt: string;
};
export type TrainingSurface =
  | "lina"
  | "baldy"
  | "moon"
  | "drazek"
  | "spraywall"
  | "kilter"
  | "silownia"
  | "chwytotablica"
  | "campus"
  | "bieznia"
  | "rower"
  | "bieg"
  | "treking";
export type UserSex = "" | "kobieta" | "mezczyzna" | "inna";
export type UserProfileRecord = {
  key: string;
  athleteId: string;
  birthDate: string;
  sex: UserSex;
  heightCm: number | null;
  weightKg: number | null;
  updatedAt: string;
};
export type WeightEntryRecord = {
  id?: number;
  athleteId: string;
  date: string;
  time: string;
  weightKg: number;
  createdAt: string;
};
export type PullUpProtocolSet = {
  sets: number;
  repetitions?: number;
  isOneRepMax?: boolean;
  loadDeloadKg: number;
};
export type HangboardMode = "hangs" | "intervals";
export type HangboardProtocolSet = {
  sets: number;
  mode?: HangboardMode;
  usesRpm: boolean;
  hangSeconds?: number;
  restSeconds?: number;
  repetitions?: number;
  loadDeloadKg: number;
  edgeDepthMm: number;
};
export type SpraywallIntensity = "soft" | "medium" | "hard";
export type TrainingProtocol = {
  pullUp?: PullUpProtocolSet[];
  hangboard?: HangboardProtocolSet[];
  spraywallIntensity?: SpraywallIntensity;
};
export type FatigueDimension =
  | "aerobicEndurance"
  | "strengthEndurance"
  | "strengthPower"
  | "contactStrength";
export type FatigueDimensions = Record<FatigueDimension, number>;
export type TrainingLoadActivity = {
  surface: TrainingSurface | "general";
  coin: number;
  fatigueDimensions: FatigueDimensions;
};
export type TrainingFocus =
  | "none"
  | "strength"
  | "specific_endurance"
  | "strength_endurance"
  | "finger_strength"
  | "contact_strength"
  | "volume"
  | "intervals"
  | "general_conditioning";
export type KnownTrainingConditions =
  | "frosty"
  | "cold"
  | "cool"
  | "optimal"
  | "stuffy"
  | "too_warm"
  | "burdensome";
export type TrainingConditions = KnownTrainingConditions | (string & {});
export type TrainingLoadProfile = {
  algorithmVersion: 1;
  focus: TrainingFocus;
  conditions: TrainingConditions;
  activities?: TrainingLoadActivity[];
};
export type RopeRoute = {
  grade: string;
  ropeWallName: string;
  completed: number;
};
export type TrainingWeatherSnapshot = {
  source: "open-meteo";
  capturedAt: string;
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  relativeHumidity: number;
  wmo_code_wether: number;
  weatherCode?: number;
};
export type TrainingRecord = {
  id: string;
  sourceId?: string;
  athleteId: string;
  date: string;
  time: string;
  durationMinutes: number;
  bodyWeightKg?: number;
  ageYears: number;
  caloriesBurned: number;
  attemptsCount: number;
  difficultyNotes: string;
  difficultyBySurface?: Partial<Record<TrainingSurface, string>>;
  protocol?: TrainingProtocol;
  loadProfile?: TrainingLoadProfile;
  wellbeing: string;
  surfaces: TrainingSurface[];
  facilityName?: string;
  facilityId?: string;
  facilityVersion?: number;
  weatherSnapshot?: TrainingWeatherSnapshot;
  ropeWallName?: string;
  ropeRoutes?: RopeRoute[];
  customSessionType?: string;
  notes: string;
  createdAt: string;
};
export type AscentRecord = {
  id?: number;
  athleteId: string;
  date: string;
  source: "panel" | "skala";
  discipline?: "lina" | "baldy" | "moon" | "kilter";
  importSource?: "8a.nu";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  style?: string;
  notes: string;
  createdAt: string;
};
export type AthleteRecord = {
  id: string;
  sourceId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  nick?: string;
  email?: string;
  sectionId?: string | null;
  createdAt: string;
};
export type AthleteExportOptions = {
  sections: boolean;
  facilities: boolean;
  climbs: boolean;
  trainings: boolean;
  ascents: boolean;
  profile: boolean;
  weightEntries: boolean;
};
export const defaultAthleteExportOptions: AthleteExportOptions = {
  sections: true,
  facilities: true,
  climbs: true,
  trainings: true,
  ascents: true,
  profile: true,
  weightEntries: true,
};
export type FullDatabaseExportOptions = {
  athleteIds: string[];
  sections: boolean;
  facilities: boolean;
  climbs: boolean;
  trainings: boolean;
  ascents: boolean;
  profiles: boolean;
  weightEntries: boolean;
};
export const defaultFullDatabaseExportOptions: FullDatabaseExportOptions = {
  athleteIds: [],
  sections: true,
  facilities: true,
  climbs: true,
  trainings: true,
  ascents: true,
  profiles: true,
  weightEntries: true,
};
export type FullDatabaseImportOptions = {
  athleteIds: string[];
  sections: boolean;
  facilities: boolean;
  climbs: boolean;
  trainings: boolean;
  ascents: boolean;
  profiles: boolean;
  weightEntries: boolean;
  duplicateStrategy: "skip" | "overwrite";
};
export type SectionRecord = {
  id: string;
  sourceId?: string;
  name: string;
  facilityId?: string | null;
  createdAt: string;
};
export type RopeWallInclination =
  | "slab"
  | "vertical"
  | "slight_overhang"
  | "overhang"
  | "steep";
export type RopeWallProfile = {
  name: string;
  lengthMeters: number;
  inclination: RopeWallInclination;
};
export type FacilityCapabilities = {
  activities: TrainingSurface[];
  ropeWalls: RopeWallProfile[];
  hasAirConditioning?: boolean;
};
export type FacilityVisibility = "private" | "global";
export type FacilityKind = "indoor_wall" | "crag" | "crag_sector";
export type FacilityRecord = {
  id: string;
  currentVersion: number;
  name: string;
  capabilities: FacilityCapabilities;
  visibility: FacilityVisibility;
  createdBy: string;
  isOwnedByCurrentUser: boolean;
  kind: FacilityKind;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};
export type AthleteInput = {
  firstName?: string;
  lastName?: string;
  nick?: string;
  email?: string;
  name?: string;
  sectionId?: string | null;
};

export function computeAthleteName(input: AthleteInput) {
  const fullName = [input.firstName, input.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
  return input.nick?.trim() || fullName || input.name?.trim() || "Zawodnik";
}

export type ClimberbookDataInterpretation = {
  purpose: string;
  primaryDataset: "llmTrainingSessions";
  datasets: Record<string, string>;
  trainingFields: Record<string, string>;
  ascentFields: Record<string, string>;
  relationships: Record<string, string>;
  interpretationRules: string[];
  unsupportedInferences: string[];
};
export type LlmTrainingSession = {
  sourceTrainingId: string;
  athleteId: string;
  date: string;
  time: string;
  durationMinutes: number;
  surfaces: TrainingSurface[];
  difficultyBySurface: Partial<
    Record<
      TrainingSurface,
      {
        gradeScale: "french" | "boulder_gym_numeric" | "v_scale";
        maxExposureGrade: string;
        exposureRange: { min: string; max: string };
      }
    >
  >;
  protocol?: TrainingProtocol;
  facilityName?: string;
  caloriesBurned: number;
  wellbeing: string;
  notes: string;
  customSessionType?: string;
};
export type ClimberbookDatabaseBackup = {
  formatVersion: 2;
  exportedAt: string;
  trainingDataDisclaimer: string;
  dataInterpretation: ClimberbookDataInterpretation;
  llmTrainingSessions: LlmTrainingSession[];
  athlete: AthleteRecord;
  climbs: ClimbRecord[];
  trainings: TrainingRecord[];
  ascents: AscentRecord[];
  profile: UserProfileRecord;
  weightEntries: WeightEntryRecord[];
};
export type ClimberbookFullDatabaseBackup = {
  formatVersion: 3;
  exportedAt: string;
  ownerAthleteId: string;
  ownerEmail?: string;
  trainingDataDisclaimer: string;
  dataInterpretation: ClimberbookDataInterpretation;
  llmTrainingSessions: LlmTrainingSession[];
  athletes: AthleteRecord[];
  sections: SectionRecord[];
  facilities: FacilityRecord[];
  climbs: ClimbRecord[];
  trainings: TrainingRecord[];
  ascents: AscentRecord[];
  profiles: UserProfileRecord[];
  weightEntries: WeightEntryRecord[];
};
export type DatabaseImportPreview = {
  formatVersion: number;
  kind: "athlete" | "full";
  title: string;
  summary: string;
  actionLabel: string;
  athleteName?: string;
  athletes?: Array<{ id: string; name: string }>;
  counts: {
    athletes: number;
    sections: number;
    facilities: number;
    climbs: number;
    trainings: number;
    ascents: number;
    profiles: number;
    weightEntries: number;
  };
};

const trainingDataDisclaimer =
  "INSTRUKCJA INTERPRETACJI DLA AGENTA LLM: Głównym celem aplikacji są dane o ekspozycji treningowej. Do analizy używaj `llmTrainingSessions`, a dokładną legendę odczytaj z `dataInterpretation`. Ten zbiór przedstawia ekspozycję przez skalę oraz minimum i maksimum, bez surowych list wycen. `trainings` zawiera surowe rekordy techniczne dla importu backupu; nie analizuj jego tekstowego `difficultyBySurface`, jeśli dostępne jest `llmTrainingSessions`. `ascents` to niezależny, opcjonalny dodatek zawierający wyłącznie raportowane przejścia, nie próby. Brak `ascents` nie oznacza braku treningu, ekspozycji ani postępu. Nie wyprowadzaj liczby prób z żadnej części eksportu: `attemptsCount` jest historycznym polem, obecnie zapisywanym jako 0. `climbs` jest katalogiem obiektów wspinaczkowych, nie historią ich przejść.";

const trainingDataInterpretation: ClimberbookDataInterpretation = {
  purpose:
    "Głównym celem aplikacji jest zbieranie danych o ekspozycji treningowej. Analizy LLM opieraj przede wszystkim na zbiorze llmTrainingSessions.",
  primaryDataset: "llmTrainingSessions",
  datasets: {
    llmTrainingSessions:
      "Warstwa przeznaczona do analizy LLM. Zawiera sesje z jednoznaczną ekspozycją per powierzchnia: skalą, minimum i maksimum. Nie zawiera surowych list wycen.",
    trainings:
      "Surowe rekordy aplikacji zachowane na potrzeby importu i odtworzenia backupu. Pole difficultyBySurface może zawierać listy tekstowe; dla analizy LLM używaj zamiast niego llmTrainingSessions.",
    ascents:
      "Opcjonalne, samodzielnie raportowane przejścia. Brak rekordów nie oznacza braku treningu, ekspozycji ani postępu.",
    climbs:
      "Katalog obiektów wspinaczkowych. Nie jest historią przejść ani listą prób.",
    athletes: "Tożsamości zawodników, łączone z danymi przez athleteId.",
    profiles: "Profil i dane antropometryczne zawodnika.",
    weightEntries: "Niezależne pomiary masy ciała w czasie.",
    sections: "Opcjonalne grupy lub sekcje zawodników.",
    facilities: "Słownik obiektów lub miejsc treningu.",
  },
  trainingFields: {
    durationMinutes:
      "Czas całej sesji w minutach, nie czas pojedynczej aktywności.",
    surfaces:
      "Aktywności obecne w sesji, np. lina, baldy, Moon, Kilter, chwytotablica.",
    difficultyBySurface:
      "Tekstowa deklaracja ekspozycji na trudność dla aktywności w ramach sesji. Może zawierać listę wycen; elementy listy nie są osobnymi drogami, baldami, próbami ani przejściami.",
    protocol:
      "Szczegóły protokołu treningowego, np. serie, obciążenie, zwisy i przerwy.",
    facilityName:
      "Opcjonalna nazwa obiektu zapisana przy sesji jako historyczna etykieta.",
    caloriesBurned: "Szacowane, a nie zmierzone spalanie energii.",
    wellbeing: "Subiektywna ocena samopoczucia.",
    notes: "Wolny opis użytkownika; nie zakładaj ujednoliconej struktury.",
    attemptsCount:
      "Pole historyczne, obecnie zapisywane jako 0. Nie jest miarą liczby prób i nie nadaje się do analizy prób.",
  },
  ascentFields: {
    date: "Data raportowanego przejścia.",
    routeName: "Nazwa zgłoszonego przejścia.",
    suggestedGrade:
      "Wycena proponowana lub źródłowa dla raportowanego przejścia.",
    subjectiveGrade:
      "Subiektywna wycena użytkownika dla raportowanego przejścia.",
    style: "Opcjonalny styl raportowanego przejścia.",
  },
  relationships: {
    athleteId: "Łączy rekordy zawodnika między zbiorami danych.",
    facilityName:
      "Łączy trening z nazwą miejsca tylko opisowo; nie jest stabilnym identyfikatorem relacyjnym do facilities.",
    sectionId: "Opcjonalnie łączy zawodnika z rekordem sections.",
  },
  interpretationRules: [
    "W pierwszej kolejności analizuj częstotliwość, czas, aktywności, protokoły i deklarowaną ekspozycję w llmTrainingSessions.",
    "W llmTrainingSessions traktuj difficultyBySurface jako jakościowy wskaźnik poziomu i obciążenia ekspozycją w sesji.",
    "Traktuj ascents jako opcjonalny kontekst raportowanych przejść, oddzielny od danych treningowych.",
    "Wyraźnie rozdzielaj w analizie ekspozycję treningową od raportowanych przejść.",
  ],
  unsupportedInferences: [
    "Nie analizuj surowych list difficultyBySurface w trainings, gdy dostępne jest llmTrainingSessions.",
    "Nie licz dróg, baldów, poprowadzeń ani prób na podstawie difficultyBySurface.",
    "Nie wyprowadzaj liczby prób z attemptsCount, trainings, ascents ani climbs.",
    "Nie uznawaj braku ascents za brak treningu, ekspozycji lub rozwoju sportowego.",
    "Nie traktuj caloriesBurned jako precyzyjnego pomiaru fizjologicznego.",
  ],
};

export function createEmptyUserProfile(): UserProfileRecord {
  return {
    key: "athlete:primary",
    athleteId: "primary",
    birthDate: "",
    sex: "",
    heightCm: null,
    weightKg: null,
    updatedAt: "",
  };
}

export function createTrainingExportMetadata(trainings: TrainingRecord[]) {
  return {
    trainingDataDisclaimer,
    dataInterpretation: trainingDataInterpretation,
    llmTrainingSessions: trainings.map(
      (training): LlmTrainingSession => ({
        sourceTrainingId: training.id,
        athleteId: training.athleteId,
        date: training.date,
        time: training.time,
        durationMinutes: training.durationMinutes,
        surfaces: training.surfaces,
        difficultyBySurface: {},
        protocol: training.protocol,
        facilityName: training.facilityName,
        caloriesBurned: training.caloriesBurned,
        wellbeing: training.wellbeing,
        notes: training.notes,
        customSessionType: training.customSessionType,
      }),
    ),
  };
}

export async function inspectDatabaseBackup(
  input: unknown,
): Promise<DatabaseImportPreview> {
  if (
    !input ||
    typeof input !== "object" ||
    (input as { formatVersion?: unknown }).formatVersion !== 3
  ) {
    throw new Error("Import wymaga pełnego backupu PostgreSQL w formacie 3.");
  }
  const backup = input as Partial<ClimberbookFullDatabaseBackup>;
  const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);
  return {
    formatVersion: 3,
    kind: "full",
    title: "Import backupu PostgreSQL",
    summary: "Dane zostaną zaimportowane do bieżącego konta.",
    actionLabel: "Importuj dane",
    athletes: (backup.athletes ?? []).map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
    })),
    counts: {
      athletes: count(backup.athletes),
      sections: count(backup.sections),
      facilities: count(backup.facilities),
      climbs: count(backup.climbs),
      trainings: count(backup.trainings),
      ascents: count(backup.ascents),
      profiles: count(backup.profiles),
      weightEntries: count(backup.weightEntries),
    },
  };
}

function legacyStorageRemoved(): never {
  throw new Error(
    "Ta historyczna operacja magazynu danych została usunięta. Użyj API PostgreSQL.",
  );
}
export const getDatabase: any = legacyStorageRemoved;
export const deleteClimberbookDatabase: any = legacyStorageRemoved;
export const listClimbs: any = legacyStorageRemoved;
export const addClimb: any = legacyStorageRemoved;
export const listTrainings: (athleteId: string) => Promise<TrainingRecord[]> =
  legacyStorageRemoved;
export const listAllTrainings: () => Promise<TrainingRecord[]> =
  legacyStorageRemoved;
export const addTraining: any = legacyStorageRemoved;
export const updateTraining: any = legacyStorageRemoved;
export const deleteTraining: any = legacyStorageRemoved;
export const listAscents: (athleteId: string) => Promise<AscentRecord[]> =
  legacyStorageRemoved;
export const addAscent: any = legacyStorageRemoved;
export const addAscents: any = legacyStorageRemoved;
export const deleteAscentsByImportSource: any = legacyStorageRemoved;
export const updateAscent: any = legacyStorageRemoved;
export const getUserProfile: (athleteId: string) => Promise<UserProfileRecord> =
  legacyStorageRemoved;
export const saveUserProfile: any = legacyStorageRemoved;
export const listWeightEntries: (
  athleteId: string,
) => Promise<WeightEntryRecord[]> = legacyStorageRemoved;
export const listAllWeightEntries: () => Promise<WeightEntryRecord[]> =
  legacyStorageRemoved;
export const listUserProfiles: any = legacyStorageRemoved;
export const listAthletes: () => Promise<AthleteRecord[]> =
  legacyStorageRemoved;
export const addAthlete: any = legacyStorageRemoved;
export const updateAthlete: any = legacyStorageRemoved;
export const listSections: () => Promise<SectionRecord[]> =
  legacyStorageRemoved;
export const listFacilities: () => Promise<FacilityRecord[]> =
  legacyStorageRemoved;
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
