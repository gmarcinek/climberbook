"use client";

import {
  Fragment,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SelectedDatesProvider,
  useSelectedDates,
} from "@/contexts/SelectedDatesContext";
import { TrainingCalendar } from "@/components/training-calendar/TrainingCalendar";
import {
  TrainingSidebar,
  type TrainingDraftValues,
} from "@/components/training-calendar/TrainingSidebar";
import {
  addMonths,
  formatDateIso,
  getMonthStart,
  toDate,
  getTrainingsForDate,
  getTrainingsInRange,
  getVisibleRange,
  groupTrainingsByDate,
} from "@/components/training-calendar/training-calendar.helpers";
import {
  addAscent,
  addTraining,
  addWeightEntry,
  createEmptyUserProfile,
  deleteTraining,
  exportDatabaseBackup,
  getUserProfile,
  importDatabaseBackup,
  listAscents,
  listTrainings,
  listWeightEntries,
  saveUserProfile,
  updateTraining,
  type AscentRecord,
  type TrainingRecord,
  type TrainingSurface,
  type UserProfileRecord,
  type UserSex,
  type WeightEntryRecord,
} from "@/lib/climbs-db";

type ModuleKey = "treningowy" | "raportowy" | "analityka" | "ustawienia";

type AscentDraft = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  notes: string;
};

type UserProfileDraft = {
  birthDate: string;
  sex: UserSex;
  heightCm: string;
  weightKg: string;
};

type WeightEntryDraft = {
  date: string;
  time: string;
  weightKg: string;
};

function estimateTrainingCalories(input: {
  durationMinutes: string;
  bodyWeightKg: string;
  ageYears: string;
  attemptsCount: string;
}) {
  const durationMinutes = Number(input.durationMinutes);
  const bodyWeightKg = Number(input.bodyWeightKg);
  const ageYears = Number(input.ageYears);
  const attemptsCount = Number(input.attemptsCount);

  if (
    !durationMinutes ||
    !bodyWeightKg ||
    !ageYears ||
    attemptsCount < 0 ||
    Number.isNaN(attemptsCount)
  ) {
    return "";
  }

  const durationHours = durationMinutes / 60;
  const estimatedMet = Math.min(
    8.5,
    Math.max(
      4.5,
      4.8 +
        attemptsCount * 0.12 +
        Math.max(0, bodyWeightKg - 60) * 0.015 -
        Math.max(0, ageYears - 30) * 0.01,
    ),
  );

  return String(Math.round(estimatedMet * bodyWeightKg * durationHours));
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function calculateAgeYears(birthDate: string, targetDate: string) {
  if (!birthDate || !targetDate) {
    return "";
  }

  const birth = toDate(birthDate);
  const target = toDate(targetDate);

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(target.getTime()) ||
    birth > target
  ) {
    return "";
  }

  let age = target.getFullYear() - birth.getFullYear();
  const monthOffset = target.getMonth() - birth.getMonth();

  if (
    monthOffset < 0 ||
    (monthOffset === 0 && target.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

function formatWeightInput(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "";
  }

  return value.toFixed(1);
}

function parseWeightInput(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replaceAll(",", "."));
  return Number.isNaN(parsed) ? null : roundToSingleDecimal(parsed);
}

function parseHeightInput(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : Math.round(parsed);
}

function createUserProfileDraft(
  profile: UserProfileRecord = createEmptyUserProfile(),
): UserProfileDraft {
  return {
    birthDate: profile.birthDate,
    sex: profile.sex,
    heightCm: profile.heightCm?.toString() ?? "",
    weightKg: formatWeightInput(profile.weightKg),
  };
}

function createWeightEntryDraft(
  date = formatDateIso(new Date()),
  defaultWeightKg: number | null = null,
): WeightEntryDraft {
  return {
    date,
    time: "09:00",
    weightKg: formatWeightInput(defaultWeightKg),
  };
}

function getLatestTrainingWeight(trainings: TrainingRecord[]) {
  const latestTraining = trainings.reduce<TrainingRecord | null>(
    (latest, training) => {
      if (!latest) {
        return training;
      }

      if (training.date > latest.date) {
        return training;
      }

      if (
        training.date === latest.date &&
        training.createdAt > latest.createdAt
      ) {
        return training;
      }

      return latest;
    },
    null,
  );

  return latestTraining?.bodyWeightKg ?? null;
}

function getLatestWeightEntry(entries: WeightEntryRecord[]) {
  return entries.reduce<WeightEntryRecord | null>((latest, entry) => {
    if (!latest) {
      return entry;
    }

    if (`${entry.date}-${entry.time}` > `${latest.date}-${latest.time}`) {
      return entry;
    }

    if (
      entry.date === latest.date &&
      entry.time === latest.time &&
      entry.createdAt > latest.createdAt
    ) {
      return entry;
    }

    return latest;
  }, null);
}

function getWeekStartIso(value: string) {
  const date = toDate(value);
  const weekday = date.getDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  date.setDate(date.getDate() - daysSinceMonday);
  return formatDateIso(date);
}

const ROPE_GRADE_SCALE = [
  "5a", "5a+", "5b", "5b+", "5c", "5c+",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+", "8b", "8b+", "8c", "8c+",
];

const ROPE_GRADE_COLORS = [
  "#a8dd9a", "#aceb96", "#79d66a", "#4ab34d", "#288e38", "#176729",
  "#e8d353", "#ffe46f", "#ffcf3f", "#ffaf1f", "#ee8914", "#cb5f0d",
  "#83cde7", "#86d8f6", "#4abce7", "#218fce", "#1765ac", "#103d78",
  "#ec8dc2", "#f59acc", "#df6eb8", "#bd499e", "#913181", "#642060",
];

function getRopeGradeIndex(grade: string) {
  return ROPE_GRADE_SCALE.indexOf(grade);
}

function getRopeGradeColor(grade: string) {
  const gradeIndex = getRopeGradeIndex(grade);
  return ROPE_GRADE_COLORS[gradeIndex] ?? "#e19a24";
}

function getRollingChartRange(daysBack = 28, daysForward = 3) {
  const today = toDate(new Date());
  const start = toDate(today);
  const end = toDate(today);
  start.setDate(start.getDate() - daysBack);
  end.setDate(end.getDate() + daysForward);

  return {
    start: formatDateIso(start),
    end: formatDateIso(end),
  };
}

function getRollingChartTicks(start: string, end: string) {
  const ticks: number[] = [];
  const cursor = toDate(start);
  const endDate = toDate(end);

  while (cursor <= endDate) {
    ticks.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 7);
  }

  const endTimestamp = endDate.getTime();

  if (ticks.at(-1) !== endTimestamp) {
    ticks.push(endTimestamp);
  }

  return ticks;
}

function getGradeRank(grade: string) {
  const match = /^(\d+)([abc])?(\+)?$/.exec(grade);

  if (!match) {
    return -1;
  }

  const base = Number(match[1]) * 10;
  const letter = { a: 1, b: 3, c: 5 }[match[2] ?? ""] ?? 0;
  return base + letter + (match[3] ? 1 : 0);
}

function getSortedWeightEntries(entries: WeightEntryRecord[]) {
  return entries
    .slice()
    .sort((left, right) =>
      `${left.date}-${left.time}-${left.createdAt}`.localeCompare(
        `${right.date}-${right.time}-${right.createdAt}`,
      ),
    );
}

function normalizeTrainingDraft(
  draft: TrainingDraftValues,
  birthDate = "",
): TrainingDraftValues {
  const ageYears = calculateAgeYears(birthDate, draft.date);
  const estimatedCalories = estimateTrainingCalories({
    ...draft,
    ageYears,
  });

  return {
    ...draft,
    ageYears,
    caloriesBurned:
      draft.caloriesMode === "manual"
        ? draft.caloriesBurned
        : estimatedCalories,
  };
}

const surfaceOptions: Array<{ value: TrainingSurface; label: string }> = [
  { value: "lina", label: "Lina" },
  { value: "baldy", label: "Baldy" },
  { value: "moon", label: "Moon" },
  { value: "chwytotablica", label: "Chwytotablica" },
  { value: "campus", label: "Campus" },
  { value: "spraywall", label: "Spraywall" },
  { value: "kilter", label: "Kilter" },
  { value: "silownia", label: "Siłownia" },
  { value: "bieznia", label: "Bieżnia" },
  { value: "rower", label: "Rower" },
  { value: "bieg", label: "Bieg" },
  { value: "treking", label: "Treking" },
];

const frenchGradeOptions = [
  "4a",
  "4a/4a+",
  "4a+",
  "4a+/b",
  "4b",
  "4b/4b+",
  "4b+",
  "4b+/c",
  "4c",
  "4c/4c+",
  "4c+",
  "4c+/5a",
  "5a",
  "5a/5a+",
  "5a+",
  "5a+/b",
  "5b",
  "5b/5b+",
  "5b+",
  "5b+/c",
  "5c",
  "5c/5c+",
  "5c+",
  "5c+/6a",
  "6a",
  "6a/6a+",
  "6a+",
  "6a+/b",
  "6b",
  "6b/6b+",
  "6b+",
  "6b+/c",
  "6c",
  "6c/6c+",
  "6c+",
  "6c+/7a",
  "7a",
  "7a/7a+",
  "7a+",
  "7a+/b",
  "7b",
  "7b/7b+",
  "7b+",
  "7b+/c",
  "7c",
  "7c/7c+",
  "7c+",
  "7c+/8a",
  "8a",
  "8a/8a+",
  "8a+",
  "8a+/b",
  "8b",
  "8b/8b+",
  "8b+",
  "8b+/c",
  "8c",
  "8c/8c+",
  "8c+",
  "8c+/9a",
  "9a",
  "9a/9a+",
  "9a+",
  "9a+/b",
  "9b",
  "9b/9b+",
  "9b+",
  "9b+/c",
  "9c",
];

