import { roundToSingleDecimal } from "@/components/climberbook/common/training";
import { formatDateIso } from "@/components/training-calendar/training-calendar.helpers";
import {
  createTrainingExportMetadata,
  type ClimberbookFullDatabaseBackup,
} from "@/lib/climbs-db";

type TrainingSeed = {
  athleteId: string;
  dayOffset: number;
  time: string;
  durationMinutes: number;
  bodyWeightKg: number;
  ageYears: number;
  caloriesBurned: number;
  attemptsCount: number;
  difficultyNotes: string;
  difficultyBySurface?: ClimberbookFullDatabaseBackup["trainings"][number]["difficultyBySurface"];
  wellbeing: string;
  surfaces: ClimberbookFullDatabaseBackup["trainings"][number]["surfaces"];
  customSessionType?: string;
  notes: string;
  createdHour: number;
  createdMinute: number;
  sourceId: string;
};

function shiftDateWithinCurrentMonth(dayOfMonth: number, fallbackOffset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(
    Math.max(dayOfMonth + fallbackOffset, 1),
    lastDayOfMonth,
  );

  return new Date(year, month, safeDay, 12, 0, 0, 0);
}

function buildDateFromOffset(dayOffset: number) {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    12,
    0,
    0,
    0,
  );
  const currentMonth = now.getMonth();

  if (target.getMonth() !== currentMonth) {
    const fallbackDay = Math.max(1, now.getDate() + dayOffset);
    return shiftDateWithinCurrentMonth(fallbackDay - now.getDate(), 0);
  }

  return target;
}

function buildCreatedAt(date: Date, hour: number, minute: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  ).toISOString();
}

const trainingSeeds: TrainingSeed[] = [
  {
    athleteId: "primary",
    dayOffset: -7,
    time: "18:00",
    durationMinutes: 100,
    bodyWeightKg: 74.2,
    ageYears: 42,
    caloriesBurned: 600,
    attemptsCount: 6,
    difficultyNotes: "",
    difficultyBySurface: { moon: "V5, V5, V5, V5, V4, V3" },
    wellbeing: "",
    surfaces: ["moon", "spraywall"],
    notes: "",
    createdHour: 19,
    createdMinute: 9,
    sourceId: "9fdf50f2-c4d2-4ac5-b2ee-2f8b631a12a1",
  },
  {
    athleteId: "primary",
    dayOffset: -1,
    time: "19:00",
    durationMinutes: 160,
    bodyWeightKg: 73.3,
    ageYears: 42,
    caloriesBurned: 969,
    attemptsCount: 4,
    difficultyNotes: "6b, 6b+, 7c, 7b",
    wellbeing: "",
    surfaces: ["lina", "chwytotablica"],
    notes: "duszno było i 27 stopni",
    createdHour: 20,
    createdMinute: 26,
    sourceId: "ee9a17fb-39f0-40d6-a383-d5b416ff3910",
  },
  {
    athleteId: "primary",
    dayOffset: -3,
    time: "19:00",
    durationMinutes: 120,
    bodyWeightKg: 73.7,
    ageYears: 42,
    caloriesBurned: 809,
    attemptsCount: 5,
    difficultyNotes: "6a, 6c, 7c+, 7c, 7a",
    wellbeing: "sauna",
    surfaces: ["lina"],
    notes: "było jak na saunie, wszystko szło źle i gorzej",
    createdHour: 20,
    createdMinute: 27,
    sourceId: "307fbf85-a39f-42c3-a9fd-94b0cc4b1b86",
  },
  {
    athleteId: "primary",
    dayOffset: -2,
    time: "17:45",
    durationMinutes: 60,
    bodyWeightKg: 73.7,
    ageYears: 42,
    caloriesBurned: 350,
    attemptsCount: 0,
    difficultyNotes: "",
    wellbeing: "",
    surfaces: ["spraywall"],
    notes:
      "kapilara na obwodach rozgrzewka na siłowni + lekkie obwody po klamach 1x 15min, 1x 10min l",
    createdHour: 20,
    createdMinute: 29,
    sourceId: "32ce6305-7707-4403-8ccc-1945b90f9890",
  },
  {
    athleteId: "primary",
    dayOffset: -5,
    time: "19:00",
    durationMinutes: 113,
    bodyWeightKg: 73.7,
    ageYears: 42,
    caloriesBurned: 569,
    attemptsCount: 5,
    difficultyNotes: "",
    wellbeing: "",
    surfaces: ["campus", "spraywall"],
    notes: "",
    createdHour: 20,
    createdMinute: 30,
    sourceId: "c344caaf-a496-4620-bbca-1fde1cc356c7",
  },
  {
    athleteId: "primary",
    dayOffset: -8,
    time: "19:00",
    durationMinutes: 120,
    bodyWeightKg: 73.7,
    ageYears: 42,
    caloriesBurned: 809,
    attemptsCount: 5,
    difficultyNotes: "6a+, 6c, 6b+, 7c, 7a+",
    wellbeing: "",
    surfaces: ["lina"],
    notes: "",
    createdHour: 20,
    createdMinute: 32,
    sourceId: "8de0e32f-f0e3-4dad-9e6b-d865d65d57c6",
  },
  {
    athleteId: "primary",
    dayOffset: -10,
    time: "19:00",
    durationMinutes: 113,
    bodyWeightKg: 73.7,
    ageYears: 42,
    caloriesBurned: 710,
    attemptsCount: 5,
    difficultyNotes: "7a, 7c, 7b, 6a+, 6b",
    wellbeing: "",
    surfaces: ["lina"],
    notes: "",
    createdHour: 20,
    createdMinute: 33,
    sourceId: "993444c8-3346-44f8-817b-04220bacd735",
  },
  {
    athleteId: "322dd89b-1d62-4a2b-b10d-8b52e11bea88",
    dayOffset: -1,
    time: "20:00",
    durationMinutes: 120,
    bodyWeightKg: 60,
    ageYears: 47,
    caloriesBurned: 628,
    attemptsCount: 5,
    difficultyNotes: "6a, 6a, 7a, 7a, 7b+",
    wellbeing: "",
    surfaces: ["lina"],
    notes: "",
    createdHour: 21,
    createdMinute: 12,
    sourceId: "06baaa1e-a5db-4dd4-a9f9-f289ee9378c4",
  },
];

