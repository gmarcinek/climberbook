import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";

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

export type TrainingRecord = {
  id: string;
  sourceId?: string;
  athleteId: string;
  date: string;
  time: string;
  durationMinutes: number;
  bodyWeightKg: number;
  ageYears: number;
  caloriesBurned: number;
  attemptsCount: number;
  difficultyNotes: string;
  difficultyBySurface?: Partial<Record<TrainingSurface, string>>;
  protocol?: TrainingProtocol;
  wellbeing: string;
  surfaces: TrainingSurface[];
  facilityName?: string;
  customSessionType?: string;
  notes: string;
  createdAt: string;
};

export type AscentRecord = {
  id?: number;
  athleteId: string;
  date: string;
  source: "panel" | "skala";
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
  sectionId?: string | null;
  createdAt: string;
};

export type SectionRecord = {
  id: string;
  sourceId?: string;
  name: string;
  createdAt: string;
};

export type FacilityRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type AthleteInput = {
  firstName?: string;
  lastName?: string;
  nick?: string;
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

function getStableSourceId<T extends { id?: string; sourceId?: string | null }>(
  record: T | null | undefined,
) {
  const sourceId = record?.sourceId?.trim();
  return sourceId || record?.id || null;
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(
    typeof value === "string" && value.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ),
  );
}

function ensureAthleteSourceId(record: AthleteRecord) {
  const sourceId = isUuid(record.sourceId)
    ? record.sourceId
    : isUuid(record.id)
      ? record.id
      : crypto.randomUUID();

  return record.sourceId === sourceId ? record : { ...record, sourceId };
}

function ensureSectionSourceId(record: SectionRecord) {
  const sourceId = isUuid(record.sourceId)
    ? record.sourceId
    : isUuid(record.id)
      ? record.id
      : crypto.randomUUID();

  return record.sourceId === sourceId ? record : { ...record, sourceId };
}

function ensureTrainingId(record: TrainingRecord) {
  const id = isUuid(record.id)
    ? record.id
    : isUuid(record.sourceId)
      ? record.sourceId
      : crypto.randomUUID();
  const sourceId = isUuid(record.sourceId) ? record.sourceId : id;

  return record.id === id && record.sourceId === sourceId
    ? record
    : { ...record, id, sourceId };
}

async function ensureAthleteSourceIds(records: AthleteRecord[]) {
  const database = await getDatabase();
  return Promise.all(
    records.map(async (record) => {
      const normalized = ensureAthleteSourceId(record);

      if (normalized !== record) {
        await database.put("athletes", normalized);
      }

      return normalized;
    }),
  );
}

async function ensureSectionSourceIds(records: SectionRecord[]) {
  const database = await getDatabase();
  return Promise.all(
    records.map(async (record) => {
      const normalized = ensureSectionSourceId(record);

      if (normalized !== record) {
        await database.put("sections", normalized);
      }

      return normalized;
    }),
  );
}

async function ensureTrainingIds(records: TrainingRecord[]) {
  const database = await getDatabase();
  return Promise.all(
    records.map(async (record) => {
      const normalized = ensureTrainingId(record);

      if (normalized !== record) {
        await database.delete("trainings", record.id);
        await database.put("trainings", normalized);
      }

      return normalized;
    }),
  );
}

function buildTrainingWeightSnapshotKey(input: {
  athleteId: string;
  date: string;
  time?: string;
  weightKg: number;
}) {
  return [
    input.athleteId,
    input.date,
    input.time ?? "09:00",
    input.weightKg.toFixed(1),
  ].join("::");
}

function removeTrainingDerivedWeightEntries(
  trainings: TrainingRecord[],
  weightEntries: WeightEntryRecord[],
) {
  const trainingWeightKeys = new Set(
    trainings.map((training) =>
      buildTrainingWeightSnapshotKey({
        athleteId: training.athleteId,
        date: training.date,
        time: training.time,
        weightKg: training.bodyWeightKg,
      }),
    ),
  );

  return weightEntries.filter(
    (entry) =>
      !trainingWeightKeys.has(
        buildTrainingWeightSnapshotKey({
          athleteId: entry.athleteId,
          date: entry.date,
          time: entry.time,
          weightKg: entry.weightKg,
        }),
      ),
  );
}

export type ClimberbookDatabaseBackup = {
  formatVersion: 2;
  exportedAt: string;
  trainingDataDisclaimer: string;
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
  trainingDataDisclaimer: string;
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
  counts: {
    athletes: number;
    sections: number;
    climbs: number;
    trainings: number;
    ascents: number;
    profiles: number;
    weightEntries: number;
  };
};

