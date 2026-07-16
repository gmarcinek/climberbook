"use client";

import {
  DragEvent,
  Fragment,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  moduleConfig,
  type ModuleKey,
} from "@/components/climberbook/common/modules";
import {
  getGradeRank,
  getRollingChartRange,
  getRollingChartTicks,
  getRopeGradeColor,
  getRopeGradeIndex,
  getSortedWeightEntries,
  getWeekStartIso,
  ROPE_GRADE_SCALE,
} from "@/components/climberbook/common/training";
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
  addAthlete,
  updateAthlete,
  deleteAthlete,
  addTraining,
  addWeightEntry,
  createEmptyUserProfile,
  deleteClimberbookDatabase,
  deleteTraining,
  exportDatabaseBackup,
  exportFullDatabaseBackup,
  getUserProfile,
  importDatabaseBackup,
  listAscents,
  listAthletes,
  listAllTrainings,
  listAllWeightEntries,
  listTrainings,
  listWeightEntries,
  saveUserProfile,
  updateTraining,
  type AscentRecord,
  type AthleteRecord,
  type TrainingRecord,
  type TrainingSurface,
  type UserProfileRecord,
  type UserSex,
  type WeightEntryRecord,
} from "@/lib/climbs-db";

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

type AthleteFormDraft = {
  firstName: string;
  lastName: string;
  nick: string;
  birthDate: string;
  sex: UserSex;
  heightCm: string;
  weightKg: string;
};

function createEmptyAthleteForm(): AthleteFormDraft {
  return {
    firstName: "",
    lastName: "",
    nick: "",
    birthDate: "",
    sex: "",
    heightCm: "",
    weightKg: "",
  };
}

const TEAM_CHART_COLORS = [
  "#c3663a",
  "#2f7d6c",
  "#3f6099",
  "#a2465b",
  "#8b6b2d",
];

const SETTINGS_TABS: {
  key: "profil" | "zespol" | "zaawansowane";
  label: string;
}[] = [
  { key: "profil", label: "Profil" },
  { key: "zespol", label: "Zespół" },
  { key: "zaawansowane", label: "Zaawansowane" },
];

const settingsTabNavStyle = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap" as const,
  borderBottom: "1px solid var(--border-strong)",
};

