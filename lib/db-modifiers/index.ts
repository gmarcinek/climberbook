import { moveTrainingWeightToWeightEntries } from "./019-move-training-weight-to-weight-entries";

export const databaseModifiers = {
  19: moveTrainingWeightToWeightEntries,
} as const;