interface ClimberbookDb extends DBSchema {
  climbs: {
    key: number;
    value: ClimbRecord;
    indexes: {
      "by-created-at": string;
      "by-athlete": string;
    };
  };
  trainings: {
    key: string;
    value: TrainingRecord;
    indexes: {
      "by-created-at": string;
      "by-date": string;
      "by-athlete": string;
    };
  };
  ascents: {
    key: number;
    value: AscentRecord;
    indexes: {
      "by-created-at": string;
      "by-date": string;
      "by-source": string;
      "by-athlete": string;
    };
  };
  settings: {
    key: string;
    value: UserProfileRecord;
    indexes: {
      "by-updated-at": string;
    };
  };
  weightEntries: {
    key: number;
    value: WeightEntryRecord;
    indexes: {
      "by-created-at": string;
      "by-date": string;
      "by-athlete": string;
    };
  };
  athletes: {
    key: string;
    value: AthleteRecord;
    indexes: {
      "by-created-at": string;
    };
  };
  sections: {
    key: string;
    value: SectionRecord;
    indexes: {
      "by-created-at": string;
    };
  };
  facilities: {
    key: string;
    value: FacilityRecord;
    indexes: {
      "by-created-at": string;
    };
  };
}

const DB_NAME = "climberbook";
const DB_VERSION = 18;
const TRAINING_DATA_DISCLAIMER =
  "INSTRUKCJA INTERPRETACJI DLA AGENTA LLM: Głównym celem aplikacji i głównym zbiorem eksportu są `trainings`: sesje opisujące ekspozycję treningową. Analizę zaczynaj od tych danych. `ascents` to niezależny, opcjonalny dodatek zawierający raportowane przejścia; jego brak nie oznacza braku treningu, ekspozycji ani postępu. `trainings` nie zawiera pojedynczych prób ani potwierdzonych przejść. `difficultyBySurface` opisuje najwyższą lub deklarowaną ekspozycję na trudność dla danej aktywności podczas sesji; traktuj ją jako wskaźnik obciążenia i poziomu trudności, nigdy jako liczbę zrobionych dróg, baldów, poprowadzeń lub prób. Nie sumuj wycen z `difficultyBySurface` ani nie wyprowadzaj z nich liczby przejść. Czas (`durationMinutes`), aktywności (`surfaces`), protokoły (`protocol`), notatki i opcjonalny `facilityName` opisują całą sesję. `ascents` zawiera wyłącznie przejścia zgłoszone przez użytkownika; nie jest zbiorem prób i nie wolno interpretować jego rekordów jako prób. Nie wyprowadzaj liczby prób z żadnej części eksportu: `attemptsCount` jest historycznym polem, obecnie zapisywanym jako 0, i nie jest wiarygodną miarą prób wspinaczkowych. `climbs` jest katalogiem obiektów wspinaczkowych, nie historią ich przejść. Analizując wyniki, wyraźnie oddzielaj ekspozycję treningową od raportowanych przejść i nie formułuj twierdzeń o liczbie prób bez osobnego, wiarygodnego źródła danych.";
const DEFAULT_ATHLETE: AthleteRecord = {
  id: "primary",
  name: "Ja",
  createdAt: "",
};
let databasePromise: Promise<IDBPDatabase<ClimberbookDb>> | null = null;

async function resetDatabaseConnection() {
  if (!databasePromise) {
    return;
  }

  try {
    const database = await databasePromise;
    database.close();
  } catch {
    // Ignore stale connection cleanup failures and reopen on next access.
  } finally {
    databasePromise = null;
  }
}

type StoreName = keyof ClimberbookDb;

function isClosingDatabaseError(error: unknown) {
  return error instanceof DOMException && error.name === "InvalidStateError";
}

async function withDatabaseRetry<T>(
  action: (database: IDBPDatabase<ClimberbookDb>) => Promise<T>,
) {
  try {
    const database = await getDatabase();
    return await action(database);
  } catch (error) {
    if (!isClosingDatabaseError(error)) {
      throw error;
    }

    await resetDatabaseConnection();
    const database = await getDatabase();
    return await action(database);
  }
}