const settingsTabButtonStyle = {
  border: 0,
  background: "transparent",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "0.9rem",
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

export default function ClimberbookApp({
  initialModule = "treningowy",
}: {
  initialModule?: ModuleKey;
}) {
  return (
    <SelectedDatesProvider>
      <HomePageContent initialModule={initialModule} />
    </SelectedDatesProvider>
  );
}

function HomePageContent({ initialModule }: { initialModule: ModuleKey }) {
  const today = formatDateIso(new Date());
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<ModuleKey>(initialModule);
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("climberbook:activeAthleteId");
  });
  const [settingsTab, setSettingsTab] = useState<
    "profil" | "zespol" | "zaawansowane"
  >("profil");
  const [athleteFormMode, setAthleteFormMode] = useState<"add" | "edit">("add");
  const [athleteFormId, setAthleteFormId] = useState<string | null>(null);
  const [athleteForm, setAthleteForm] = useState<AthleteFormDraft>(() =>
    createEmptyAthleteForm(),
  );
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [teamTrainings, setTeamTrainings] = useState<TrainingRecord[]>([]);
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
  const [teamWeightEntries, setTeamWeightEntries] = useState<
    WeightEntryRecord[]
  >([]);
  const [status, setStatus] = useState("Ładowanie danych z IndexedDB...");
  const [isBackupDropActive, setIsBackupDropActive] = useState(false);
  const [isDatabaseDeleteModalOpen, setIsDatabaseDeleteModalOpen] =
    useState(false);
  const [databaseDeleteConfirmation, setDatabaseDeleteConfirmation] =
    useState("");
  const backupImportInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshData() {
    const [athleteItems, allTrainingItems, allWeightItems] = await Promise.all([
      listAthletes(),
      listAllTrainings(),
      listAllWeightEntries(),
    ]);
    const athleteId = activeAthleteId ?? athleteItems[0]?.id;

    setAthletes(athleteItems);
    setTeamTrainings(allTrainingItems);
    setTeamWeightEntries(allWeightItems);

    if (!athleteId) {
      setTrainings([]);
      setAscents([]);
      setProfileDraft(createUserProfileDraft());
      setWeightEntries([]);
      setWeightEntryDraft(createWeightEntryDraft(today));
      return;
    }

    if (athleteId !== activeAthleteId) {
      setActiveAthleteId(athleteId);
      return;
    }

    const [trainingItems, ascentItems, profileRecord, weightItems] =
      await Promise.all([
        listTrainings(athleteId),
        listAscents(athleteId),
        getUserProfile(athleteId),
        listWeightEntries(athleteId),
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
  }, [activeAthleteId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (activeAthleteId) {
      window.localStorage.setItem(
        "climberbook:activeAthleteId",
        activeAthleteId,
      );
    } else {
      window.localStorage.removeItem("climberbook:activeAthleteId");
    }
  }, [activeAthleteId]);

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

    return Array.from(grades, ([grade, count]) => ({ grade, count })).sort(
      (left, right) => getGradeRank(right.grade) - getGradeRank(left.grade),
    );
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
  const weightChartEntries = useMemo(() => {
    return sortedWeightEntries.filter(
      (entry) => entry.date >= chartRange.start && entry.date <= chartRange.end,
    );
  }, [chartRange, sortedWeightEntries]);
  const teamSummaries = useMemo(
    () =>
      athletes.map((athlete) => {
        const athleteTrainings = teamTrainings.filter(
          (training) => training.athleteId === athlete.id,
        );
        const athleteWeights = teamWeightEntries
          .filter((entry) => entry.athleteId === athlete.id)
          .sort((left, right) =>
            `${left.date}-${left.time}`.localeCompare(
              `${right.date}-${right.time}`,
            ),
          );

        return {
          athlete,
          trainingCount: athleteTrainings.length,
          volume: athleteTrainings.reduce(
            (sum, training) => sum + training.durationMinutes,
            0,
          ),
          latestWeight: athleteWeights.at(-1)?.weightKg ?? null,
        };
      }),
    [athletes, teamTrainings, teamWeightEntries],
  );
  const teamWeightChartData = useMemo(() => {
    const weightsByDate = new Map<string, Record<string, number | string>>();

    teamWeightEntries.forEach((entry) => {
      const current = weightsByDate.get(entry.date) ?? { date: entry.date };
      current[entry.athleteId] = entry.weightKg;
      weightsByDate.set(entry.date, current);
    });

    return Array.from(weightsByDate.values())
      .sort((left, right) =>
        String(left.date).localeCompare(String(right.date)),
      )
      .slice(-30);
  }, [teamWeightEntries]);

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
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć treningu.",
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
    const athleteId = activeAthleteId;

    if (!athleteId) {
      setStatus("Najpierw dodaj i wybierz zawodnika.");
      return;
    }

    setStatus("Zapisuję settings...");

    const parsedWeightKg = parseWeightInput(profileDraft.weightKg);
    const parsedHeightCm = parseHeightInput(profileDraft.heightCm);

    try {
      await saveUserProfile({
        key: `athlete:${athleteId}`,
        athleteId,
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
          athleteId,
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
    const athleteId = activeAthleteId;

    if (!athleteId) {
      setStatus("Najpierw dodaj i wybierz zawodnika.");
      return;
    }

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
        await addTraining({ ...payload, athleteId });
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
          athleteId,
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
    const athleteId = activeAthleteId;

    if (!athleteId) {
      setStatus("Najpierw dodaj i wybierz zawodnika.");
      return;
    }

    setStatus("Zapisuję przejście...");

    try {
      await addAscent({ ...ascentDraft, athleteId });
      await refreshData();
      setAscentDraft(createAscentDraft());
    } catch {
      setStatus("Zapis przejścia nie powiódł się.");
    }
  }

  async function handleWeightEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const athleteId = activeAthleteId;

    if (!athleteId) {
      setStatus("Najpierw dodaj i wybierz zawodnika.");
      return false;
    }

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
        athleteId,
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

  async function handleAthleteExport(activeAthlete: AthleteRecord) {
    try {
      const backup = await exportDatabaseBackup(activeAthlete.id);
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      const athleteFileName = activeAthlete.name
        .trim()
        .toLocaleLowerCase("pl-PL")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      link.download = `climberbook-${athleteFileName || "zawodnik"}-${formatDateIso(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(
        `Backup zawodnika ${activeAthlete.name} został wyeksportowany.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Eksport backupu nie powiódł się.",
      );
    }
  }

  async function handleDatabaseExport() {
    try {
      const backup = await exportFullDatabaseBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `climberbook-calosciowy-${formatDateIso(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Pełny backup bazy został wyeksportowany.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Eksport pełnego backupu nie powiódł się.",
      );
    }
  }

  async function handleDatabaseImportFile(file: File) {
    try {
      const athlete = await importDatabaseBackup(JSON.parse(await file.text()));

      if (athlete) {
        setActiveAthleteId(athlete.id);
        setStatus(`Zaimportowano zawodnika ${athlete.name}.`);
      } else {
        setActiveAthleteId(null);
        setStatus("Zaimportowano pełny backup bazy.");
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Import backupu nie powiódł się.",
      );
    }
  }

  function resetAthleteForm() {
    setAthleteFormMode("add");
    setAthleteFormId(null);
    setAthleteForm(createEmptyAthleteForm());
  }

  async function startAthleteEdit(athlete: AthleteRecord) {
    setSettingsTab("zespol");
    setAthleteFormMode("edit");
    setAthleteFormId(athlete.id);

    let profile;
    try {
      profile = await getUserProfile(athlete.id);
    } catch {
      profile = undefined;
    }

    setAthleteForm({
      firstName: athlete.firstName ?? "",
      lastName: athlete.lastName ?? "",
      nick: athlete.nick ?? "",
      birthDate: profile?.birthDate ?? "",
      sex: profile?.sex ?? "",
      heightCm: profile?.heightCm?.toString() ?? "",
      weightKg: formatWeightInput(profile?.weightKg ?? null),
    });
  }

  async function handleAthleteFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasIdentity =
      athleteForm.firstName.trim() ||
      athleteForm.lastName.trim() ||
      athleteForm.nick.trim();

    if (!hasIdentity) {
      setStatus("Podaj imię, nazwisko lub nick zawodnika.");
      return;
    }

    const identity = {
      firstName: athleteForm.firstName,
      lastName: athleteForm.lastName,
      nick: athleteForm.nick,
    };
    const profileData = {
      birthDate: athleteForm.birthDate,
      sex: athleteForm.sex,
      heightCm: parseHeightInput(athleteForm.heightCm),
      weightKg: parseWeightInput(athleteForm.weightKg),
    };

    try {
      if (athleteFormMode === "edit" && athleteFormId) {
        await updateAthlete(athleteFormId, identity);
        await saveUserProfile({
          key: `athlete:${athleteFormId}`,
          athleteId: athleteFormId,
          ...profileData,
        });
        resetAthleteForm();
        await refreshData();
      } else {
        const athlete = await addAthlete(identity);
        await saveUserProfile({
          key: `athlete:${athlete.id}`,
          athleteId: athlete.id,
          ...profileData,
        });
        resetAthleteForm();
        setActiveAthleteId(athlete.id);
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać zawodnika.",
      );
    }
  }

  async function handleDeleteAthlete(athlete: AthleteRecord) {
    if (
      !window.confirm(
        `Usunąć zawodnika ${athlete.name} wraz z jego danymi? Tej operacji nie można cofnąć.`,
      )
    ) {
      return;
    }

    try {
      await deleteAthlete(athlete.id);

      if (activeAthleteId === athlete.id) {
        setActiveAthleteId(null);
      } else {
        await refreshData();
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć zawodnika.",
      );
    }
  }

  async function handleDatabaseImport(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const [file] = Array.from(event.target.files ?? []);

    if (file) {
      await handleDatabaseImportFile(file);
    }

    event.target.value = "";
  }

  function handleBackupDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsBackupDropActive(false);
    const [file] = Array.from(event.dataTransfer.files);

    if (file) {
      void handleDatabaseImportFile(file);
    }
  }

  async function handleDatabaseDelete() {
    if (databaseDeleteConfirmation !== "usuń") {
      return;
    }

    try {
      await deleteClimberbookDatabase();
      window.location.reload();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć bazy danych.",
      );
    }
  }

  function closeDatabaseDeleteModal() {
    setIsDatabaseDeleteModalOpen(false);
    setDatabaseDeleteConfirmation("");
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
            <div
              style={{
                ...headerLeftGroupStyle,
                gridRow: isMobileHeader ? 1 : "auto",
              }}
            >
              <strong style={brandStyle}>Climberbook</strong>

              <label style={athleteSelectorStyle}>
                <span style={athleteSelectorLabelStyle}>Zawodnik</span>
                <select
                  value={activeAthleteId ?? ""}
                  onChange={(event) =>
                    setActiveAthleteId(event.target.value || null)
                  }
                  style={athleteSelectStyle}
                >
                  <option value="">Wybierz zawodnika</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                    onClick={() => {
                      setActiveModule(module.key);
                      router.push(module.route);
                    }}
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
              </div>
            </div>
          )}

          {activeModule === "team" && (
            <div style={moduleContentStyle}>
              <div style={moduleIntroStyle}>
                <div>
                  <p style={eyebrowStyle}>{activeModuleMeta.eyebrow}</p>
                  <h1 style={pageTitleStyle}>{activeModuleMeta.title}</h1>
                  <p style={mutedParagraphStyle}>
                    Podgląd drużyny, porównanie bieżących wyników oraz backupy
                    zawodników.
                  </p>
                </div>
                <div style={headerBadgeRowStyle}>
                  <span style={headerBadgeStyle}>
                    Zawodnicy: {athletes.length}
                  </span>
                  <span style={headerBadgeStyle}>
                    Sesje: {teamTrainings.length}
                  </span>
                </div>
              </div>

              <section style={panelStyle}>
                <div style={panelHeadingStyle}>
                  <div>
                    <span style={moduleEyebrowStyle}>Skład</span>
                    <h2 style={sectionTitleStyle}>Zawodnicy</h2>
                  </div>
                  <span style={softTagStyle}>{athletes.length}</span>
                </div>
                {athletes.length === 0 ? (
                  <p style={mutedParagraphStyle}>
                    Brak zawodników. Dodaj pierwszego w zakładce Zespół w
                    Settings.
                  </p>
                ) : null}
                <div style={statsGridStyle}>
                  {teamSummaries.map((summary) => (
                    <article
                      key={summary.athlete.id}
                      style={{
                        ...metricCardStyle,
                        background:
                          summary.athlete.id === activeAthleteId
                            ? "rgba(195, 102, 58, 0.1)"
                            : metricCardStyle.background,
                      }}
                    >
                      <div style={panelHeadingStyle}>
                        <strong>{summary.athlete.name}</strong>
                        {summary.athlete.id === activeAthleteId ? (
                          <span style={softTagStyle}>Wybrany</span>
                        ) : (
                          <button
                            type="button"
                            style={ghostButtonStyle}
                            onClick={() =>
                              setActiveAthleteId(summary.athlete.id)
                            }
                          >
                            Otwórz
                          </button>
                        )}
                      </div>
                      <span style={mutedParagraphStyle}>
                        {summary.trainingCount} sesji | {summary.volume} min
                      </span>
                      <strong>
                        Waga:{" "}
                        {summary.latestWeight
                          ? `${summary.latestWeight} kg`
                          : "-"}
                      </strong>
                    </article>
                  ))}
                </div>
              </section>

              <section style={panelStyle}>
                <div style={panelHeadingStyle}>
                  <div>
                    <span style={moduleEyebrowStyle}>Porównanie</span>
                    <h2 style={sectionTitleStyle}>Waga zawodników</h2>
                  </div>
                  <span style={softTagStyle}>Ostatnie 30 dat</span>
                </div>
                {teamWeightChartData.length === 0 ? (
                  <EmptyState message="Dodaj pomiary wagi, aby porównać zawodników." />
                ) : (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={teamWeightChartData}>
                        <CartesianGrid
                          vertical={false}
                          stroke="rgba(100, 87, 77, 0.14)"
                        />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={34} />
                        <Tooltip />
                        <Legend />
                        {athletes.map((athlete, index) => (
                          <Line
                            key={athlete.id}
                            type="monotone"
                            dataKey={athlete.id}
                            name={athlete.name}
                            stroke={
                              TEAM_CHART_COLORS[
                                index % TEAM_CHART_COLORS.length
                              ]
                            }
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
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
              </div>

              <div style={settingsTabNavStyle}>
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSettingsTab(tab.key)}
                    style={{
                      ...settingsTabButtonStyle,
                      color:
                        settingsTab === tab.key
                          ? "var(--text)"
                          : "var(--muted)",
                      fontWeight: settingsTab === tab.key ? 700 : 500,
                      borderBottom:
                        settingsTab === tab.key
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {settingsTab === "profil" && (
                <div
                  style={{
                    ...settingsContentLayoutStyle,
                    gridTemplateColumns:
                      trainingViewportWidth > 0 && trainingViewportWidth < 980
                        ? "minmax(0, 1fr)"
                        : "minmax(0, 3fr) minmax(240px, 1fr)",
                  }}
                >
                  <div style={settingsMainColumnStyle}>
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
                          profileDraft.heightCm
                            ? `${profileDraft.heightCm} cm`
                            : "-"
                        }
                        detail="Ustawienie bazowe"
                      />
                      <MetricCard
                        label="Aktualna waga"
                        value={
                          profileDraft.weightKg
                            ? `${profileDraft.weightKg} kg`
                            : "-"
                        }
                        detail="Ustawienie bazowe"
                      />
                      <MetricCard
                        label="Zmiany wagi"
                        value={String(weightEntries.length)}
                        detail="Oddzielne encje: data i waga"
                      />
                    </div>

                    <div style={settingsMainColumnStyle}>
                      <section style={panelStyle}>
                        <div style={panelHeadingStyle}>
                          <div>
                            <span style={moduleEyebrowStyle}>Profil</span>
                            <h2 style={sectionTitleStyle}>
                              Settings użytkownika
                            </h2>
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
                            <label
                              style={{ ...fieldStyle, gridColumn: "1 / -1" }}
                            >
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
                                          (parseWeightInput(current.weightKg) ??
                                            0) - 0.1,
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
                                        (parseWeightInput(current.weightKg) ??
                                          0) + 0.1,
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
                    </div>
                  </div>

                  <section style={panelStyle}>
                    <div style={panelHeadingStyle}>
                      <div>
                        <span style={moduleEyebrowStyle}>Dane</span>
                        <h2 style={sectionTitleStyle}>Pełna kopia bazy</h2>
                      </div>
                      <span style={softTagStyle}>Całość danych</span>
                    </div>
                    <p style={mutedParagraphStyle}>
                      Eksport zapisuje wszystkich zawodników i ich dane. Import
                      rozpoznaje backup całej bazy albo pojedynczego zawodnika.
                    </p>
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
                        Import z pliku
                      </button>
                    </div>
                    <div
                      style={{
                        ...backupDropzoneStyle,
                        borderColor: isBackupDropActive
                          ? "var(--accent)"
                          : "var(--border-strong)",
                        background: isBackupDropActive
                          ? "rgba(195, 102, 58, 0.1)"
                          : "rgba(255,255,255,0.38)",
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => backupImportInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          backupImportInputRef.current?.click();
                        }
                      }}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setIsBackupDropActive(true);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDragLeave={() => setIsBackupDropActive(false)}
                      onDrop={handleBackupDrop}
                    >
                      {isBackupDropActive
                        ? "Upuść backup JSON"
                        : "Przeciągnij backup JSON tutaj"}
                    </div>
                  </section>
                </div>
              )}

              {settingsTab === "zespol" && (
                <div
                  style={{
                    ...settingsContentLayoutStyle,
                    gridTemplateColumns:
                      trainingViewportWidth > 0 && trainingViewportWidth < 980
                        ? "minmax(0, 1fr)"
                        : "minmax(0, 3fr) minmax(280px, 1fr)",
                  }}
                >
                  <section style={panelStyle}>
                    <div style={panelHeadingStyle}>
                      <div>
                        <span style={moduleEyebrowStyle}>Zespół</span>
                        <h2 style={sectionTitleStyle}>Lista zawodników</h2>
                      </div>
                      <span style={softTagStyle}>{athletes.length}</span>
                    </div>
                    <div style={actionRowStyle}>
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
                        Import z pliku
                      </button>
                    </div>
                    {athletes.length === 0 ? (
                      <p style={mutedParagraphStyle}>
                        Brak zawodników. Dodaj pierwszego w formularzu obok.
                      </p>
                    ) : (
                      <div style={{ display: "grid", gap: 6 }}>
                        {athletes.map((athlete) => (
                          <div
                            key={athlete.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              flexWrap: "wrap" as const,
                              padding: "7px 8px",
                              border: "1px solid var(--border-strong)",
                              background:
                                athlete.id === activeAthleteId
                                  ? "rgba(195, 102, 58, 0.1)"
                                  : "rgba(255,255,255,0.35)",
                            }}
                          >
                            <strong style={{ minWidth: 0 }}>
                              {athlete.name}
                            </strong>
                            <div style={actionRowStyle}>
                              <button
                                type="button"
                                style={secondaryButtonStyle}
                                onClick={() =>
                                  void handleAthleteExport(athlete)
                                }
                              >
                                Eksport
                              </button>
                              <button
                                type="button"
                                style={ghostButtonStyle}
                                onClick={() => void startAthleteEdit(athlete)}
                              >
                                Edytuj
                              </button>
                              <button
                                type="button"
                                style={deleteButtonStyle}
                                onClick={() =>
                                  void handleDeleteAthlete(athlete)
                                }
                              >
                                Usuń
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section style={panelStyle}>
                    <div style={panelHeadingStyle}>
                      <div>
                        <span style={moduleEyebrowStyle}>
                          {athleteFormMode === "edit" ? "Edycja" : "Nowy"}
                        </span>
                        <h2 style={sectionTitleStyle}>
                          {athleteFormMode === "edit"
                            ? "Edytuj zawodnika"
                            : "Dodaj zawodnika"}
                        </h2>
                      </div>
                    </div>
                    <form onSubmit={handleAthleteFormSubmit} style={formStyle}>
                      <div style={formGridStyle}>
                        <label style={fieldStyle}>
                          Imię
                          <input
                            value={athleteForm.firstName}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
                                ...current,
                                firstName: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          Nazwisko
                          <input
                            value={athleteForm.lastName}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
                                ...current,
                                lastName: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          Nick
                          <input
                            value={athleteForm.nick}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
                                ...current,
                                nick: event.target.value,
                              }))
                            }
                            placeholder="Wyświetlana nazwa"
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          Data urodzenia
                          <input
                            value={athleteForm.birthDate}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
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
                            value={athleteForm.sex}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
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
                            value={athleteForm.heightCm}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
                                ...current,
                                heightCm: event.target.value,
                              }))
                            }
                            type="number"
                            min="1"
                            step="1"
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          Waga (kg)
                          <input
                            value={athleteForm.weightKg}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
                                ...current,
                                weightKg: event.target.value.replaceAll(
                                  ",",
                                  ".",
                                ),
                              }))
                            }
                            type="number"
                            min="0"
                            step="0.1"
                            style={inputStyle}
                          />
                        </label>
                      </div>
                      <div style={actionRowStyle}>
                        <button type="submit" style={buttonStyle}>
                          {athleteFormMode === "edit"
                            ? "Zapisz zmiany"
                            : "Dodaj zawodnika"}
                        </button>
                        {athleteFormMode === "edit" && (
                          <button
                            type="button"
                            style={ghostButtonStyle}
                            onClick={resetAthleteForm}
                          >
                            Anuluj
                          </button>
                        )}
                      </div>
                    </form>
                  </section>
                </div>
              )}

              {settingsTab === "zaawansowane" && (
                <section style={panelStyle}>
                  <div style={panelHeadingStyle}>
                    <div>
                      <span style={moduleEyebrowStyle}>Zaawansowane</span>
                      <h2 style={sectionTitleStyle}>Strefa niebezpieczna</h2>
                    </div>
                    <span style={softTagStyle}>Nieodwracalne</span>
                  </div>
                  <p style={mutedParagraphStyle}>
                    Usunięcie bazy danych trwale kasuje wszystkich zawodników i
                    ich dane. Zalecany wcześniejszy eksport całości.
                  </p>
                  <div style={actionRowStyle}>
                    <button
                      type="button"
                      style={deleteButtonStyle}
                      onClick={() => setIsDatabaseDeleteModalOpen(true)}
                    >
                      USUŃ BAZĘ DANYCH
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {isDatabaseDeleteModalOpen && (
            <div
              style={weightEntryModalOverlayStyle}
              role="presentation"
              onMouseDown={closeDatabaseDeleteModal}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="database-delete-modal-title"
                style={weightEntryModalStyle}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div style={panelHeadingStyle}>
                  <div>
                    <span style={moduleEyebrowStyle}>Nieodwracalna akcja</span>
                    <h3
                      id="database-delete-modal-title"
                      style={sectionTitleStyle}
                    >
                      Usunąć bazę danych?
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeDatabaseDeleteModal}
                    style={ghostButtonStyle}
                  >
                    Anuluj
                  </button>
                </div>
                <p style={mutedParagraphStyle}>
                  Wszystkie lokalne treningi, przejścia, ustawienia i pomiary
                  wagi zostaną trwale usunięte. Wpisz „usuń”, aby potwierdzić.
                </p>
                <form onSubmit={handleDatabaseDelete} style={formStyle}>
                  <label style={fieldStyle}>
                    Potwierdzenie
                    <input
                      value={databaseDeleteConfirmation}
                      onChange={(event) =>
                        setDatabaseDeleteConfirmation(event.target.value)
                      }
                      placeholder="usuń"
                      autoComplete="off"
                      style={inputStyle}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={databaseDeleteConfirmation !== "usuń"}
                    style={{
                      ...deleteButtonStyle,
                      opacity: databaseDeleteConfirmation === "usuń" ? 1 : 0.45,
                      cursor:
                        databaseDeleteConfirmation === "usuń"
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    USUŃ BAZĘ DANYCH
                  </button>
                </form>
              </section>
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
                      <h2 style={sectionTitleStyle}>
                        Tygodniowy rytm treningu
                      </h2>
                    </div>
                    <span style={softTagStyle}>{chartRangeLabel}</span>
                  </div>

                  {weeklyTrainingStats.length === 0 ? (
                    <EmptyState message="Dodaj treningi, aby zobaczyć tygodniowy rytm." />
                  ) : (
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyTrainingStats}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(28, 61, 89, 0.12)"
                          />
                          <XAxis
                            dataKey="week"
                            tickFormatter={(value) => value.slice(5)}
                          />
                          <YAxis yAxisId="minutes" />
                          <YAxis yAxisId="attempts" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="minutes"
                            dataKey="duration"
                            name="Minuty"
                            fill="#168f91"
                          />
                          <Bar
                            yAxisId="attempts"
                            dataKey="attempts"
                            name="Wstawki"
                            fill="#e19a24"
                          />
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
                          <span style={softPillStyle}>
                            {grade.count} wstawek
                          </span>
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
        <WeightTrendChart
          entries={weightChartEntries}
          chartRange={chartRange}
        />
      </section>

      <section style={chartCardStyle}>
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Treningi z liną i MoonBoard</span>
            <h3 style={sectionTitleStyle}>Wyceny na sesję</h3>
          </div>
          <span style={softPillStyle}>Zakres +/- 2 stopnie</span>
        </div>
        <RopeTrainingGradesChart
          trainings={trainings}
          chartRange={chartRange}
        />
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
        (training.surfaces.includes("lina") ||
          training.surfaces.includes("moon")) &&
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
    return (
      <EmptyState message="Brak treningów z Liną lub MoonBoard i wycen w wybranym okresie." />
    );
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
            <CartesianGrid
              stroke="rgba(100, 87, 77, 0.14)"
              strokeDasharray="3 5"
            />
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
              labelFormatter={(_value, payload) =>
                payload[0]?.payload.label ?? ""
              }
            />
            <Scatter data={points} name="Wyceny">
              {points.map((point, index) => (
                <Cell
                  key={`${point.label}-${point.grade}-${index}`}
                  fill={getRopeGradeColor(point.grade)}
                />
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
        <ComposedChart
          data={dailyCalories}
          margin={{ top: 12, right: 8, bottom: 4, left: -20 }}
        >
          <CartesianGrid
            stroke="rgba(100, 87, 77, 0.14)"
            strokeDasharray="3 5"
          />
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

const settingsContentLayoutStyle = {
  display: "grid",
  gap: 9,
  alignItems: "start",
};

const settingsMainColumnStyle = {
  display: "grid",
  gap: 9,
  minWidth: 0,
};

const backupDropzoneStyle = {
  display: "grid",
  minHeight: 300,
  placeItems: "center",
  padding: 12,
  border: "1px dashed var(--border-strong)",
  background: "rgba(255,255,255,0.38)",
  color: "var(--muted)",
  cursor: "pointer",
  textAlign: "center" as const,
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

const deleteButtonStyle = {
  border: "1px solid #b83d35",
  padding: "7px 9px",
  background: "rgba(184, 61, 53, 0.08)",
  color: "#9e2e28",
  cursor: "pointer",
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
  team: {
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
  whiteSpace: "nowrap" as const,
};

const headerLeftGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
};

const athleteSelectorStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

const athleteSelectorLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.75rem",
  whiteSpace: "nowrap" as const,
};

const athleteSelectStyle = {
  maxWidth: 180,
  border: "1px solid var(--border-strong)",
  padding: "5px 7px",
  background: "rgba(255, 250, 243, 0.92)",
  color: "var(--text)",
};
