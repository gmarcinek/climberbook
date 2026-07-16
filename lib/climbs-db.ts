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

export type TrainingRecord = {
  id?: number;
  athleteId: string;
  date: string;
  time: string;
  durationMinutes: number;
  bodyWeightKg: number;
  ageYears: number;
  caloriesBurned: number;
  attemptsCount: number;
  difficultyNotes: string;
  wellbeing: string;
  surfaces: TrainingSurface[];
  notes: string;
  createdAt: string;
};

export type AscentRecord = {
  id?: number;
  athleteId: string;
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  notes: string;
  createdAt: string;
};

export type AthleteRecord = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  nick?: string;
  sectionId?: string | null;
  createdAt: string;
};

export type SectionRecord = {
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

export type ClimberbookDatabaseBackup = {
  formatVersion: 2;
  exportedAt: string;
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
  athletes: AthleteRecord[];
  climbs: ClimbRecord[];
  trainings: TrainingRecord[];
  ascents: AscentRecord[];
  profiles: UserProfileRecord[];
  weightEntries: WeightEntryRecord[];
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
    key: number;
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
}

const DB_NAME = "climberbook";
const DB_VERSION = 10;
const DEFAULT_ATHLETE: AthleteRecord = {
  id: "primary",
  name: "Ja",
  createdAt: "",
};
let databasePromise: Promise<IDBPDatabase<ClimberbookDb>> | null = null;

function createDatabase() {
  return openDB<ClimberbookDb>(DB_NAME, DB_VERSION, {
    async upgrade(database, oldVersion, _newVersion, transaction) {
      if (!database.objectStoreNames.contains("climbs")) {
        const store = database.createObjectStore("climbs", {
          autoIncrement: true,
          keyPath: "id",
        });

        store.createIndex("by-created-at", "createdAt");
      }

      if (!database.objectStoreNames.contains("athletes")) {
        const store = database.createObjectStore("athletes", { keyPath: "id" });
        store.createIndex("by-created-at", "createdAt");
      }

      if (!database.objectStoreNames.contains("trainings")) {
        const store = database.createObjectStore("trainings", {
          autoIncrement: true,
          keyPath: "id",
        });

        store.createIndex("by-created-at", "createdAt");
        store.createIndex("by-date", "date");
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

      if (!database.objectStoreNames.contains("sections")) {
        const store = database.createObjectStore("sections", {
          keyPath: "id",
        });
        store.createIndex("by-created-at", "createdAt");
      }
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
  return database.getAllFromIndex("trainings", "by-athlete", athleteId);
}

export async function listAllTrainings() {
  const database = await getDatabase();
  return database.getAllFromIndex("trainings", "by-created-at");
}

export async function addTraining(
  input: Omit<TrainingRecord, "id" | "createdAt">,
) {
  const database = await getDatabase();

  await database.add("trainings", {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function updateTraining(input: TrainingRecord) {
  const database = await getDatabase();

  if (input.id === undefined) {
    throw new Error("Training id is required for update.");
  }

  await database.put("trainings", input);
}

export async function deleteTraining(id: number) {
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
  return database.getAllFromIndex("athletes", "by-created-at");
}

export async function addAthlete(input: AthleteInput) {
  const database = await getDatabase();
  const athlete: AthleteRecord = {
    id: crypto.randomUUID(),
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
    name: computeAthleteName(input),
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    nick: input.nick?.trim() ?? "",
    sectionId: input.sectionId ?? null,
  });
}

export async function listSections() {
  const database = await getDatabase();
  return database.getAllFromIndex("sections", "by-created-at");
}

export async function addSection(name: string) {
  const database = await getDatabase();
  const section: SectionRecord = {
    id: crypto.randomUUID(),
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
    ["athletes", "trainings", "ascents", "weightEntries", "settings"],
    "readwrite",
  );

  await transaction.objectStore("athletes").delete(id);
  await transaction.objectStore("settings").delete(`athlete:${id}`);

  for (const storeName of ["trainings", "ascents", "weightEntries"] as const) {
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
  const athlete = await database.get("athletes", athleteId);

  if (!athlete) {
    throw new Error("Nie znaleziono zawodnika do eksportu.");
  }

  return {
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    athlete,
    climbs: climbs.filter((climb) => climb.athleteId === athleteId),
    trainings,
    ascents,
    profile,
    weightEntries,
  };
}

export async function exportFullDatabaseBackup(): Promise<ClimberbookFullDatabaseBackup> {
  const [athletes, climbs, trainings, ascents, profiles, weightEntries] =
    await Promise.all([
      listAthletes(),
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
    athletes,
    climbs,
    trainings,
    ascents,
    profiles,
    weightEntries,
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
    const weightEntries = asRecordArray<WeightEntryRecord>(
      backup.weightEntries,
      "weightEntries",
    );
    const database = await getDatabase();
    const transaction = database.transaction(
      [
        "climbs",
        "trainings",
        "ascents",
        "settings",
        "weightEntries",
        "athletes",
      ],
      "readwrite",
    );
    const requests = [
      transaction.objectStore("climbs").clear(),
      transaction.objectStore("trainings").clear(),
      transaction.objectStore("ascents").clear(),
      transaction.objectStore("settings").clear(),
      transaction.objectStore("weightEntries").clear(),
      transaction.objectStore("athletes").clear(),
      ...athletes.map((record) =>
        transaction.objectStore("athletes").put(record),
      ),
      ...climbs.map((record) => transaction.objectStore("climbs").put(record)),
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
    return null;
  }

  const backupAthlete = backup.athlete as AthleteRecord | undefined;
  if (
    backup.formatVersion === 2 &&
    (!backupAthlete?.id || !backupAthlete.name)
  ) {
    throw new Error("Nieprawidłowy backup: brakuje zawodnika.");
  }
  const importedAthleteId = crypto.randomUUID();
  const athlete: AthleteRecord = {
    id: importedAthleteId,
    name: backupAthlete?.name
      ? `${backupAthlete.name} (import)`
      : "Zaimportowany zawodnik",
    createdAt: new Date().toISOString(),
  };
  const climbs = asRecordArray<ClimbRecord>(backup.climbs, "climbs");
  const trainings = asRecordArray<TrainingRecord>(
    backup.trainings,
    "trainings",
  );
  const ascents = asRecordArray<AscentRecord>(backup.ascents, "ascents");
  const weightEntries = asRecordArray<WeightEntryRecord>(
    backup.weightEntries,
    "weightEntries",
  );
  const profile = {
    ...normalizeImportedProfile(backup.profile),
    key: `athlete:${importedAthleteId}`,
    athleteId: importedAthleteId,
  };
  const database = await getDatabase();
  const transaction = database.transaction(
    ["climbs", "trainings", "ascents", "settings", "weightEntries", "athletes"],
    "readwrite",
  );
  const requests = [
    transaction.objectStore("athletes").put({
      ...athlete,
    }),
    ...climbs.map((record) =>
      transaction
        .objectStore("climbs")
        .put({ ...record, id: undefined, athleteId: importedAthleteId }),
    ),
    ...trainings.map((record) =>
      transaction
        .objectStore("trainings")
        .put({ ...record, id: undefined, athleteId: importedAthleteId }),
    ),
    ...ascents.map((record) =>
      transaction
        .objectStore("ascents")
        .put({ ...record, id: undefined, athleteId: importedAthleteId }),
    ),
    transaction.objectStore("settings").put(profile),
    ...weightEntries.map((record) =>
      transaction.objectStore("weightEntries").put({
        ...record,
        id: undefined,
        athleteId: importedAthleteId,
        time: record.time ?? "09:00",
      }),
    ),
  ];

  await Promise.all(requests);
  await transaction.done;

  return athlete;
}