function createDatabase() {
  return openDB<ClimberbookDb>(DB_NAME, DB_VERSION, {
    async upgrade(database, oldVersion, _newVersion, transaction) {
      if (!database.objectStoreNames.contains("climbs")) {
        const store = database.createObjectStore("climbs", {
          autoIncrement: true,
          keyPath: "id",
        });

        store.createIndex("by-created-at", "createdAt");
        store.createIndex("by-athlete", "athleteId");
      }

      if (!database.objectStoreNames.contains("athletes")) {
        const store = database.createObjectStore("athletes", { keyPath: "id" });
        store.createIndex("by-created-at", "createdAt");
      }

      if (!database.objectStoreNames.contains("facilities")) {
        const store = database.createObjectStore("facilities", { keyPath: "id" });
        store.createIndex("by-created-at", "createdAt");
      }

      if (!database.objectStoreNames.contains("trainings")) {
        const store = database.createObjectStore("trainings", {
          keyPath: "id",
        });

        store.createIndex("by-created-at", "createdAt");
        store.createIndex("by-date", "date");
        store.createIndex("by-athlete", "athleteId");
      }

      if (oldVersion < 15 && database.objectStoreNames.contains("trainings")) {
        const trainingStore = transaction.objectStore("trainings");
        const legacyTrainings = (await trainingStore.getAll()) as Array<
          TrainingRecord & { id?: string | number }
        >;

        for (const training of legacyTrainings) {
          const normalized = ensureTrainingId(training as TrainingRecord);

          if (normalized.id !== training.id) {
            await trainingStore.delete(training.id as string);
          }

          await trainingStore.put(normalized);
        }
      }

      if (oldVersion < 16 && database.objectStoreNames.contains("trainings")) {
        const trainingStore = transaction.objectStore("trainings");
        let cursor = await trainingStore.openCursor();

        while (cursor) {
          const training = cursor.value as TrainingRecord;
          const hangboard = training.protocol?.hangboard;

          if (hangboard?.some((set) => set.mode !== "intervals" && ("hangSeconds" in set || "restSeconds" in set))) {
            await cursor.update({
              ...training,
              protocol: {
                ...training.protocol,
                hangboard: hangboard.map(({ hangSeconds, restSeconds, ...set }) =>
                  set.mode === "intervals"
                    ? { ...set, hangSeconds, restSeconds }
                    : set,
                ),
              },
            });
          }

          cursor = await cursor.continue();
        }
      }

      if (oldVersion < 17 && database.objectStoreNames.contains("trainings")) {
        const trainingStore = transaction.objectStore("trainings");
        let cursor = await trainingStore.openCursor();

        while (cursor) {
          const training = cursor.value as TrainingRecord;

          if (training.attemptsCount !== 0) {
            await cursor.update({ ...training, attemptsCount: 0 });
          }

          cursor = await cursor.continue();
        }
      }

      if (oldVersion < 4 && database.objectStoreNames.contains("trainings")) {
        const trainingStore = transaction.objectStore("trainings");
        let cursor = await trainingStore.openCursor();

        while (cursor) {
          const legacyValue = cursor.value as TrainingRecord & {
            caloriesBurned?: number;
          };

          await cursor.update({
            ...legacyValue,
            caloriesBurned: legacyValue.caloriesBurned ?? 0,
          });

          cursor = await cursor.continue();
        }
      }

      if (oldVersion < 5 && database.objectStoreNames.contains("trainings")) {
        const trainingStore = transaction.objectStore("trainings");
        let cursor = await trainingStore.openCursor();

        while (cursor) {
          const legacyValue = cursor.value as TrainingRecord & {
            ageYears?: number;
          };

          await cursor.update({
            ...legacyValue,
            ageYears: legacyValue.ageYears ?? 0,
          });

          cursor = await cursor.continue();
        }
      }

      if (
        oldVersion < 8 &&
        database.objectStoreNames.contains("weightEntries")
      ) {
        const weightEntryStore = transaction.objectStore("weightEntries");
        let cursor = await weightEntryStore.openCursor();

        while (cursor) {
          const legacyValue = cursor.value as WeightEntryRecord & {
            time?: string;
          };

          await cursor.update({
            ...legacyValue,
            time: legacyValue.time ?? "09:00",
          });

          cursor = await cursor.continue();
        }
      }

      if (!database.objectStoreNames.contains("ascents")) {
        const store = database.createObjectStore("ascents", {
          autoIncrement: true,
          keyPath: "id",
        });

        store.createIndex("by-created-at", "createdAt");
        store.createIndex("by-date", "date");
        store.createIndex("by-source", "source");
        store.createIndex("by-athlete", "athleteId");
      }

      if (oldVersion < 3 && database.objectStoreNames.contains("ascents")) {
        const ascentStore = transaction.objectStore("ascents");
        let cursor = await ascentStore.openCursor();

        while (cursor) {
          const legacyValue = cursor.value as AscentRecord & { grade?: string };
          const fallbackGrade =
            legacyValue.suggestedGrade ??
            legacyValue.subjectiveGrade ??
            legacyValue.grade ??
            "";

          await cursor.update({
            ...legacyValue,
            suggestedGrade: legacyValue.suggestedGrade ?? fallbackGrade,
            subjectiveGrade: legacyValue.subjectiveGrade ?? fallbackGrade,
          });

          cursor = await cursor.continue();
        }
      }

      if (!database.objectStoreNames.contains("settings")) {
        const store = database.createObjectStore("settings", {
          keyPath: "key",
        });

        store.createIndex("by-updated-at", "updatedAt");
      }

      if (oldVersion < 7 && database.objectStoreNames.contains("settings")) {
        const settingsStore = transaction.objectStore("settings");
        let cursor = await settingsStore.openCursor();

        while (cursor) {
          const legacyValue = cursor.value as UserProfileRecord & {
            heightCm?: number | null;
          };

          await cursor.update({
            ...legacyValue,
            heightCm: legacyValue.heightCm ?? null,
          });

          cursor = await cursor.continue();
        }
      }

      if (!database.objectStoreNames.contains("weightEntries")) {
        const store = database.createObjectStore("weightEntries", {
          autoIncrement: true,
          keyPath: "id",
        });

        store.createIndex("by-created-at", "createdAt");
        store.createIndex("by-date", "date");
        store.createIndex("by-athlete", "athleteId");
      }

      if (oldVersion < 11) {
        const stores = [
          "climbs",
          "trainings",
          "ascents",
          "weightEntries",
        ] as const;

        for (const storeName of stores) {
          if (!database.objectStoreNames.contains(storeName)) {
            continue;
          }

          const store = transaction.objectStore(storeName);

          if (!store.indexNames.contains("by-athlete")) {
            store.createIndex("by-athlete", "athleteId");
          }

          let cursor = await store.openCursor();

          while (cursor) {
            const value = cursor.value as { athleteId?: string | null };

            if (!value.athleteId) {
              await cursor.update({ ...cursor.value, athleteId: "primary" });
            }

            cursor = await cursor.continue();
          }
        }
      }

      if (oldVersion > 0 && oldVersion < 9) {
        const athlete = {
          ...DEFAULT_ATHLETE,
          createdAt: new Date().toISOString(),
        };
        const athletesStore = transaction.objectStore("athletes");
        await athletesStore.put(athlete);

        const stores = [
          "climbs",
          "trainings",
          "ascents",
          "weightEntries",
        ] as const;

        for (const storeName of stores) {
          const store = transaction.objectStore(storeName);

          if (!store.indexNames.contains("by-athlete")) {
            store.createIndex("by-athlete", "athleteId");
          }

          let cursor = await store.openCursor();
          while (cursor) {
            await cursor.update({ ...cursor.value, athleteId: "primary" });
            cursor = await cursor.continue();
          }
        }

        const settingsStore = transaction.objectStore("settings");
        const legacyProfile = await settingsStore.get("primary");

        if (legacyProfile) {
          await settingsStore.put({
            ...legacyProfile,
            key: "athlete:primary",
            athleteId: "primary",
          });
          await settingsStore.delete("primary");
        }
      }

      if (
        oldVersion < 12 &&
        database.objectStoreNames.contains("trainings") &&
        database.objectStoreNames.contains("weightEntries")
      ) {
        const trainingStore = transaction.objectStore("trainings");
        const weightEntryStore = transaction.objectStore("weightEntries");
        const trainings = await trainingStore.getAll();
        const trainingWeightKeys = new Set(
          trainings.map((training) =>
            buildTrainingWeightSnapshotKey({
              athleteId: training.athleteId,
              date: training.date,
              time: training.time,
              weightKg: training.bodyWeightKg,
            }),
          ),
        );
        let cursor = await weightEntryStore.openCursor();

        while (cursor) {
          if (
            trainingWeightKeys.has(
              buildTrainingWeightSnapshotKey({
                athleteId: cursor.value.athleteId,
                date: cursor.value.date,
                time: cursor.value.time,
                weightKg: cursor.value.weightKg,
              }),
            )
          ) {
            await cursor.delete();
          }

          cursor = await cursor.continue();
        }
      }

      if (!database.objectStoreNames.contains("sections")) {
        const store = database.createObjectStore("sections", {
          keyPath: "id",
        });
        store.createIndex("by-created-at", "createdAt");
      }
    },
    blocking() {
      void resetDatabaseConnection();
    },
    terminated() {
      databasePromise = null;
    },
  });
}

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

