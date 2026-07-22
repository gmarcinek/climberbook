import type { IDBPTransaction } from "idb";
import type {
  ClimberbookDb,
  TrainingRecord,
  WeightEntryRecord,
} from "@/lib/climbs-db";

type ClimberbookStoreName =
  | "climbs"
  | "trainings"
  | "ascents"
  | "settings"
  | "weightEntries"
  | "athletes"
  | "sections"
  | "facilities";

function buildWeightSnapshotKey(input: {
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

export async function moveTrainingWeightToWeightEntries(
  transaction: IDBPTransaction<
    ClimberbookDb,
    Array<ClimberbookStoreName>,
    "versionchange"
  >,
) {
  const trainingStore = transaction.objectStore("trainings");
  const weightEntryStore = transaction.objectStore("weightEntries");
  const existingWeightKeys = new Set(
    (await weightEntryStore.getAll()).map((entry) =>
      buildWeightSnapshotKey({
        athleteId: entry.athleteId,
        date: entry.date,
        time: entry.time,
        weightKg: entry.weightKg,
      }),
    ),
  );
  let cursor = await trainingStore.openCursor();

  while (cursor) {
    const training = cursor.value as TrainingRecord;

    if (typeof training.bodyWeightKg === "number") {
      const weightKey = buildWeightSnapshotKey({
        athleteId: training.athleteId,
        date: training.date,
        time: training.time,
        weightKg: training.bodyWeightKg,
      });

      if (!existingWeightKeys.has(weightKey)) {
        const weightEntry: Omit<WeightEntryRecord, "id"> = {
          athleteId: training.athleteId,
          date: training.date,
          time: training.time || "09:00",
          weightKg: training.bodyWeightKg,
          createdAt: training.createdAt,
        };
        await weightEntryStore.add(weightEntry);
        existingWeightKeys.add(weightKey);
      }

      const { bodyWeightKg: _bodyWeightKg, ...withoutBodyWeight } = training;
      await cursor.update(withoutBodyWeight);
    }

    cursor = await cursor.continue();
  }
}
