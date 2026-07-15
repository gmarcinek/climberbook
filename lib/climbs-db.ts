import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type ClimbRecord = {
  id?: number;
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
  | "campus";

export type UserSex = "" | "kobieta" | "mezczyzna" | "inna";

export type UserProfileRecord = {
  key: "primary";
  birthDate: string;
  sex: UserSex;
  heightCm: number | null;
  weightKg: number | null;
  updatedAt: string;
};

export type WeightEntryRecord = {
  id?: number;
  date: string;
  weightKg: number;
  createdAt: string;
};

export type TrainingRecord = {
  id?: number;
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
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  notes: string;
  createdAt: string;
};

interface ClimberbookDb extends DBSchema {
  climbs: {
    key: number;
    value: ClimbRecord;
    indexes: {
      "by-created-at": string;
    };
  };
  trainings: {
    key: number;
    value: TrainingRecord;
    indexes: {
      "by-created-at": string;
      "by-date": string;
    };
  };
  ascents: {
    key: number;
    value: AscentRecord;
    indexes: {
      "by-created-at": string;
      "by-date": string;
      "by-source": string;
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
    };
  };
}

const DB_NAME = "climberbook";
const DB_VERSION = 7;
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
    },
  });
}

export function createEmptyUserProfile(): UserProfileRecord {
  return {
    key: "primary",
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

export async function listTrainings() {
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

export async function listAscents() {
  const database = await getDatabase();
  return database.getAllFromIndex("ascents", "by-created-at");
}

export async function addAscent(input: Omit<AscentRecord, "id" | "createdAt">) {
  const database = await getDatabase();

  await database.add("ascents", {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function getUserProfile() {
  const database = await getDatabase();
  const record = await database.get("settings", "primary");

  return record ?? createEmptyUserProfile();
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

export async function listWeightEntries() {
  const database = await getDatabase();
  return database.getAllFromIndex("weightEntries", "by-created-at");
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