function createWeightEntriesForMonth() {
  const now = new Date();
  const currentDay = now.getDate();
  const maxEntries = Math.max(10, Math.min(currentDay, 18));
  const startDay = Math.max(1, currentDay - maxEntries + 1);
  const entries: ClimberbookFullDatabaseBackup["weightEntries"] = [];
  let id = 1;

  for (let day = startDay; day <= currentDay; day += 1) {
    const date = formatDateIso(
      new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0),
    );
    const primaryTrend =
      74.4 - (currentDay - day) * 0.08 + Math.sin(day * 0.7) * 0.18;

    entries.push({
      id: id++,
      athleteId: "primary",
      date,
      time: "09:00",
      weightKg: roundToSingleDecimal(primaryTrend),
      createdAt: buildCreatedAt(
        new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0),
        9,
        0,
      ),
    });

    if (day >= Math.max(startDay + 4, currentDay - 6)) {
      const secondaryTrend =
        60.7 - (currentDay - day) * 0.05 + Math.cos(day * 0.55) * 0.12;
      entries.push({
        id: id++,
        athleteId: "322dd89b-1d62-4a2b-b10d-8b52e11bea88",
        date,
        time: day % 2 === 0 ? "09:00" : "20:00",
        weightKg: roundToSingleDecimal(secondaryTrend),
        createdAt: buildCreatedAt(
          new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0),
          day % 2 === 0 ? 9 : 20,
          0,
        ),
      });
    }
  }

  return entries;
}