const moduleConfig: Array<{
  key: ModuleKey;
  title: string;
  navLabel: string;
  description: string;
  eyebrow: string;
}> = [
  {
    key: "treningowy",
    title: "Moduł treningowy",
    navLabel: "Treningi",
    description: "Kalendarz 12 miesięcy do zbierania i przeglądu treningów.",
    eyebrow: "Codzienna praca",
  },
  {
    key: "raportowy",
    title: "Moduł raportowy",
    navLabel: "Raporty",
    description: "Historia przejść panel i skała oraz eksport CSV.",
    eyebrow: "Historia i eksport",
  },
  {
    key: "analityka",
    title: "Moduł analityki",
    navLabel: "Analiza",
    description: "Zbiorcze wskaźniki i miejsce pod późniejsze wykresy.",
    eyebrow: "Przegląd trendów",
  },
  {
    key: "ustawienia",
    title: "Settings",
    navLabel: "Settings",
    description: "Profil użytkownika i historia zmian wagi.",
    eyebrow: "Dane bazowe",
  },
];

function createTrainingDraft(
  date = formatDateIso(new Date()),
  options: { birthDate?: string; defaultWeightKg?: number | null } = {},
): TrainingDraftValues {
  return normalizeTrainingDraft(
    {
      date,
      time: "19:00",
      durationMinutes: "120",
      bodyWeightKg: formatWeightInput(options.defaultWeightKg ?? null),
      ageYears: "",
      caloriesBurned: "",
      caloriesMode: "auto",
      attemptsCount: "5",
      difficultyNotes: "",
      wellbeing: "",
      surfaces: [],
      notes: "",
    },
    options.birthDate ?? "",
  );
}

function createAscentDraft(): AscentDraft {
  return {
    date: formatDateIso(new Date()),
    source: "panel",
    routeName: "Projekt A",
    suggestedGrade: "7a",
    subjectiveGrade: "7a",
    notes: "",
  };
}

function mapTrainingToDraft(
  training: TrainingRecord,
  birthDate = "",
): TrainingDraftValues {
  return normalizeTrainingDraft(
    {
      date: training.date,
      time: training.time,
      durationMinutes: String(training.durationMinutes),
      bodyWeightKg: String(training.bodyWeightKg),
      ageYears: "",
      caloriesBurned: String(training.caloriesBurned),
      caloriesMode: "manual",
      attemptsCount: String(training.attemptsCount),
      difficultyNotes: training.difficultyNotes,
      wellbeing: training.wellbeing,
      surfaces: training.surfaces,
      notes: training.notes,
    },
    birthDate,
  );
}

export default function HomePage() {
  return (
    <SelectedDatesProvider>
      <HomePageContent />
    </SelectedDatesProvider>
  );
}