export function getDatabase() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }

  databasePromise ??= createDatabase();
  return databasePromise;
}

export async function deleteClimberbookDatabase() {
  if (databasePromise) {
    const database = await databasePromise;
    database.close();
    databasePromise = null;
  }

  await deleteDB(DB_NAME);
}

export async function listClimbs() {
  const database = await getDatabase();
  return database.getAllFromIndex("climbs", "by-created-at");
}

export async function addClimb(input: Omit<ClimbRecord, "id" | "createdAt">) {
  const database = await getDatabase();

  await database.add("climbs", {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function listTrainings(athleteId: string) {
  const database = await getDatabase();
  const records = await database.getAllFromIndex(
    "trainings",
    "by-athlete",
    athleteId,
  );
  return ensureTrainingIds(records);
}

export async function listAllTrainings() {
  const database = await getDatabase();
  const records = await database.getAllFromIndex("trainings", "by-created-at");
  return ensureTrainingIds(records);
}

export async function addTraining(
  input: Omit<TrainingRecord, "id" | "createdAt">,
) {
  const database = await getDatabase();

  await database.add("trainings", {
    ...input,
    id: crypto.randomUUID(),
    sourceId: input.sourceId ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
}

export async function updateTraining(input: TrainingRecord) {
  const database = await getDatabase();

  if (!isUuid(input.id)) {
    throw new Error("Training id is required for update.");
  }

  await database.put("trainings", {
    ...input,
    sourceId: input.sourceId ?? crypto.randomUUID(),
  });
}

export async function deleteTraining(id: string) {
  const database = await getDatabase();
  await database.delete("trainings", id);
}

export async function listAscents(athleteId: string) {
  const database = await getDatabase();
  return database.getAllFromIndex("ascents", "by-athlete", athleteId);
}

export async function addAscent(input: Omit<AscentRecord, "id" | "createdAt">) {
  const database = await getDatabase();

  await database.add("ascents", {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function addAscents(
  inputs: Array<Omit<AscentRecord, "id" | "createdAt">>,
) {
  if (!inputs.length) return;

  const database = await getDatabase();
  const createdAt = new Date().toISOString();
  const transaction = database.transaction("ascents", "readwrite");

  await Promise.all(
    inputs.map((input) =>
      transaction.store.add({
        ...input,
        createdAt,
      }),
    ),
  );
  await transaction.done;
}

export async function deleteAscentsByImportSource(
  athleteId: string,
  importSource: NonNullable<AscentRecord["importSource"]>,
) {
  const database = await getDatabase();
  const transaction = database.transaction("ascents", "readwrite");
  let cursor = await transaction.store
    .index("by-athlete")
    .openCursor(athleteId);

  while (cursor) {
    if (cursor.value.importSource === importSource) {
      await cursor.delete();
    }

    cursor = await cursor.continue();
  }

  await transaction.done;
}

export async function updateAscent(
  input: Omit<AscentRecord, "createdAt"> & { id: number },
) {
  const database = await getDatabase();
  const existing = await database.get("ascents", input.id);

  if (!existing) {
    throw new Error("Ascent not found");
  }

  await database.put("ascents", {
    ...existing,
    ...input,
    createdAt: existing.createdAt,
  });
}

export async function getUserProfile(athleteId: string) {
  const database = await getDatabase();
  const record = await database.get("settings", `athlete:${athleteId}`);

  return (
    record ?? {
      ...createEmptyUserProfile(),
      key: `athlete:${athleteId}`,
      athleteId,
    }
  );
}

export async function saveUserProfile(
  input: Omit<UserProfileRecord, "updatedAt">,
) {
  const database = await getDatabase();

  await database.put("settings", {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function listWeightEntries(athleteId: string) {
  const database = await getDatabase();
  const entries = await database.getAllFromIndex(
    "weightEntries",
    "by-athlete",
    athleteId,
  );
  return entries.map((entry) => ({ ...entry, time: entry.time ?? "09:00" }));
}

export async function listAllWeightEntries() {
  const database = await getDatabase();
  const entries = await database.getAllFromIndex(
    "weightEntries",
    "by-created-at",
  );
  return entries.map((entry) => ({ ...entry, time: entry.time ?? "09:00" }));
}

export async function listUserProfiles() {
  const database = await getDatabase();
  return database.getAll("settings");
}

export async function listAthletes() {
  const database = await getDatabase();
  const records = await database.getAllFromIndex("athletes", "by-created-at");
  return ensureAthleteSourceIds(records);
}

export async function addAthlete(input: AthleteInput) {
  const database = await getDatabase();
  const athleteId = crypto.randomUUID();
  const athlete: AthleteRecord = {
    id: athleteId,
    sourceId: athleteId,
    name: computeAthleteName(input),
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    nick: input.nick?.trim() ?? "",
    sectionId: input.sectionId ?? null,
    createdAt: new Date().toISOString(),
  };

  await database.add("athletes", athlete);
  return athlete;
}

export async function updateAthlete(id: string, input: AthleteInput) {
  const database = await getDatabase();
  const existing = await database.get("athletes", id);

  if (!existing) {
    throw new Error("Nie znaleziono zawodnika do edycji.");
  }

  await database.put("athletes", {
    ...existing,
    sourceId: existing.sourceId ?? existing.id,
    name: computeAthleteName(input),
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    nick: input.nick?.trim() ?? "",
    sectionId: input.sectionId ?? null,
  });
}

export async function listSections() {
  const database = await getDatabase();
  const records = await database.getAllFromIndex("sections", "by-created-at");
  return ensureSectionSourceIds(records);
}

export async function listFacilities() {
  const database = await getDatabase();
  return database.getAllFromIndex("facilities", "by-created-at");
}

export async function addFacility(name: string) {
  const database = await getDatabase();
  const facility: FacilityRecord = {
    id: crypto.randomUUID(),
    name: name.trim() || "Obiekt",
    createdAt: new Date().toISOString(),
  };

  await database.add("facilities", facility);
  return facility;
}

export async function deleteFacility(id: string) {
  const database = await getDatabase();
  await database.delete("facilities", id);
}

export async function addSection(name: string) {
  const database = await getDatabase();
  const sectionId = crypto.randomUUID();
  const section: SectionRecord = {
    id: sectionId,
    sourceId: sectionId,
    name: name.trim() || "Sekcja",
    createdAt: new Date().toISOString(),
  };

  await database.add("sections", section);
  return section;
}

export async function updateSection(id: string, name: string) {
  const database = await getDatabase();
  const existing = await database.get("sections", id);

  if (!existing) {
    throw new Error("Nie znaleziono sekcji do edycji.");
  }

  await database.put("sections", {
    ...existing,
    sourceId: existing.sourceId ?? existing.id,
    name: name.trim() || "Sekcja",
  });
}

export async function deleteSection(id: string) {
  const database = await getDatabase();
  const transaction = database.transaction(
    ["sections", "athletes"],
    "readwrite",
  );

  await transaction.objectStore("sections").delete(id);

  const athletesStore = transaction.objectStore("athletes");
  let cursor = await athletesStore.openCursor();

  while (cursor) {
    if (cursor.value.sectionId === id) {
      await cursor.update({ ...cursor.value, sectionId: null });
    }
    cursor = await cursor.continue();
  }

  await transaction.done;
}

export async function assignAthleteToSection(
  athleteId: string,
  sectionId: string | null,
) {
  const database = await getDatabase();
  const existing = await database.get("athletes", athleteId);

  if (!existing) {
    throw new Error("Nie znaleziono zawodnika.");
  }

  await database.put("athletes", { ...existing, sectionId });
}

export async function deleteAthlete(id: string) {
  const database = await getDatabase();
  const transaction = database.transaction(
    ["athletes", "climbs", "trainings", "ascents", "weightEntries", "settings"],
    "readwrite",
  );

  await transaction.objectStore("athletes").delete(id);
  await transaction.objectStore("settings").delete(`athlete:${id}`);

  for (const storeName of [
    "climbs",
    "trainings",
    "ascents",
    "weightEntries",
  ] as const) {
    const index = transaction.objectStore(storeName).index("by-athlete");
    let cursor = await index.openCursor(id);

    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }

  await transaction.done;
}

export async function addWeightEntry(
  input: Omit<WeightEntryRecord, "id" | "createdAt">,
) {
  const database = await getDatabase();

  await database.add("weightEntries", {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function updateWeightEntry(entry: WeightEntryRecord) {
  if (entry.id === undefined) return;

  const database = await getDatabase();
  await database.put("weightEntries", entry);
}

function asRecordArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Nieprawidłowy backup: ${label} musi być listą.`);
  }

  return value as T[];
}

function normalizeImportedProfile(value: unknown): UserProfileRecord {
  if (!value || typeof value !== "object") {
    throw new Error("Nieprawidłowy backup: brakuje profilu użytkownika.");
  }

  const profile = value as Partial<UserProfileRecord>;

  return {
    key: "primary",
    athleteId: profile.athleteId ?? "primary",
    birthDate: profile.birthDate ?? "",
    sex: profile.sex ?? "",
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
  };
}

export async function deleteWeightEntry(id: number) {
  const database = await getDatabase();

  await database.delete("weightEntries", id);
}

export async function exportDatabaseBackup(
  athleteId: string,
): Promise<ClimberbookDatabaseBackup> {
  const [climbs, trainings, ascents, profile, weightEntries] =
    await Promise.all([
      listClimbs(),
      listTrainings(athleteId),
      listAscents(athleteId),
      getUserProfile(athleteId),
      listWeightEntries(athleteId),
    ]);
  const database = await getDatabase();
  const athleteRecord = await database.get("athletes", athleteId);
  const athlete = athleteRecord ? ensureAthleteSourceId(athleteRecord) : null;

  if (athlete && athlete !== athleteRecord) {
    await database.put("athletes", athlete);
  }

  if (!athlete) {
    throw new Error("Nie znaleziono zawodnika do eksportu.");
  }

  return {
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    trainingDataDisclaimer: TRAINING_DATA_DISCLAIMER,
    athlete,
    climbs: climbs.filter((climb) => climb.athleteId === athleteId),
    trainings,
    ascents,
    profile,
    weightEntries,
  };
}

export async function exportFullDatabaseBackup(): Promise<ClimberbookFullDatabaseBackup> {
  const [
    athletes,
    sections,
    facilities,
    climbs,
    trainings,
    ascents,
    profiles,
    weightEntries,
  ] = await Promise.all([
    listAthletes(),
    listSections(),
    listFacilities(),
    listClimbs(),
    listAllTrainings(),
    getDatabase().then((database) =>
      database.getAllFromIndex("ascents", "by-created-at"),
    ),
    listUserProfiles(),
    listAllWeightEntries(),
  ]);

  return {
    formatVersion: 3,
    exportedAt: new Date().toISOString(),
    trainingDataDisclaimer: TRAINING_DATA_DISCLAIMER,
    athletes: await ensureAthleteSourceIds(athletes),
    sections: await ensureSectionSourceIds(sections),
    facilities,
    climbs,
    trainings: await ensureTrainingIds(trainings),
    ascents,
    profiles,
    weightEntries,
  };
}

export async function inspectDatabaseBackup(
  value: unknown,
): Promise<DatabaseImportPreview> {
  if (!value || typeof value !== "object") {
    throw new Error("Nieprawidłowy plik backupu.");
  }

  const backup = value as {
    formatVersion?: number;
    athlete?: AthleteRecord;
    athletes?: AthleteRecord[];
    sections?: SectionRecord[];
    facilities?: FacilityRecord[];
    climbs?: ClimbRecord[];
    trainings?: TrainingRecord[];
    ascents?: AscentRecord[];
    profile?: unknown;
    profiles?: UserProfileRecord[];
    weightEntries?: WeightEntryRecord[];
  };

  if (
    backup.formatVersion !== 1 &&
    backup.formatVersion !== 2 &&
    backup.formatVersion !== 3
  ) {
    throw new Error("Nieobsługiwana wersja backupu.");
  }

  if (backup.formatVersion === 3) {
    const athletes = asRecordArray<AthleteRecord>(backup.athletes, "athletes");
    const sections = backup.sections
      ? asRecordArray<SectionRecord>(backup.sections, "sections")
      : [];
    const facilities = backup.facilities
      ? asRecordArray<FacilityRecord>(backup.facilities, "facilities")
      : [];
    const climbs = asRecordArray<ClimbRecord>(backup.climbs, "climbs");
    const trainings = asRecordArray<TrainingRecord>(
      backup.trainings,
      "trainings",
    ).map(ensureTrainingId);
    const ascents = asRecordArray<AscentRecord>(backup.ascents, "ascents");
    const profiles = asRecordArray<UserProfileRecord>(
      backup.profiles,
      "profiles",
    );
    const weightEntries = removeTrainingDerivedWeightEntries(
      trainings,
      asRecordArray<WeightEntryRecord>(backup.weightEntries, "weightEntries"),
    );

    return {
      formatVersion: 3,
      kind: "full",
      title: "Pełny import bazy",
      summary:
        "Ten import wyczyści obecną lokalną bazę i odtworzy ją dokładnie z pliku backupu.",
      actionLabel: "Zastąpi całą lokalną bazę danych.",
      counts: {
        athletes: athletes.length,
        sections: sections.length,
        climbs: climbs.length,
        trainings: trainings.length,
        ascents: ascents.length,
        profiles: profiles.length,
        weightEntries: weightEntries.length,
      },
    };
  }

  const backupAthlete = backup.athlete as AthleteRecord | undefined;

  if (
    backup.formatVersion === 2 &&
    (!backupAthlete?.id || !backupAthlete.name)
  ) {
    throw new Error("Nieprawidłowy backup: brakuje zawodnika.");
  }

  const climbs = asRecordArray<ClimbRecord>(backup.climbs, "climbs");
  const trainings = asRecordArray<TrainingRecord>(
    backup.trainings,
    "trainings",
  ).map(ensureTrainingId);
  const ascents = asRecordArray<AscentRecord>(backup.ascents, "ascents");
  const weightEntries = removeTrainingDerivedWeightEntries(
    trainings,
    asRecordArray<WeightEntryRecord>(backup.weightEntries, "weightEntries"),
  );
  normalizeImportedProfile(backup.profile);
  const importedAthleteSourceId =
    getStableSourceId(backupAthlete) ?? crypto.randomUUID();
  const athletes = await listAthletes();
  const matchedAthlete = athletes.find(
    (athlete) => getStableSourceId(athlete) === importedAthleteSourceId,
  );

  return {
    formatVersion: backup.formatVersion,
    kind: "athlete",
    title: "Import zawodnika",
    summary: matchedAthlete
      ? "Ten import nadpisze dane wcześniej zaimportowanego zawodnika o tym samym sourceId."
      : "Ten import utworzy nowego zawodnika i doda jego dane do lokalnej bazy.",
    actionLabel: matchedAthlete
      ? `Nadpisze zawodnika ${matchedAthlete.name}.`
      : "Utworzy nowego zawodnika.",
    athleteName:
      backupAthlete?.name?.trim() ||
      backupAthlete?.nick?.trim() ||
      "Zaimportowany zawodnik",
    counts: {
      athletes: 1,
      sections: 0,
      climbs: climbs.length,
      trainings: trainings.length,
      ascents: ascents.length,
      profiles: 1,
      weightEntries: weightEntries.length,
    },
  };
}

export async function importDatabaseBackup(
  value: unknown,
): Promise<AthleteRecord | null> {
  if (!value || typeof value !== "object") {
    throw new Error("Nieprawidłowy plik backupu.");
  }

  const backup = value as {
    formatVersion?: number;
    athlete?: AthleteRecord;
    athletes?: AthleteRecord[];
    sections?: SectionRecord[];
    facilities?: FacilityRecord[];
    climbs?: ClimbRecord[];
    trainings?: TrainingRecord[];
    ascents?: AscentRecord[];
    profile?: unknown;
    profiles?: UserProfileRecord[];
    weightEntries?: WeightEntryRecord[];
  };

  if (
    backup.formatVersion !== 1 &&
    backup.formatVersion !== 2 &&
    backup.formatVersion !== 3
  ) {
    throw new Error("Nieobsługiwana wersja backupu.");
  }

  if (backup.formatVersion === 3) {
    const athletes = asRecordArray<AthleteRecord>(backup.athletes, "athletes");
    const sections = backup.sections
      ? asRecordArray<SectionRecord>(backup.sections, "sections")
      : [];
    const facilities = backup.facilities
      ? asRecordArray<FacilityRecord>(backup.facilities, "facilities")
      : [];
    const climbs = asRecordArray<ClimbRecord>(backup.climbs, "climbs");
    const trainings = asRecordArray<TrainingRecord>(
      backup.trainings,
      "trainings",
    );
    const ascents = asRecordArray<AscentRecord>(backup.ascents, "ascents");
    const profiles = asRecordArray<UserProfileRecord>(
      backup.profiles,
      "profiles",
    );
    const weightEntries = removeTrainingDerivedWeightEntries(
      trainings,
      asRecordArray<WeightEntryRecord>(backup.weightEntries, "weightEntries"),
    );
    await withDatabaseRetry(async (database) => {
      const transaction = database.transaction(
        [
          "climbs",
          "trainings",
          "ascents",
          "settings",
          "weightEntries",
          "athletes",
          "sections",
          "facilities",
        ] as const,
        "readwrite",
      );
      const requests = [
        transaction.objectStore("climbs").clear(),
        transaction.objectStore("trainings").clear(),
        transaction.objectStore("ascents").clear(),
        transaction.objectStore("settings").clear(),
        transaction.objectStore("weightEntries").clear(),
        transaction.objectStore("athletes").clear(),
        transaction.objectStore("sections").clear(),
        transaction.objectStore("facilities").clear(),
        ...athletes.map((record) =>
          transaction.objectStore("athletes").put(record),
        ),
        ...sections.map((record) =>
          transaction.objectStore("sections").put(record),
        ),
        ...facilities.map((record) =>
          transaction.objectStore("facilities").put(record),
        ),
        ...climbs.map((record) =>
          transaction.objectStore("climbs").put(record),
        ),
        ...trainings.map((record) =>
          transaction.objectStore("trainings").put(record),
        ),
        ...ascents.map((record) =>
          transaction.objectStore("ascents").put(record),
        ),
        ...profiles.map((record) =>
          transaction.objectStore("settings").put(record),
        ),
        ...weightEntries.map((record) =>
          transaction.objectStore("weightEntries").put({
            ...record,
            time: record.time ?? "09:00",
          }),
        ),
      ];

      await Promise.all(requests);
      await transaction.done;
    });
    return null;
  }

  const backupAthlete = backup.athlete as AthleteRecord | undefined;
  if (
    backup.formatVersion === 2 &&
    (!backupAthlete?.id || !backupAthlete.name)
  ) {
    throw new Error("Nieprawidłowy backup: brakuje zawodnika.");
  }
  const importedAthleteSourceId =
    getStableSourceId(backupAthlete) ?? crypto.randomUUID();
  const climbs = asRecordArray<ClimbRecord>(backup.climbs, "climbs");
  const trainings = asRecordArray<TrainingRecord>(
    backup.trainings,
    "trainings",
  );
  const ascents = asRecordArray<AscentRecord>(backup.ascents, "ascents");
  const weightEntries = removeTrainingDerivedWeightEntries(
    trainings,
    asRecordArray<WeightEntryRecord>(backup.weightEntries, "weightEntries"),
  );
  const withoutGeneratedId = <T extends { id?: string | number }>(record: T) => {
    const { id: _id, ...rest } = record;
    return rest;
  };
  let importedAthleteId: string | null = null;
  let importedAthlete: AthleteRecord | null = null;

  await withDatabaseRetry(async (database) => {
    const transaction = database.transaction(
      [
        "athletes",
        "climbs",
        "trainings",
        "ascents",
        "settings",
        "weightEntries",
      ] as const,
      "readwrite",
    );

    const athletesStore = transaction.objectStore("athletes");
    let athleteCursor = await athletesStore.openCursor();

    while (athleteCursor) {
      if (getStableSourceId(athleteCursor.value) === importedAthleteSourceId) {
        importedAthleteId = athleteCursor.value.id;
        break;
      }

      athleteCursor = await athleteCursor.continue();
    }

    importedAthleteId ??= crypto.randomUUID();
    const targetAthleteId = importedAthleteId;

    const athlete: AthleteRecord = {
      id: targetAthleteId,
      sourceId: importedAthleteSourceId,
      name: backupAthlete?.name?.trim() || "Zaimportowany zawodnik",
      firstName: backupAthlete?.firstName?.trim() ?? "",
      lastName: backupAthlete?.lastName?.trim() ?? "",
      nick: backupAthlete?.nick?.trim() ?? "",
      sectionId: backupAthlete?.sectionId ?? null,
      createdAt: backupAthlete?.createdAt || new Date().toISOString(),
    };
    importedAthlete = athlete;
    const profile = {
      ...normalizeImportedProfile(backup.profile),
      key: `athlete:${targetAthleteId}`,
      athleteId: targetAthleteId,
    };

    await transaction.objectStore("athletes").delete(targetAthleteId);
    await transaction
      .objectStore("settings")
      .delete(`athlete:${targetAthleteId}`);

    for (const storeName of [
      "climbs",
      "trainings",
      "ascents",
      "weightEntries",
    ] as const) {
      const index = transaction.objectStore(storeName).index("by-athlete");
      let cursor = await index.openCursor(targetAthleteId);

      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }

    const requests = [
      transaction.objectStore("athletes").put({
        ...athlete,
      }),
      ...climbs.map((record) =>
        transaction.objectStore("climbs").put({
          ...withoutGeneratedId(record),
          athleteId: targetAthleteId,
        }),
      ),
      ...trainings.map((record) =>
        transaction.objectStore("trainings").put({
          ...ensureTrainingId(record),
          athleteId: targetAthleteId,
        }),
      ),
      ...ascents.map((record) =>
        transaction.objectStore("ascents").put({
          ...withoutGeneratedId(record),
          athleteId: targetAthleteId,
        }),
      ),
      transaction.objectStore("settings").put(profile),
      ...weightEntries.map((record) =>
        transaction.objectStore("weightEntries").put({
          ...withoutGeneratedId(record),
          athleteId: targetAthleteId,
          time: record.time ?? "09:00",
        }),
      ),
    ];

    await Promise.all(requests);
    await transaction.done;
  });

  return importedAthlete;
}