export function createSampleBackupData(): ClimberbookFullDatabaseBackup {
  const now = new Date();
  const exportedAt = now.toISOString();
  const baseCreatedAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.max(1, now.getDate() - 12),
    12,
    0,
    0,
    0,
  );
  const sectionCreatedAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.max(1, now.getDate() - 13),
    12,
    0,
    0,
    0,
  ).toISOString();
  const athletes: ClimberbookFullDatabaseBackup["athletes"] = [
    {
      id: "primary",
      sourceId: "2ef4f2ba-3c31-47eb-8171-f8aa75eff754",
      name: "Piotrek",
      firstName: "Piot",
      lastName: "Koksowski",
      nick: "Koksu",
      createdAt: buildCreatedAt(baseCreatedAt, 23, 42),
      sectionId: "807988f5-64be-4330-9b96-554a6c817290",
    },
    {
      id: "322dd89b-1d62-4a2b-b10d-8b52e11bea88",
      sourceId: "322dd89b-1d62-4a2b-b10d-8b52e11bea88",
      name: "Aloha",
      firstName: "Alicja",
      lastName: "Kowalska",
      nick: "Alice",
      createdAt: buildCreatedAt(baseCreatedAt, 23, 43),
      sectionId: "807988f5-64be-4330-9b96-554a6c817290",
    },
    {
      id: "15e50776-5512-4780-af99-549522f38cca",
      sourceId: "15e50776-5512-4780-af99-549522f38cca",
      name: "Maciek",
      firstName: "Maciej",
      lastName: "Maciejewski",
      nick: "Maciek",
      createdAt: buildCreatedAt(baseCreatedAt, 23, 44),
    },
  ];

  const trainings = trainingSeeds.map((seed) => {
    const dateObject = buildDateFromOffset(seed.dayOffset);

    return {
      id: seed.sourceId,
      sourceId: seed.sourceId,
      athleteId: seed.athleteId,
      date: formatDateIso(dateObject),
      time: seed.time,
      durationMinutes: seed.durationMinutes,
      bodyWeightKg: seed.bodyWeightKg,
      ageYears: seed.ageYears,
      caloriesBurned: seed.caloriesBurned,
      attemptsCount: seed.attemptsCount,
      difficultyNotes: seed.difficultyNotes,
      difficultyBySurface: seed.difficultyBySurface,
      wellbeing: seed.wellbeing,
      surfaces: seed.surfaces,
      customSessionType: seed.customSessionType ?? "",
      notes: seed.notes,
      createdAt: buildCreatedAt(
        dateObject,
        seed.createdHour,
        seed.createdMinute,
      ),
    };
  });

  const weightEntries = createWeightEntriesForMonth();
  const latestPrimaryWeight =
    weightEntries.filter((entry) => entry.athleteId === "primary").at(-1)
      ?.weightKg ?? 73.3;
  const latestSecondaryWeight =
    weightEntries
      .filter(
        (entry) => entry.athleteId === "322dd89b-1d62-4a2b-b10d-8b52e11bea88",
      )
      .at(-1)?.weightKg ?? 60;

  return {
    formatVersion: 3,
    exportedAt,
    ...createTrainingExportMetadata(trainings),
    athletes,
    sections: [
      {
        id: "807988f5-64be-4330-9b96-554a6c817290",
        sourceId: "807988f5-64be-4330-9b96-554a6c817290",
        name: "Team Koksu",
        createdAt: sectionCreatedAt,
      },
    ],
    facilities: [],
    climbs: [],
    trainings,
    ascents: [],
    profiles: [
      {
        key: "athlete:15e50776-5512-4780-af99-549522f38cca",
        athleteId: "15e50776-5512-4780-af99-549522f38cca",
        birthDate: "1988-01-01",
        sex: "mezczyzna",
        heightCm: 180,
        weightKg: 75,
        updatedAt: exportedAt,
      },
      {
        key: "athlete:322dd89b-1d62-4a2b-b10d-8b52e11bea88",
        athleteId: "322dd89b-1d62-4a2b-b10d-8b52e11bea88",
        birthDate: "1979-05-31",
        sex: "kobieta",
        heightCm: 167,
        weightKg: latestSecondaryWeight,
        updatedAt: exportedAt,
      },
      {
        key: "athlete:primary",
        athleteId: "primary",
        birthDate: "1984-04-24",
        sex: "mezczyzna",
        heightCm: 177,
        weightKg: latestPrimaryWeight,
        updatedAt: exportedAt,
      },
    ],
    weightEntries,
  };
}