function HomePageContent() {
  const today = formatDateIso(new Date());
  const [activeModule, setActiveModule] = useState<ModuleKey>("treningowy");
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [ascents, setAscents] = useState<AscentRecord[]>([]);
  const { selectedDate, setSelectedDate } = useSelectedDates();
  const [trainingRangeStart, setTrainingRangeStart] = useState(
    getMonthStart(today),
  );
  const [trainingViewportWidth, setTrainingViewportWidth] = useState(0);
  const [editingTrainingId, setEditingTrainingId] = useState<number | null>(
    null,
  );
  const [trainingDraft, setTrainingDraft] = useState<TrainingDraftValues>(() =>
    createTrainingDraft(today),
  );
  const [ascentDraft, setAscentDraft] = useState<AscentDraft>(() =>
    createAscentDraft(),
  );
  const [profileDraft, setProfileDraft] = useState<UserProfileDraft>(() =>
    createUserProfileDraft(),
  );
  const [weightEntryDraft, setWeightEntryDraft] = useState<WeightEntryDraft>(
    () => createWeightEntryDraft(today),
  );
  const [weightEntries, setWeightEntries] = useState<WeightEntryRecord[]>([]);
  const [status, setStatus] = useState("Ładowanie danych z IndexedDB...");
  const backupImportInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshData() {
    const [trainingItems, ascentItems, profileRecord, weightItems] =
      await Promise.all([
        listTrainings(),
        listAscents(),
        getUserProfile(),
        listWeightEntries(),
      ]);

    setTrainings(trainingItems);
    setAscents(
      ascentItems
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    );
    setProfileDraft(createUserProfileDraft(profileRecord));
    setWeightEntries(
      weightItems
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    );
    setWeightEntryDraft(
      createWeightEntryDraft(
        today,
        getLatestWeightEntry(weightItems)?.weightKg ??
          getLatestTrainingWeight(trainingItems) ??
          profileRecord.weightKg,
      ),
    );

    if (trainingItems.length || ascentItems.length) {
      setStatus("Dane zostały załadowane z lokalnej bazy.");
      return;
    }

    setStatus(
      "Baza działa. Możesz zacząć wpisywać treningi i historię przejść.",
    );
  }

  useEffect(() => {
    refreshData().catch(() => {
      setStatus("Nie udało się otworzyć IndexedDB w tej przeglądarce.");
    });
  }, []);

  useEffect(() => {
    const updateLayoutWidth = () => {
      setTrainingViewportWidth(window.innerWidth);
    };

    updateLayoutWidth();
    window.addEventListener("resize", updateLayoutWidth);

    return () => {
      window.removeEventListener("resize", updateLayoutWidth);
    };
  }, []);

  const visibleRange = useMemo(
    () => getVisibleRange(trainingRangeStart, 1),
    [trainingRangeStart],
  );
  const trainingsByDate = useMemo(
    () =>
      new Map(
        groupTrainingsByDate(trainings).map((group) => [
          group.date,
          group.trainings,
        ]),
      ),
    [trainings],
  );
  const selectedDayTrainings = useMemo(
    () => (selectedDate ? getTrainingsForDate(trainings, selectedDate) : []),
    [selectedDate, trainings],
  );
  const visibleRangeTrainings = useMemo(
    () => getTrainingsInRange(trainings, visibleRange.start, visibleRange.end),
    [trainings, visibleRange.end, visibleRange.start],
  );

  const totalTrainingTime = trainings.reduce(
    (sum, item) => sum + item.durationMinutes,
    0,
  );
  const totalCalories = trainings.reduce(
    (sum, item) => sum + item.caloriesBurned,
    0,
  );
  const averageWeight = trainings.length
    ? (
        trainings.reduce((sum, item) => sum + item.bodyWeightKg, 0) /
        trainings.length
      ).toFixed(1)
    : "-";
  const totalAttempts = trainings.reduce(
    (sum, item) => sum + item.attemptsCount,
    0,
  );
  const isMobileChartLayout =
    trainingViewportWidth > 0 && trainingViewportWidth < 600;
  const chartRange = useMemo(
    () =>
      getRollingChartRange(
        isMobileChartLayout ? 13 : 28,
        isMobileChartLayout ? 0 : 3,
      ),
    [isMobileChartLayout],
  );
  const chartRangeLabel = isMobileChartLayout
    ? "Ostatnie 14 dni"
    : "28 dni wstecz + 3 dni";
  const weeklyTrainingStats = useMemo(() => {
    const weeks = new Map<
      string,
      { week: string; duration: number; attempts: number }
    >();
    const firstWeek = getWeekStartIso(chartRange.start);
    const lastWeek = getWeekStartIso(chartRange.end);
    const cursor = toDate(firstWeek);

    while (formatDateIso(cursor) <= lastWeek) {
      const week = formatDateIso(cursor);
      weeks.set(week, { week, duration: 0, attempts: 0 });
      cursor.setDate(cursor.getDate() + 7);
    }

    trainings
      .filter(
        (training) =>
          training.date >= chartRange.start && training.date <= chartRange.end,
      )
      .forEach((training) => {
        const week = getWeekStartIso(training.date);
        const current = weeks.get(week);

        if (!current) {
          return;
        }

        current.duration += training.durationMinutes;
        current.attempts += training.attemptsCount;
        weeks.set(week, current);
      });

    return Array.from(weeks.values()).sort((left, right) =>
      left.week.localeCompare(right.week),
    );
  }, [chartRange, trainings]);
  const gradeDistribution = useMemo(() => {
    const grades = new Map<string, number>();

    trainings.forEach((training) => {
      training.difficultyNotes
        .split(",")
        .map((grade) => grade.trim())
        .filter(Boolean)
        .forEach((grade) => grades.set(grade, (grades.get(grade) ?? 0) + 1));
    });

    return Array.from(grades, ([grade, count]) => ({ grade, count }))
      .sort((left, right) => getGradeRank(right.grade) - getGradeRank(left.grade));
  }, [trainings]);
  const highestGrade = gradeDistribution[0]?.grade ?? "-";
  const panelAscents = ascents.filter((item) => item.source === "panel").length;
  const rockAscents = ascents.filter((item) => item.source === "skala").length;
  const activeModuleMeta =
    moduleConfig.find((module) => module.key === activeModule) ??
    moduleConfig[0];
  const activeModuleShellStyle = moduleShellStyles[activeModule];
  const latestRecordedWeight = useMemo(
    () => getLatestWeightEntry(weightEntries),
    [weightEntries],
  );
  const latestTrainingWeightKg = useMemo(
    () => getLatestTrainingWeight(trainings),
    [trainings],
  );
  const fallbackWeightKg = parseWeightInput(profileDraft.weightKg);
  const defaultTrainingWeightKg =
    latestRecordedWeight?.weightKg ??
    latestTrainingWeightKg ??
    fallbackWeightKg;
  const currentAge = calculateAgeYears(profileDraft.birthDate, today);
  const recentWeightEntries = useMemo(
    () =>
      weightEntries
        .slice()
        .sort((left, right) =>
          `${right.date}-${right.time}-${right.createdAt}`.localeCompare(
            `${left.date}-${left.time}-${left.createdAt}`,
          ),
        )
        .slice(0, 12),
    [weightEntries],
  );
  const sortedWeightEntries = useMemo(
    () => getSortedWeightEntries(weightEntries),
    [weightEntries],
  );
  const latestWeightChange = useMemo(() => {
    if (sortedWeightEntries.length < 2) {
      return null;
    }

    const current = sortedWeightEntries[sortedWeightEntries.length - 1];
    const previous = sortedWeightEntries[sortedWeightEntries.length - 2];
    return roundToSingleDecimal(current.weightKg - previous.weightKg);
  }, [sortedWeightEntries]);
  const currentCalendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pl-PL", {
        month: "long",
        year: "numeric",
      }).format(toDate(trainingRangeStart)),
    [trainingRangeStart],
  );
  const isMobileTrainingLayout =
    trainingViewportWidth > 0 && trainingViewportWidth < 1180;
  const showTrainingSidebarColumn = trainingViewportWidth >= 1640;
  const isMobileHeader =
    trainingViewportWidth > 0 && trainingViewportWidth < 600;
  const weightChartEntries = useMemo(
    () => {
      return sortedWeightEntries.filter(
        (entry) =>
          entry.date >= chartRange.start && entry.date <= chartRange.end,
      );
    },
    [chartRange, sortedWeightEntries],
  );

  function resetTrainingEditor(date = selectedDate ?? today) {
    setEditingTrainingId(null);
    setTrainingDraft(
      createTrainingDraft(date, {
        birthDate: profileDraft.birthDate,
        defaultWeightKg: defaultTrainingWeightKg,
      }),
    );
  }

  function handleTrainingDraftChange(draft: TrainingDraftValues) {
    setTrainingDraft(normalizeTrainingDraft(draft, profileDraft.birthDate));
  }

  function handleTrainingDateSelect(date: string) {
    if (selectedDate === date) {
      setSelectedDate(null);
      resetTrainingEditor(today);
      return;
    }

    setSelectedDate(date);
    resetTrainingEditor(date);
  }

  function handleResetTrainingSelection() {
    setSelectedDate(null);
    resetTrainingEditor(today);
  }

  function handleEditTraining(training: TrainingRecord) {
    setSelectedDate(training.date);
    setEditingTrainingId(training.id ?? null);
    setTrainingDraft(mapTrainingToDraft(training, profileDraft.birthDate));
  }

  async function handleDeleteTraining(training: TrainingRecord) {
    if (
      training.id === undefined ||
      !window.confirm("Usunąć ten trening? Tej operacji nie można cofnąć.")
    ) {
      return;
    }

    setStatus("Usuwam trening...");

    try {
      await deleteTraining(training.id);
      await refreshData();

      if (editingTrainingId === training.id) {
        resetTrainingEditor(selectedDate ?? today);
      }

      setStatus("Trening został usunięty.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Nie udało się usunąć treningu.",
      );
    }
  }

  function toggleSurface(surface: TrainingSurface) {
    setTrainingDraft((current) => {
      const surfaces = current.surfaces.includes(surface)
        ? current.surfaces.filter((item) => item !== surface)
        : [...current.surfaces, surface];

      return {
        ...normalizeTrainingDraft(current, profileDraft.birthDate),
        surfaces,
      };
    });
  }

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Zapisuję settings...");

    const parsedWeightKg = parseWeightInput(profileDraft.weightKg);
    const parsedHeightCm = parseHeightInput(profileDraft.heightCm);

    try {
      await saveUserProfile({
        key: "primary",
        birthDate: profileDraft.birthDate,
        sex: profileDraft.sex,
        heightCm: parsedHeightCm,
        weightKg: parsedWeightKg,
      });

      if (
        parsedWeightKg !== null &&
        parsedWeightKg > 0 &&
        (!latestRecordedWeight ||
          latestRecordedWeight.weightKg !== parsedWeightKg ||
          latestRecordedWeight.date !== today)
      ) {
        await addWeightEntry({
          date: today,
          time: "09:00",
          weightKg: parsedWeightKg,
        });
      }

      await refreshData();

      if (selectedDate === null && editingTrainingId === null) {
        setTrainingDraft(
          createTrainingDraft(today, {
            birthDate: profileDraft.birthDate,
            defaultWeightKg: parsedWeightKg,
          }),
        );
      }

      setStatus("Settings zostały zapisane.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Zapis settings nie powiódł się.",
      );
    }
  }

  async function handleTrainingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trainingDraft.surfaces.length === 0) {
      setStatus("Wybierz co najmniej jeden rodzaj sesji.");
      return;
    }

    setStatus(
      editingTrainingId ? "Aktualizuję trening..." : "Zapisuję trening...",
    );

    const payload = {
      date: trainingDraft.date,
      time: trainingDraft.time,
      durationMinutes: Number(trainingDraft.durationMinutes),
      bodyWeightKg: roundToSingleDecimal(Number(trainingDraft.bodyWeightKg)),
      ageYears: Number(trainingDraft.ageYears || 0),
      caloriesBurned:
        trainingDraft.caloriesBurned === ""
          ? Number(estimateTrainingCalories(trainingDraft) || 0)
          : Number(trainingDraft.caloriesBurned),
      attemptsCount: Number(trainingDraft.attemptsCount),
      difficultyNotes: trainingDraft.difficultyNotes,
      wellbeing: trainingDraft.wellbeing,
      surfaces: trainingDraft.surfaces,
      notes: trainingDraft.notes,
    };

    try {
      if (editingTrainingId !== null) {
        const current = trainings.find(
          (training) => training.id === editingTrainingId,
        );

        if (!current) {
          throw new Error("Nie znaleziono treningu do edycji.");
        }

        await updateTraining({
          ...current,
          ...payload,
        });
      } else {
        await addTraining(payload);
      }

      if (
        payload.bodyWeightKg > 0 &&
        !weightEntries.some(
          (entry) =>
            entry.date === payload.date &&
            entry.time === payload.time &&
            entry.weightKg === payload.bodyWeightKg,
        )
      ) {
        await addWeightEntry({
          date: payload.date,
          time: payload.time,
          weightKg: payload.bodyWeightKg,
        });
      }

      await refreshData();
      setStatus(
        editingTrainingId
          ? "Trening został zaktualizowany."
          : "Trening został zapisany.",
      );
      handleResetTrainingSelection();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Zapis treningu nie powiódł się.",
      );
    }
  }

  async function handleAscentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Zapisuję przejście...");

    try {
      await addAscent(ascentDraft);
      await refreshData();
      setAscentDraft(createAscentDraft());
    } catch {
      setStatus("Zapis przejścia nie powiódł się.");
    }
  }

  async function handleWeightEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Zapisuję pomiar wagi...");

    const parsedWeightKg = parseWeightInput(weightEntryDraft.weightKg);

    if (
      !weightEntryDraft.date ||
      parsedWeightKg === null ||
      parsedWeightKg <= 0
    ) {
      setStatus("Podaj datę i poprawną wagę pomiaru.");
      return false;
    }

    try {
      await addWeightEntry({
        date: weightEntryDraft.date,
        time: weightEntryDraft.time,
        weightKg: parsedWeightKg,
      });
      await refreshData();
      setWeightEntryDraft(createWeightEntryDraft(today, parsedWeightKg));
      setStatus("Pomiar wagi został zapisany.");
      return true;
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Zapis pomiaru wagi nie powiódł się.",
      );
      return false;
    }
  }

  async function handleDatabaseExport() {
    try {
      const backup = await exportDatabaseBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `climberbook-backup-${formatDateIso(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Backup bazy został wyeksportowany.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Eksport backupu nie powiódł się.",
      );
    }
  }

  async function handleDatabaseImport(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const [file] = Array.from(event.target.files ?? []);

    if (!file) {
      return;
    }

    try {
      await importDatabaseBackup(JSON.parse(await file.text()));
      await refreshData();
      setStatus("Backup bazy został zaimportowany.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Import backupu nie powiódł się.",
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main style={pageStyle}>
      <section style={{ ...shellStyle, ...activeModuleShellStyle }}>
        <header
          style={{
            ...pageHeaderStyle,
            height: isMobileHeader ? 112 : 80,
          }}
        >
          <div
            style={{
              ...topBarStyle,
              height: isMobileHeader ? 112 : 80,
              gridTemplateColumns: isMobileHeader
                ? "minmax(0, 1fr)"
                : "auto minmax(0, 1fr) auto",
              gridTemplateRows: isMobileHeader ? "48px 40px" : "none",
              gap: isMobileHeader ? 0 : 12,
            }}
          >
            <strong
              style={{
                ...brandStyle,
                gridRow: isMobileHeader ? 1 : "auto",
              }}
            >
              Climberbook
            </strong>

            {activeModule === "treningowy" && !isMobileHeader && (
              <div style={headerMetricsStyle}>
                <span style={headerMetricStyle}>Sesje: {trainings.length}</span>
                <span style={headerMetricStyle}>
                  Objętość: {totalTrainingTime} min
                </span>
                <span style={headerMetricStyle}>Kalorie: {totalCalories}</span>
                <span style={headerMetricStyle}>Wstawki: {totalAttempts}</span>
              </div>
            )}

            <nav
              style={{
                ...moduleNavStyle,
                gridRow: isMobileHeader ? 2 : "auto",
                justifyContent: isMobileHeader ? "flex-start" : "flex-end",
              }}
            >
              {moduleConfig.map((module, index) => (
                <Fragment key={module.key}>
                  {index > 0 && <span style={navSeparatorStyle}>|</span>}
                  <button
                    type="button"
                    onClick={() => setActiveModule(module.key)}
                    style={{
                      ...moduleButtonStyle,
                      color:
                        activeModule === module.key
                          ? "var(--text)"
                          : "var(--muted)",
                      fontWeight: activeModule === module.key ? 700 : 500,
                    }}
                  >
                    {module.navLabel}
                  </button>
                </Fragment>
              ))}
            </nav>
          </div>
        </header>

        <div
          style={{
            ...contentBodyStyle,
            height: `calc(100vh - ${isMobileHeader ? 112 : 80}px)`,
            marginTop: isMobileHeader ? 112 : 80,
            overflowX: "hidden",
            overflowY: isMobileTrainingLayout ? "auto" : "hidden",
            paddingBottom: isMobileTrainingLayout ? 24 : 8,
          }}
        >
          {activeModule === "treningowy" && (
            <>
              <div
                style={{
                  ...trainingModuleStyle,
                  gridTemplateColumns: isMobileTrainingLayout
                    ? "minmax(0, 1fr)"
                    : showTrainingSidebarColumn
                      ? "515px minmax(0, 3fr) minmax(0, 3fr)"
                      : "515px minmax(0, 3fr)",
                  gridTemplateRows: isMobileTrainingLayout
                    ? "none"
                    : "minmax(0, 1fr)",
                  height: isMobileTrainingLayout ? "auto" : "100%",
                  alignItems: isMobileTrainingLayout ? "start" : "stretch",
                }}
              >
                {isMobileTrainingLayout && (
                  <section style={analyticsPanelStyle}>
                    <TrainingAnalyticsPanel
                      latestWeightKg={
                        latestRecordedWeight?.weightKg ??
                        defaultTrainingWeightKg
                      }
                      latestWeightDate={latestRecordedWeight?.date ?? null}
                      latestWeightChange={latestWeightChange}
                      averageWeight={averageWeight}
                      totalTrainingTime={totalTrainingTime}
                      totalCalories={totalCalories}
                      weightChartEntries={weightChartEntries}
                      trainings={trainings}
                      chartRange={chartRange}
                      chartRangeLabel={chartRangeLabel}
                      weightEntryDraft={weightEntryDraft}
                      onWeightEntryDraftChange={setWeightEntryDraft}
                      onWeightEntrySubmit={handleWeightEntrySubmit}
                      recentWeightEntries={recentWeightEntries}
                    />
                  </section>
                )}

                {!isMobileTrainingLayout && (
                  <section
                    style={{
                      ...analyticsPanelStyle,
                      gridColumn: 2,
                      gridRow: 1,
                    }}
                  >
                    <TrainingAnalyticsPanel
                      latestWeightKg={
                        latestRecordedWeight?.weightKg ??
                        defaultTrainingWeightKg
                      }
                      latestWeightDate={latestRecordedWeight?.date ?? null}
                      latestWeightChange={latestWeightChange}
                      averageWeight={averageWeight}
                      totalTrainingTime={totalTrainingTime}
                      totalCalories={totalCalories}
                      weightChartEntries={weightChartEntries}
                      trainings={trainings}
                      chartRange={chartRange}
                      chartRangeLabel={chartRangeLabel}
                      weightEntryDraft={weightEntryDraft}
                      onWeightEntryDraftChange={setWeightEntryDraft}
                      onWeightEntrySubmit={handleWeightEntrySubmit}
                      recentWeightEntries={recentWeightEntries}
                    />
                  </section>
                )}

                <section
                  style={{
                    ...calendarPanelStyle,
                    gridColumn: isMobileTrainingLayout ? "auto" : 1,
                    gridRow: isMobileTrainingLayout ? "auto" : 1,
                    order: isMobileTrainingLayout ? -1 : 0,
                  }}
                >
                  <div style={calendarNavStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setTrainingRangeStart(addMonths(trainingRangeStart, -1))
                      }
                      style={navButtonStyle}
                    >
                      Wstecz
                    </button>
                    <strong style={calendarNavLabelStyle}>
                      {currentCalendarMonthLabel}
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        setTrainingRangeStart(addMonths(trainingRangeStart, 1))
                      }
                      style={navButtonStyle}
                    >
                      Dalej
                    </button>
                  </div>

                  <TrainingCalendar
                    anchorMonthStart={trainingRangeStart}
                    monthCount={1}
                    visibleColumns={1}
                    trainingsByDate={trainingsByDate}
                    selectedDate={selectedDate}
                    today={today}
                    onSelectDate={handleTrainingDateSelect}
                  />
                </section>

                {showTrainingSidebarColumn && (
                  <div style={{ gridColumn: 3, gridRow: 1, minHeight: 0 }}>
                    <TrainingSidebar
                      selectedDate={selectedDate}
                      selectedDayTrainings={selectedDayTrainings}
                      visibleRangeTrainings={visibleRangeTrainings}
                      trainingDraft={trainingDraft}
                      editingTrainingId={editingTrainingId}
                      surfaceOptions={surfaceOptions}
                      onTrainingDraftChange={handleTrainingDraftChange}
                      onToggleSurface={toggleSurface}
                      onSubmit={handleTrainingSubmit}
                      onEditTraining={handleEditTraining}
                      onDeleteTraining={handleDeleteTraining}
                      onResetSelection={handleResetTrainingSelection}
                      onCancelEdit={() =>
                        resetTrainingEditor(selectedDate ?? today)
                      }
                    />
                  </div>
                )}
              </div>

              {!showTrainingSidebarColumn && selectedDate && (
                <div style={mobileDrawerOverlayStyle}>
                  <button
                    type="button"
                    aria-label="Zamknij drawer"
                    onClick={handleResetTrainingSelection}
                    style={mobileDrawerBackdropStyle}
                  />
                  <div style={mobileDrawerSheetStyle}>
                    <TrainingSidebar
                      selectedDate={selectedDate}
                      selectedDayTrainings={selectedDayTrainings}
                      visibleRangeTrainings={visibleRangeTrainings}
                      trainingDraft={trainingDraft}
                      editingTrainingId={editingTrainingId}
                      surfaceOptions={surfaceOptions}
                      onTrainingDraftChange={handleTrainingDraftChange}
                      onToggleSurface={toggleSurface}
                      onSubmit={handleTrainingSubmit}
                      onEditTraining={handleEditTraining}
                        onDeleteTraining={handleDeleteTraining}
                      onResetSelection={handleResetTrainingSelection}
                      onCancelEdit={() =>
                        resetTrainingEditor(selectedDate ?? today)
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeModule === "raportowy" && (
            <div style={moduleContentStyle}>
              <div style={moduleIntroStyle}>
                <div>
                  <p style={eyebrowStyle}>{activeModuleMeta.eyebrow}</p>
                  <h1 style={pageTitleStyle}>{activeModuleMeta.title}</h1>
                  <p style={mutedParagraphStyle}>
                    {activeModuleMeta.description}
                  </p>
                </div>

                <div style={headerBadgeRowStyle}>
                  <span style={headerBadgeStyle}>
                    Przejścia: {ascents.length}
                  </span>
                  <span style={headerBadgeStyle}>Panel: {panelAscents}</span>
                  <span style={headerBadgeStyle}>Skała: {rockAscents}</span>
                </div>

                <div style={statusBoxStyle}>{status}</div>
              </div>

              <div style={statsGridStyle}>
                <MetricCard
                  label="Wpisy raportowe"
                  value={String(ascents.length)}
                  detail="Wszystkie zapisane przejścia"
                />
                <MetricCard
                  label="Panel"
                  value={String(panelAscents)}
                  detail="Liczba przejść panelowych"
                />
                <MetricCard
                  label="Skała"
                  value={String(rockAscents)}
                  detail="Liczba przejść skalnych"
                />
              </div>

              <div style={twoColumnLayoutStyle}>
                <section style={panelStyle}>
                  <div style={panelHeadingStyle}>
                    <div>
                      <span style={moduleEyebrowStyle}>Historia przejść</span>
                      <h2 style={sectionTitleStyle}>Panel i skała</h2>
                    </div>
                    <span style={softTagStyle}>Dodawanie ręczne</span>
                  </div>

                  <form onSubmit={handleAscentSubmit} style={formStyle}>
                    <div style={formGridStyle}>
                      <label style={fieldStyle}>
                        Data
                        <input
                          value={ascentDraft.date}
                          onChange={(event) =>
                            setAscentDraft({
                              ...ascentDraft,
                              date: event.target.value,
                            })
                          }
                          type="date"
                          required
                          style={inputStyle}
                        />
                      </label>
                      <label style={fieldStyle}>
                        Źródło
                        <select
                          value={ascentDraft.source}
                          onChange={(event) =>
                            setAscentDraft({
                              ...ascentDraft,
                              source: event.target.value as "panel" | "skala",
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="panel">Panel</option>
                          <option value="skala">Skała</option>
                        </select>
                      </label>
                      <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                        Nazwa drogi / problemu
                        <input
                          value={ascentDraft.routeName}
                          onChange={(event) =>
                            setAscentDraft({
                              ...ascentDraft,
                              routeName: event.target.value,
                            })
                          }
                          required
                          style={inputStyle}
                        />
                      </label>
                      <label style={fieldStyle}>
                        Wycena sugerowana
                        <select
                          value={ascentDraft.suggestedGrade}
                          onChange={(event) =>
                            setAscentDraft({
                              ...ascentDraft,
                              suggestedGrade: event.target.value,
                            })
                          }
                          required
                          style={inputStyle}
                        >
                          {frenchGradeOptions.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={fieldStyle}>
                        Wycena subiektywna
                        <select
                          value={ascentDraft.subjectiveGrade}
                          onChange={(event) =>
                            setAscentDraft({
                              ...ascentDraft,
                              subjectiveGrade: event.target.value,
                            })
                          }
                          required
                          style={inputStyle}
                        >
                          {frenchGradeOptions.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                        Notatki
                        <textarea
                          value={ascentDraft.notes}
                          onChange={(event) =>
                            setAscentDraft({
                              ...ascentDraft,
                              notes: event.target.value,
                            })
                          }
                          rows={3}
                          style={textAreaStyle}
                        />
                      </label>
                    </div>

                    <button type="submit" style={buttonStyle}>
                      Dodaj przejście
                    </button>
                  </form>
                </section>

                <section style={panelStyle}>
                  <div style={actionRowStyle}>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={handleDatabaseExport}
                    >
                      Eksport całości
                    </button>
                    <input
                      ref={backupImportInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleDatabaseImport}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      style={ghostButtonStyle}
                      onClick={() => backupImportInputRef.current?.click()}
                    >
                      Import całości z pliku
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeModule === "ustawienia" && (
            <div style={moduleContentStyle}>
              <div style={moduleIntroStyle}>
                <div>
                  <p style={eyebrowStyle}>{activeModuleMeta.eyebrow}</p>
                  <h1 style={pageTitleStyle}>{activeModuleMeta.title}</h1>
                  <p style={mutedParagraphStyle}>
                    {activeModuleMeta.description}
                  </p>
                </div>

                <div style={headerBadgeRowStyle}>
                  <span style={headerBadgeStyle}>
                    Wiek: {currentAge || "-"}
                  </span>
                  <span style={headerBadgeStyle}>
                    Waga:{" "}
                    {profileDraft.weightKg
                      ? `${profileDraft.weightKg} kg`
                      : "-"}
                  </span>
                  <span style={headerBadgeStyle}>
                    Wzrost:{" "}
                    {profileDraft.heightCm
                      ? `${profileDraft.heightCm} cm`
                      : "-"}
                  </span>
                  <span style={headerBadgeStyle}>
                    Pomiary: {weightEntries.length}
                  </span>
                </div>

                <div style={statusBoxStyle}>{status}</div>
              </div>

              <div style={statsGridStyle}>
                <MetricCard
                  label="Data urodzenia"
                  value={profileDraft.birthDate || "-"}
                  detail="Wiek liczony automatycznie"
                />
                <MetricCard
                  label="Płeć"
                  value={profileDraft.sex || "-"}
                  detail="Pole bazowe profilu"
                />
                <MetricCard
                  label="Wzrost"
                  value={
                    profileDraft.heightCm ? `${profileDraft.heightCm} cm` : "-"
                  }
                  detail="Ustawienie bazowe"
                />
                <MetricCard
                  label="Aktualna waga"
                  value={
                    profileDraft.weightKg ? `${profileDraft.weightKg} kg` : "-"
                  }
                  detail="Ustawienie bazowe"
                />
                <MetricCard
                  label="Zmiany wagi"
                  value={String(weightEntries.length)}
                  detail="Oddzielne encje: data i waga"
                />
              </div>

              <div style={twoColumnLayoutStyle}>
                <section style={panelStyle}>
                  <div style={panelHeadingStyle}>
                    <div>
                      <span style={moduleEyebrowStyle}>Profil</span>
                      <h2 style={sectionTitleStyle}>Settings użytkownika</h2>
                    </div>
                    <span style={softTagStyle}>
                      Data urodzenia, płeć, wzrost, waga
                    </span>
                  </div>

                  <form onSubmit={handleSettingsSubmit} style={formStyle}>
                    <div style={formGridStyle}>
                      <label style={fieldStyle}>
                        Data urodzenia
                        <input
                          value={profileDraft.birthDate}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              birthDate: event.target.value,
                            }))
                          }
                          type="date"
                          style={inputStyle}
                        />
                      </label>
                      <label style={fieldStyle}>
                        Płeć
                        <select
                          value={profileDraft.sex}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              sex: event.target.value as UserSex,
                            }))
                          }
                          style={inputStyle}
                        >
                          <option value="">Nie podano</option>
                          <option value="kobieta">Kobieta</option>
                          <option value="mezczyzna">Mężczyzna</option>
                          <option value="inna">Inna</option>
                        </select>
                      </label>
                      <label style={fieldStyle}>
                        Wzrost (cm)
                        <input
                          value={profileDraft.heightCm}
                          onChange={(event) =>
                            setProfileDraft((current) => ({
                              ...current,
                              heightCm: event.target.value,
                            }))
                          }
                          onBlur={() =>
                            setProfileDraft((current) => ({
                              ...current,
                              heightCm:
                                parseHeightInput(
                                  current.heightCm,
                                )?.toString() ?? "",
                            }))
                          }
                          type="number"
                          min="1"
                          step="1"
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                        Waga (kg)
                        <div style={weightControlStyle}>
                          <button
                            type="button"
                            style={weightStepButtonStyle}
                            onClick={() =>
                              setProfileDraft((current) => ({
                                ...current,
                                weightKg: formatWeightInput(
                                  Math.max(
                                    0,
                                    (parseWeightInput(current.weightKg) ?? 0) -
                                      0.1,
                                  ),
                                ),
                              }))
                            }
                          >
                            -
                          </button>
                          <input
                            value={profileDraft.weightKg}
                            onChange={(event) =>
                              setProfileDraft((current) => ({
                                ...current,
                                weightKg: event.target.value.replaceAll(
                                  ",",
                                  ".",
                                ),
                              }))
                            }
                            onBlur={() =>
                              setProfileDraft((current) => ({
                                ...current,
                                weightKg: formatWeightInput(
                                  parseWeightInput(current.weightKg),
                                ),
                              }))
                            }
                            type="number"
                            min="0"
                            step="0.1"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <button
                            type="button"
                            style={weightStepButtonStyle}
                            onClick={() =>
                              setProfileDraft((current) => ({
                                ...current,
                                weightKg: formatWeightInput(
                                  (parseWeightInput(current.weightKg) ?? 0) +
                                    0.1,
                                ),
                              }))
                            }
                          >
                            +
                          </button>
                        </div>
                      </label>
                    </div>

                    <button type="submit" style={buttonStyle}>
                      Zapisz settings
                    </button>
                  </form>
                </section>

                <section style={panelStyle}>
                  <div style={panelHeadingStyle}>
                    <div>
                      <span style={moduleEyebrowStyle}>Historia wagi</span>
                      <h2 style={sectionTitleStyle}>Osobne encje</h2>
                    </div>
                    <span style={softTagStyle}>Data i waga</span>
                  </div>

                  <div style={scrollListStyle}>
                    {recentWeightEntries.length === 0 && (
                      <EmptyState message="Nie ma jeszcze zapisanych zmian wagi." />
                    )}
                    {recentWeightEntries.map((entry) => (
                      <article
                        key={`${entry.id ?? entry.createdAt}-${entry.date}`}
                        style={listCardStyle}
                      >
                        <div style={listCardHeaderStyle}>
                          <strong>{entry.weightKg.toFixed(1)} kg</strong>
                          <span style={softPillStyle}>
                            {entry.date} {entry.time}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeModule === "analityka" && (
            <div style={moduleContentStyle}>
              <div style={moduleIntroStyle}>
                <div>
                  <p style={eyebrowStyle}>{activeModuleMeta.eyebrow}</p>
                  <h1 style={pageTitleStyle}>{activeModuleMeta.title}</h1>
                  <p style={mutedParagraphStyle}>
                    {activeModuleMeta.description}
                  </p>
                </div>

                <div style={headerBadgeRowStyle}>
                  <span style={headerBadgeStyle}>
                    Treningi: {trainings.length}
                  </span>
                  <span style={headerBadgeStyle}>
                    Średnia: {averageWeight} kg
                  </span>
                  <span style={headerBadgeStyle}>Kalorie: {totalCalories}</span>
                </div>

                <div style={statusBoxStyle}>{status}</div>
              </div>

              <div style={statsGridStyle}>
                <MetricCard
                  label="Liczba treningów"
                  value={String(trainings.length)}
                  detail="Wszystkie zapisane sesje"
                />
                <MetricCard
                  label="Łączny czas"
                  value={`${totalTrainingTime} min`}
                  detail="Suma czasu treningowego"
                />
                <MetricCard
                  label="Średnia waga"
                  value={`${averageWeight} kg`}
                  detail="Na podstawie wpisów treningowych"
                />
                <MetricCard
                  label="Łączne wstawki"
                  value={String(totalAttempts)}
                  detail="Suma prób ze wszystkich sesji"
                />
              </div>

              <div style={twoColumnLayoutStyle}>
                <section style={panelStyle}>
                  <div style={panelHeadingStyle}>
                    <div>
                      <span style={moduleEyebrowStyle}>Objętość</span>
                      <h2 style={sectionTitleStyle}>Tygodniowy rytm treningu</h2>
                    </div>
                    <span style={softTagStyle}>{chartRangeLabel}</span>
                  </div>

                  {weeklyTrainingStats.length === 0 ? (
                    <EmptyState message="Dodaj treningi, aby zobaczyć tygodniowy rytm." />
                  ) : (
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyTrainingStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(28, 61, 89, 0.12)" />
                          <XAxis dataKey="week" tickFormatter={(value) => value.slice(5)} />
                          <YAxis yAxisId="minutes" />
                          <YAxis yAxisId="attempts" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="minutes" dataKey="duration" name="Minuty" fill="#168f91" />
                          <Bar yAxisId="attempts" dataKey="attempts" name="Wstawki" fill="#e19a24" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section style={panelStyle}>
                  <div style={panelHeadingStyle}>
                    <div>
                      <span style={moduleEyebrowStyle}>Wyceny</span>
                      <h2 style={sectionTitleStyle}>Rozkład i maksimum</h2>
                    </div>
                    <span style={softTagStyle}>Najwyższa: {highestGrade}</span>
                  </div>

                  <div style={scrollListStyle}>
                    {gradeDistribution.length === 0 && (
                      <EmptyState message="Nie ma jeszcze wybranych wycen w treningach." />
                    )}
                    {gradeDistribution.map((grade) => (
                      <article key={grade.grade} style={listCardStyle}>
                        <div style={listCardHeaderStyle}>
                          <strong>{grade.grade}</strong>
                          <span style={softPillStyle}>{grade.count} wstawek</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article style={metricCardStyle}>
      <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
        {label}
      </span>
      <strong style={metricValueStyle}>{value}</strong>
      <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
        {detail}
      </span>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p style={{ margin: 0, color: "var(--muted)" }}>{message}</p>;
}

function TrainingAnalyticsPanel(props: {
  latestWeightKg: number | null | undefined;
  latestWeightDate: string | null;
  latestWeightChange: number | null;
  averageWeight: string;
  totalTrainingTime: number;
  totalCalories: number;
  weightChartEntries: WeightEntryRecord[];
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  weightEntryDraft: WeightEntryDraft;
  onWeightEntryDraftChange: (draft: WeightEntryDraft) => void;
  onWeightEntrySubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  recentWeightEntries: WeightEntryRecord[];
}) {
  const {
    latestWeightKg,
    latestWeightDate,
    latestWeightChange,
    averageWeight,
    totalTrainingTime,
    totalCalories,
    weightChartEntries,
    trainings,
    chartRange,
    chartRangeLabel,
    weightEntryDraft,
    onWeightEntryDraftChange,
    onWeightEntrySubmit,
    recentWeightEntries,
  } = props;
  const [isWeightEntryModalOpen, setIsWeightEntryModalOpen] = useState(false);

  async function handleWeightEntryModalSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const wasSaved = await onWeightEntrySubmit(event);

    if (wasSaved) {
      setIsWeightEntryModalOpen(false);
    }
  }

  return (
    <div style={analyticsPanelInnerStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Analityka</span>
          <h2 style={sectionTitleStyle}>Waga i trend</h2>
        </div>
        <span style={softTagStyle}>Bieżący miesiąc</span>
      </div>

      <div style={analyticsStatsGridStyle}>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Ostatni pomiar
          </span>
          <strong style={metricValueStyle}>
            {latestWeightKg ? `${latestWeightKg.toFixed(1)} kg` : "-"}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            {latestWeightDate ?? "Brak wpisu"}
          </span>
        </article>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Zmiana
          </span>
          <strong style={metricValueStyle}>
            {latestWeightChange === null
              ? "-"
              : `${latestWeightChange > 0 ? "+" : ""}${latestWeightChange.toFixed(1)} kg`}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Vs poprzedni pomiar
          </span>
        </article>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Średnia
          </span>
          <strong style={metricValueStyle}>
            {averageWeight === "-" ? "-" : `${averageWeight} kg`}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Na bazie treningów
          </span>
        </article>
        <article style={metricCardStyle}>
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            Objętość
          </span>
          <strong style={metricValueStyle}>{totalTrainingTime} min</strong>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            Kalorie: {totalCalories}
          </span>
        </article>
      </div>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Wykres wagi</span>
            <h3 style={sectionTitleStyle}>Ostatnie pomiary</h3>
          </div>
          <span style={softPillStyle}>{weightChartEntries.length} pkt</span>
          <button
            type="button"
            onClick={() => setIsWeightEntryModalOpen(true)}
            style={{ ...buttonStyle, justifySelf: "start" }}
          >
            Dodaj pomiar
          </button>
        </div>
        <WeightTrendChart entries={weightChartEntries} chartRange={chartRange} />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Treningi z liną i MoonBoard</span>
            <h3 style={sectionTitleStyle}>Wyceny na sesję</h3>
          </div>
          <span style={softPillStyle}>Zakres +/- 2 stopnie</span>
        </div>
        <RopeTrainingGradesChart trainings={trainings} chartRange={chartRange} />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Kalorie</span>
            <h3 style={sectionTitleStyle}>Dzienne spalanie</h3>
          </div>
          <span style={softPillStyle}>{chartRangeLabel}</span>
        </div>
        <TrainingCaloriesChart trainings={trainings} chartRange={chartRange} />
      </section>

      {isWeightEntryModalOpen && (
        <div
          style={weightEntryModalOverlayStyle}
          role="presentation"
          onMouseDown={() => setIsWeightEntryModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="weight-entry-modal-title"
            style={weightEntryModalStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={panelHeadingStyle}>
              <div>
                <span style={moduleEyebrowStyle}>Pomiar wagi</span>
                <h3 id="weight-entry-modal-title" style={sectionTitleStyle}>
                  Dodaj pomiar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightEntryModalOpen(false)}
                style={ghostButtonStyle}
              >
                Zamknij
              </button>
            </div>

            <form onSubmit={handleWeightEntryModalSubmit} style={formStyle}>
              <label style={fieldStyle}>
                Data pomiaru
                <input
                  value={weightEntryDraft.date}
                  onChange={(event) =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      date: event.target.value,
                    })
                  }
                  type="date"
                  required
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                Godzina pomiaru
                <input
                  value={weightEntryDraft.time}
                  onChange={(event) =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      time: event.target.value,
                    })
                  }
                  type="time"
                  required
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                Waga (kg)
                <input
                  value={weightEntryDraft.weightKg}
                  onChange={(event) =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      weightKg: event.target.value.replaceAll(",", "."),
                    })
                  }
                  onBlur={() =>
                    onWeightEntryDraftChange({
                      ...weightEntryDraft,
                      weightKg: formatWeightInput(
                        parseWeightInput(weightEntryDraft.weightKg),
                      ),
                    })
                  }
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  style={inputStyle}
                />
              </label>

              <button type="submit" style={buttonStyle}>
                Zapisz pomiar
              </button>
            </form>
          </section>
        </div>
      )}

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Szybki przegląd</span>
            <h3 style={sectionTitleStyle}>Ostatnie wpisy</h3>
          </div>
          <span style={softPillStyle}>Max 5</span>
        </div>

        <div style={scrollListStyle}>
          {recentWeightEntries.length === 0 && (
            <EmptyState message="Nie ma jeszcze osobnych pomiarów wagi." />
          )}
          {recentWeightEntries.slice(0, 5).map((entry) => (
            <article
              key={`${entry.id ?? entry.createdAt}-${entry.date}`}
              style={listCardStyle}
            >
              <div style={listCardHeaderStyle}>
                <strong>{entry.weightKg.toFixed(1)} kg</strong>
                <span style={softPillStyle}>
                  {entry.date} {entry.time}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RopeTrainingGradesChart({
  trainings,
  chartRange,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
}) {
  const ropeAndMoonTrainings = trainings
    .filter(
      (training) =>
        (training.surfaces.includes("lina") || training.surfaces.includes("moon")) &&
        training.date >= chartRange.start &&
        training.date <= chartRange.end,
    )
    .sort((left, right) =>
      `${left.date}-${left.time}-${left.createdAt}`.localeCompare(
        `${right.date}-${right.time}-${right.createdAt}`,
      ),
    );
  const ropeTrainings = ropeAndMoonTrainings
    .map((training) => ({
      ...training,
      grades: training.difficultyNotes
        .split(",")
        .map((grade) => grade.trim())
        .map((grade) => ({ grade, gradeIndex: getRopeGradeIndex(grade) }))
        .filter((grade) => grade.gradeIndex >= 0),
    }))
    .filter((training) => training.grades.length > 0);

  if (ropeTrainings.length === 0) {
    return <EmptyState message="Brak treningów z Liną lub MoonBoard i wycen w wybranym okresie." />;
  }

  const gradeIndexes = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => grade.gradeIndex),
  );
  const minimumGradeIndex = Math.max(0, Math.min(...gradeIndexes) - 2);
  const maximumGradeIndex = Math.min(
    ROPE_GRADE_SCALE.length - 1,
    Math.max(...gradeIndexes) + 2,
  );
  const points = ropeTrainings.flatMap((training) =>
    training.grades.map((grade) => ({
      trainingTimestamp: toDate(training.date).getTime(),
      grade: grade.grade,
      gradeIndex: grade.gradeIndex,
      label: `${training.date} ${training.time}`,
    })),
  );
  const chartTicks = getRollingChartTicks(chartRange.start, chartRange.end);

  return (
    <>
      <div style={weightChartCanvasStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
            <CartesianGrid stroke="rgba(100, 87, 77, 0.14)" strokeDasharray="3 5" />
            <XAxis
              type="number"
              dataKey="trainingTimestamp"
              domain={[
                toDate(chartRange.start).getTime(),
                toDate(chartRange.end).getTime(),
              ]}
              ticks={chartTicks}
              tickFormatter={(value) =>
                new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(value))
              }
            />
            <YAxis
              type="number"
              dataKey="gradeIndex"
              domain={[minimumGradeIndex, maximumGradeIndex]}
              ticks={Array.from(
                { length: maximumGradeIndex - minimumGradeIndex + 1 },
                (_value, index) => minimumGradeIndex + index,
              )}
              tickFormatter={(value) => ROPE_GRADE_SCALE[value] ?? ""}
              label={{ value: "Wycena", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(_value, _name, item) => [
                ROPE_GRADE_SCALE[item.payload.gradeIndex] ?? "",
                "Wycena",
              ]}
              labelFormatter={(_value, payload) => payload[0]?.payload.label ?? ""}
            />
            <Scatter data={points} name="Wyceny">
              {points.map((point, index) => (
                <Cell key={`${point.label}-${point.grade}-${index}`} fill={getRopeGradeColor(point.grade)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function TrainingCaloriesChart({
  trainings,
  chartRange,
}: {
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
}) {
  const monthlyTrainings = trainings.filter(
    (training) =>
      training.date >= chartRange.start && training.date <= chartRange.end,
  );

  if (monthlyTrainings.length === 0) {
    return <EmptyState message="Brak treningów w wybranym okresie." />;
  }

  const caloriesByDate = monthlyTrainings.reduce((totals, training) => {
    totals.set(
      training.date,
      (totals.get(training.date) ?? 0) + training.caloriesBurned,
    );
    return totals;
  }, new Map<string, number>());
  const dailyCalories = [] as Array<{ date: string; calories: number }>;
  const cursor = toDate(chartRange.start);

  while (formatDateIso(cursor) <= chartRange.end) {
    const date = formatDateIso(cursor);
    dailyCalories.push({ date, calories: caloriesByDate.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <div style={weightChartCanvasStyle}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dailyCalories} margin={{ top: 12, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid stroke="rgba(100, 87, 77, 0.14)" strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            minTickGap={28}
            tickFormatter={(date) =>
              new Intl.DateTimeFormat("pl-PL", {
                day: "numeric",
                month: "short",
              }).format(toDate(date))
            }
          />
          <YAxis
            tickFormatter={(value) => `${value}`}
            label={{ value: "kcal", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            formatter={(value) => [`${value} kcal`, "Kalorie"]}
            labelFormatter={(date) =>
              new Intl.DateTimeFormat("pl-PL", {
                day: "numeric",
                month: "short",
              }).format(toDate(String(date)))
            }
          />
          <Line
            type="monotone"
            dataKey="calories"
            name="Kalorie"
            stroke="#dc5a45"
            strokeDasharray="6 4"
            strokeWidth={2}
            dot={{ r: 3, fill: "#dc5a45", stroke: "white", strokeWidth: 1 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeightTrendChart({
  entries,
  chartRange,
}: {
  entries: WeightEntryRecord[];
  chartRange: { start: string; end: string };
}) {
  const { selectedDate } = useSelectedDates();

  if (entries.length === 0) {
    return (
      <EmptyState message="Dodaj pierwszy pomiar, aby zobaczyć wykres wagi." />
    );
  }

  const dailyWeights = Array.from(
    entries
      .reduce((groupedEntries, entry) => {
        const date = formatDateIso(entry.date);
        const existingEntry = groupedEntries.get(date) ?? {
          date,
          totalWeight: 0,
          count: 0,
        };

        existingEntry.totalWeight += entry.weightKg;
        existingEntry.count += 1;
        groupedEntries.set(date, existingEntry);

        return groupedEntries;
      }, new Map<string, { date: string; totalWeight: number; count: number }>())
      .values(),
  )
    .map((entry) => ({
      date: entry.date,
      weightKg: roundToSingleDecimal(entry.totalWeight / entry.count),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const chartEntries = dailyWeights.map((entry, index, allEntries) => {
    const weightedEntries = allEntries.slice(Math.max(0, index - 2), index + 1);
    const weightSum = weightedEntries.reduce(
      (sum, weightEntry, weightedIndex) =>
        sum + weightEntry.weightKg * (weightedIndex + 1),
      0,
    );
    const divisor = weightedEntries.reduce(
      (sum, _weightEntry, weightedIndex) => sum + weightedIndex + 1,
      0,
    );

    return {
      date: entry.date,
      label: new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
      }).format(toDate(entry.date)),
      weightKg: entry.weightKg,
      weightedAverage: roundToSingleDecimal(weightSum / divisor),
    };
  });
  const measuredWeights = chartEntries.flatMap((entry) => [
    entry.weightKg,
    entry.weightedAverage,
  ]);
  const todayChartDate = formatDateIso(new Date());
  const selectedChartDate =
    selectedDate &&
    selectedDate >= chartRange.start &&
    selectedDate <= chartRange.end
      ? formatDateIso(selectedDate)
      : null;
  const isFutureSelectedDate =
    selectedChartDate !== null && selectedChartDate > todayChartDate;
  const selectedChartPoint = selectedChartDate
    ? {
        date: selectedChartDate,
        label: new Intl.DateTimeFormat("pl-PL", {
          day: "numeric",
          month: "short",
        }).format(toDate(selectedChartDate)),
        weightKg: null,
        weightedAverage: null,
      }
    : null;
  const latestChartEntry = chartEntries[chartEntries.length - 1];
  const previousChartEntry =
    chartEntries[chartEntries.length - 2] ?? latestChartEntry;
  const trendDays = Math.max(
    1,
    (toDate(latestChartEntry.date).getTime() -
      toDate(previousChartEntry.date).getTime()) /
      86_400_000,
  );
  const trendPerDay =
    (latestChartEntry.weightedAverage - previousChartEntry.weightedAverage) /
    trendDays;
  const selectedDayOffset = selectedChartDate
    ? (toDate(selectedChartDate).getTime() -
        toDate(latestChartEntry.date).getTime()) /
      86_400_000
    : 0;
  const projectedWeight = isFutureSelectedDate
    ? roundToSingleDecimal(
        Math.min(
          latestChartEntry.weightKg + 1,
          Math.max(
            latestChartEntry.weightKg - 1,
            latestChartEntry.weightKg + trendPerDay * selectedDayOffset,
          ),
        ),
      )
    : null;
  const chartWeights =
    projectedWeight === null
      ? measuredWeights
      : [...measuredWeights, projectedWeight];
  const minWeight = Math.min(...chartWeights);
  const maxWeight = Math.max(...chartWeights);
  const domainPadding = Math.max((maxWeight - minWeight) * 0.4, 0.5);
  const axisMinimum = Math.floor(minWeight - domainPadding);
  const axisMaximum = Math.ceil(maxWeight + domainPadding);
  const fullKilogramTicks = Array.from(
    { length: axisMaximum - axisMinimum + 1 },
    (_value, index) => axisMinimum + index,
  );
  const halfKilogramMarks = fullKilogramTicks
    .slice(0, -1)
    .map((tick) => tick + 0.5);
  const chartEntriesByDate = new Map(
    chartEntries.map((entry) => [entry.date, entry]),
  );
  const chartData = [] as Array<{
    date: string;
    label: string;
    weightKg: number | null;
    weightedAverage: number | null;
    projectedWeight: number | null;
  }>;
  const chartCursor = toDate(chartRange.start);

  while (formatDateIso(chartCursor) <= chartRange.end) {
    const date = formatDateIso(chartCursor);
    const entry = chartEntriesByDate.get(date);

    chartData.push({
      date,
      label: entry?.label ?? "",
      weightKg: entry?.weightKg ?? null,
      weightedAverage: entry?.weightedAverage ?? null,
      projectedWeight: date === selectedChartDate ? projectedWeight : null,
    });
    chartCursor.setDate(chartCursor.getDate() + 1);
  }

  return (
    <div style={weightChartCardStyle}>
      <div style={weightChartCanvasStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 8, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="weightTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d16d3f" stopOpacity={0.48} />
                <stop offset="85%" stopColor="#d16d3f" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(100, 87, 77, 0.14)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64574d", fontSize: 11 }}
              minTickGap={28}
              padding={{ left: 14, right: 14 }}
              tickFormatter={(date) =>
                new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                }).format(toDate(date))
              }
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64574d", fontSize: 11 }}
              tickFormatter={(value) => `${value}`}
              domain={[axisMinimum, axisMaximum]}
              ticks={fullKilogramTicks}
            />
            <Tooltip
              cursor={{ stroke: "rgba(209, 109, 63, 0.32)", strokeWidth: 1 }}
              contentStyle={weightChartTooltipStyle}
              formatter={(value, name) => {
                const measuredValue = Array.isArray(value) ? value[0] : value;
                const label =
                  name === "weightKg"
                    ? "Waga"
                    : name === "projectedWeight"
                      ? "Waga projektowana"
                      : "Średnia ważona";

                return [
                  `${typeof measuredValue === "number" ? measuredValue.toFixed(1) : (measuredValue ?? "-")} kg`,
                  label,
                ];
              }}
              labelFormatter={(_label, payload) =>
                payload[0]?.payload.date ?? ""
              }
            />
            {halfKilogramMarks.map((mark) => (
              <ReferenceLine
                key={mark}
                y={mark}
                stroke="rgba(100, 87, 77, 0.1)"
                strokeDasharray="2 5"
              />
            ))}
            <Area
              type="monotone"
              dataKey="weightedAverage"
              stroke="#b84f27"
              strokeWidth={2.5}
              fill="url(#weightTrendFill)"
              dot={false}
              activeDot={false}
              connectNulls
              animationDuration={750}
            />
            <Line
              type="monotone"
              dataKey="weightKg"
              stroke="#176f86"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls
              animationDuration={750}
            />
            {projectedWeight !== null && (
              <>
                <Line
                  type="linear"
                  dataKey="projectedWeight"
                  stroke="#7050a8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  animationDuration={750}
                />
                <ReferenceDot
                  x={selectedChartPoint?.date}
                  y={projectedWeight}
                  r={4}
                  fill="#7050a8"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            )}
            {selectedChartPoint && (
              <ReferenceLine
                x={selectedChartPoint.date}
                stroke="#176f86"
                strokeWidth={2}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}
            <ReferenceLine
              x={todayChartDate}
              stroke="#dc3e4b"
              strokeWidth={1}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={weightChartSummaryStyle}>
        <span>Trend: średnia ważona z maks. 3 pomiarów</span>
        {selectedChartDate && projectedWeight !== null && (
          <span>
            Prognoza na {selectedChartDate}: {projectedWeight.toFixed(1)} kg
          </span>
        )}
        <span>
          Min: {Math.min(...entries.map((entry) => entry.weightKg)).toFixed(1)}{" "}
          kg
        </span>
        <span>
          Max: {Math.max(...entries.map((entry) => entry.weightKg)).toFixed(1)}{" "}
          kg
        </span>
      </div>
    </div>
  );
}

const pageStyle = {
  width: "100vw",
  height: "100vh",
  padding: 0,
};

const shellStyle = {
  position: "relative" as const,
  height: "100vh",
  boxShadow: "var(--glass-shadow)",
  backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
  overflow: "hidden",
};

const pageHeaderStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  zIndex: 20,
  height: 80,
  borderBottom: "1px solid var(--border-strong)",
  background: "rgba(255,255,255,0.58)",
  backdropFilter: "blur(18px) saturate(150%)",
  overflow: "hidden",
};

const pageHeaderTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
};

const pageHeaderBottomStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const pageTitleStyle = {
  fontSize: "clamp(1.4rem, 2.2vw, 2.1rem)",
  margin: "4px 0 4px",
  lineHeight: 0.98,
};

const moduleNavStyle = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "nowrap" as const,
  whiteSpace: "nowrap" as const,
};

const moduleButtonStyle = {
  border: 0,
  padding: 0,
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.86rem",
  lineHeight: 1,
};

const navSeparatorStyle = {
  color: "var(--muted)",
  opacity: 0.7,
};

const headerMetricsStyle = {
  display: "flex",
  flexWrap: "nowrap" as const,
  gap: 10,
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
};

const headerMetricStyle = {
  color: "var(--muted)",
  fontSize: "0.78rem",
  whiteSpace: "nowrap" as const,
};

const contentBodyStyle = {
  position: "relative" as const,
  height: "calc(100vh - 80px)",
  marginTop: 80,
  overflow: "hidden",
  padding: "12px 8px 8px",
};

const statusBoxStyle = {
  padding: 7,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.58), rgba(255,255,255,0.34))",
  border: "1px solid var(--border-strong)",
  color: "var(--muted)",
};

const trainingModuleStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(520px, 520px)",
  gridTemplateRows: "minmax(0, 1fr)",
  gap: 9,
  alignItems: "stretch",
  height: "100%",
  minHeight: 0,
};

const analyticsPanelStyle = {
  display: "grid",
  gap: 9,
  minHeight: 0,
  padding: 0,
  overflowX: "hidden" as const,
  overflowY: "auto" as const,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))",
  border: "1px solid var(--border-strong)",
};

const analyticsPanelInnerStyle = {
  display: "grid",
  gap: 10,
  height: "100%",
  minHeight: 0,
  padding: 11,
  alignContent: "start" as const,
};

const analyticsStatsGridStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
};

const chartCardStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.44))",
};

const weightChartCardStyle = {
  display: "grid",
  gap: 8,
};

const weightChartCanvasStyle = {
  width: "100%",
  height: 180,
  minWidth: 0,
};

const weightChartSummaryStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  color: "var(--muted)",
  fontSize: "0.85rem",
};

const weightChartTooltipStyle = {
  border: "1px solid rgba(209, 109, 63, 0.3)",
  borderRadius: 4,
  background: "rgba(255, 250, 243, 0.96)",
  boxShadow: "0 12px 30px rgba(72, 49, 33, 0.14)",
  color: "var(--text)",
};

const weightEntryModalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 60,
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "rgba(30, 25, 22, 0.34)",
};

const weightEntryModalStyle = {
  display: "grid",
  gap: 14,
  width: "min(100%, 420px)",
  padding: 16,
  background: "rgba(255, 250, 243, 0.98)",
  border: "1px solid var(--border-strong)",
  boxShadow: "0 24px 70px rgba(72, 49, 33, 0.24)",
};

const calendarPanelStyle = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 7,
  height: "100%",
  minHeight: 0,
  padding: 11,
  overflow: "hidden",
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0.3))",
};

const calendarNavStyle = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 8,
  alignItems: "center",
  marginTop: 2,
  marginBottom: 2,
};

const calendarNavLabelStyle = {
  textAlign: "center" as const,
  textTransform: "capitalize" as const,
  fontSize: "1rem",
};

const moduleContentStyle = {
  display: "grid",
  gap: 9,
};

const moduleIntroStyle = {
  display: "grid",
  gap: 8,
  padding: "0 2px",
};

const rangeNavigationStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const navButtonStyle = {
  border: "1px solid var(--border-strong)",
  padding: "5px 7px",
  background: "rgba(255,255,255,0.78)",
  cursor: "pointer",
};

const ghostButtonStyle = {
  border: "1px solid var(--border-strong)",
  padding: "5px 7px",
  background: "rgba(255,255,255,0.46)",
  cursor: "pointer",
};

const rangeLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.95rem",
};

const headerBadgeRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  alignItems: "center",
};

const headerBadgeStyle = {
  padding: "5px 7px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.44))",
  border: "1px solid var(--border-strong)",
  color: "var(--muted)",
  fontSize: "0.88rem",
};

const statsGridStyle = {
  display: "grid",
  gap: 9,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const metricCardStyle = {
  display: "grid",
  gap: 6,
  padding: 8,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.34))",
  border: "1px solid var(--border-strong)",
};

const metricValueStyle = {
  margin: 0,
  fontSize: "1.4rem",
  lineHeight: 1,
};

const panelStyle = {
  display: "grid",
  gap: 9,
  minHeight: 0,
  padding: 11,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))",
  border: "1px solid var(--border-strong)",
};

const panelHeadingStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  flexWrap: "wrap" as const,
};

const sectionTitleStyle = {
  margin: "2px 0 0",
  fontSize: "1rem",
};

const formStyle = {
  display: "grid",
  gap: 9,
};

const formGridStyle = {
  display: "grid",
  gap: 7,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const fieldStyle = {
  display: "grid",
  gap: 4,
  color: "var(--muted)",
  fontSize: "0.95rem",
};

const inputStyle = {
  border: "1px solid var(--border-strong)",
  padding: "7px 8px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
  color: "var(--text)",
  width: "100%",
};

const textAreaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};

const buttonStyle = {
  border: 0,
  padding: "7px 9px",
  background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 18px 30px rgba(195, 102, 58, 0.28)",
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background:
    "linear-gradient(135deg, rgba(49, 44, 40, 0.85), rgba(34, 30, 26, 0.92))",
  boxShadow: "0 18px 30px rgba(35, 29, 25, 0.16)",
};

const actionRowStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
};

const weightControlStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const weightStepButtonStyle = {
  ...ghostButtonStyle,
  minWidth: 34,
  textAlign: "center" as const,
};

const mobileDrawerOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 40,
  display: "grid",
  pointerEvents: "auto" as const,
};

const mobileDrawerBackdropStyle = {
  position: "absolute" as const,
  inset: 0,
  border: 0,
  padding: 0,
  margin: 0,
  width: "100%",
  height: "100%",
  background: "rgba(22, 18, 16, 0.24)",
  cursor: "pointer",
};

const mobileDrawerSheetStyle = {
  position: "relative" as const,
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  padding: 8,
  borderTop: "1px solid var(--border-strong)",
  background: "rgba(245, 244, 241, 0.98)",
  boxShadow: "0 -20px 40px rgba(35, 29, 25, 0.16)",
};

const listCardStyle = {
  padding: 8,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.84), rgba(255,255,255,0.56))",
  border: "1px solid var(--border-strong)",
};

const listCardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
};

const infoGridStyle = {
  display: "grid",
  gap: 6,
  marginTop: 5,
  color: "var(--muted)",
  fontSize: "0.95rem",
};

const scrollListStyle = {
  minHeight: 0,
  maxHeight: "100%",
  overflow: "auto",
  display: "grid",
  gap: 6,
};

const twoColumnLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
  gap: 9,
  alignItems: "start",
};

const eyebrowStyle = {
  margin: 0,
  color: "var(--accent)",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  fontSize: "0.72rem",
  fontWeight: 700,
};

const moduleEyebrowStyle = {
  display: "inline-block",
  color: "var(--accent)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--muted)",
  fontSize: "1rem",
  lineHeight: 1.5,
  maxWidth: 780,
};

const softTagStyle = {
  padding: "4px 6px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.44))",
  border: "1px solid rgba(255,255,255,0.38)",
  color: "var(--accent)",
  fontSize: "0.85rem",
  justifySelf: "start" as const,
};

const softPillStyle = {
  padding: "4px 6px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.52))",
  border: "1px solid rgba(255,255,255,0.34)",
  color: "var(--muted)",
  fontSize: "0.85rem",
};

const moduleShellStyles: Record<
  ModuleKey,
  { background: string; border?: string }
> = {
  treningowy: {
    background: "#ffffff9e",
    border: "1px solid var(--border-strong)",
  },
  raportowy: {
    background: "#ffffff9e",
  },
  analityka: {
    background: "#ffffff9e",
  },
  ustawienia: {
    background: "#ffffff9e",
  },
};

const topBarStyle = {
  height: 80,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  padding: "0 12px",
  overflow: "hidden",
};

const brandStyle = {
  fontSize: "1rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
