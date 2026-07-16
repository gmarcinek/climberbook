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
  actionRowStyle,
  analyticsPanelStyle,
  athleteSelectStyle,
  athleteSelectorLabelStyle,
  athleteSelectorStyle,
  backupDropzoneStyle,
  brandStyle,
  buttonStyle,
  calendarNavLabelStyle,
  calendarNavStyle,
  calendarPanelStyle,
  contentBodyStyle,
  deleteButtonStyle,
  eyebrowStyle,
  fieldStyle,
  formGridStyle,
  formStyle,
  ghostButtonStyle,
  headerBadgeRowStyle,
  headerBadgeStyle,
  headerLeftGroupStyle,
  headerMetricStyle,
  headerMetricsStyle,
  infoGridStyle,
  inputStyle,
  listCardHeaderStyle,
  listCardStyle,
  metricCardStyle,
  metricValueStyle,
  mobileDrawerBackdropStyle,
  mobileDrawerOverlayStyle,
  mobileDrawerSheetStyle,
  moduleButtonStyle,
  moduleContentStyle,
  moduleEyebrowStyle,
  moduleIntroStyle,
  moduleNavStyle,
  moduleShellStyles,
  mutedParagraphStyle,
  navButtonStyle,
  navSeparatorStyle,
  pageHeaderStyle,
  pageStyle,
  pageTitleStyle,
  panelHeadingStyle,
  panelStyle,
  rangeLabelStyle,
  rangeNavigationStyle,
  scrollListStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  settingsContentLayoutStyle,
  settingsMainColumnStyle,
  shellStyle,
  softPillStyle,
  softTagStyle,
  statsGridStyle,
  textAreaStyle,
  topBarStyle,
  trainingModuleStyle,
  twoColumnLayoutStyle,
  weightControlStyle,
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
  weightStepButtonStyle,
} from "@/components/climberbook/common/styles";
import {
  calculateAgeYears,
  createUserProfileDraft,
  createWeightEntryDraft,
  estimateTrainingCalories,
  formatWeightInput,
  getGradeRank,
  getLatestTrainingWeight,
  getLatestWeightEntry,
  getRollingChartRange,
  getSortedWeightEntries,
  getWeekStartIso,
  normalizeTrainingDraft,
  parseHeightInput,
  parseWeightInput,
  roundToSingleDecimal,
  type UserProfileDraft,
  type WeightEntryDraft,
} from "@/components/climberbook/common/training";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EmptyState,
  MetricCard,
  TrainingAnalyticsPanel,
} from "@/components/climberbook/common/charts";
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
  addSection,
  deleteSection,
  listSections,
  assignAthleteToSection,
  addTraining,
  addWeightEntry,
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
  type SectionRecord,
  type TrainingRecord,
  type TrainingSurface,
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

type AthleteFormDraft = {
  firstName: string;
  lastName: string;
  nick: string;
  sectionId: string;
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
    sectionId: "",
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
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
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
    const [athleteItems, allTrainingItems, allWeightItems, sectionItems] =
      await Promise.all([
        listAthletes(),
        listAllTrainings(),
        listAllWeightEntries(),
        listSections(),
      ]);
    const athleteId = activeAthleteId ?? athleteItems[0]?.id;

    setAthletes(athleteItems);
    setSections(sectionItems);
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
  const teamSummaryGroups = useMemo(() => {
    const groups = sections.map((section) => ({
      id: section.id,
      name: section.name,
      summaries: teamSummaries.filter(
        (summary) => summary.athlete.sectionId === section.id,
      ),
    }));
    const unassigned = teamSummaries.filter(
      (summary) =>
        !summary.athlete.sectionId ||
        !sections.some((section) => section.id === summary.athlete.sectionId),
    );

    if (unassigned.length > 0) {
      groups.push({ id: "", name: "Bez sekcji", summaries: unassigned });
    }

    return groups.filter((group) => group.summaries.length > 0);
  }, [sections, teamSummaries]);
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

  async function handleAddSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newSectionName.trim();

    if (!name) {
      return;
    }

    try {
      await addSection(name);
      setNewSectionName("");
      await refreshData();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Nie udało się dodać sekcji.",
      );
    }
  }

  async function handleDeleteSection(section: SectionRecord) {
    if (
      !window.confirm(
        `Usunąć sekcję ${section.name}? Zawodnicy pozostaną, ale bez przypisania.`,
      )
    ) {
      return;
    }

    try {
      await deleteSection(section.id);
      await refreshData();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Nie udało się usunąć sekcji.",
      );
    }
  }

  async function handleAssignAthleteSection(
    athlete: AthleteRecord,
    sectionId: string,
  ) {
    try {
      await assignAthleteToSection(athlete.id, sectionId || null);
      await refreshData();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Nie udało się przypisać zawodnika.",
      );
    }
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
      sectionId: athlete.sectionId ?? "",
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
      sectionId: athleteForm.sectionId || null,
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
                {teamSummaryGroups.map((group) => (
                  <div
                    key={group.id || "none"}
                    style={{ display: "grid", gap: 6 }}
                  >
                    <div style={panelHeadingStyle}>
                      <span style={moduleEyebrowStyle}>{group.name}</span>
                      <span style={softTagStyle}>{group.summaries.length}</span>
                    </div>
                    <div style={statsGridStyle}>
                      {group.summaries.map((summary) => (
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
                  </div>
                ))}
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
                    <form onSubmit={handleAddSection} style={actionRowStyle}>
                      <input
                        value={newSectionName}
                        onChange={(event) =>
                          setNewSectionName(event.target.value)
                        }
                        placeholder="Nazwa sekcji / teamu"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button type="submit" style={buttonStyle}>
                        Dodaj sekcję
                      </button>
                    </form>
                    {sections.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap" as const,
                          gap: 6,
                        }}
                      >
                        {sections.map((section) => (
                          <span
                            key={section.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 8px",
                              border: "1px solid var(--border-strong)",
                              background: "rgba(255,255,255,0.4)",
                            }}
                          >
                            {section.name}
                            <button
                              type="button"
                              style={{
                                border: 0,
                                background: "transparent",
                                cursor: "pointer",
                                color: "var(--muted)",
                                fontSize: "1rem",
                                lineHeight: 1,
                              }}
                              onClick={() => void handleDeleteSection(section)}
                              aria-label={`Usuń sekcję ${section.name}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
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
                              <select
                                value={athlete.sectionId ?? ""}
                                onChange={(event) =>
                                  void handleAssignAthleteSection(
                                    athlete,
                                    event.target.value,
                                  )
                                }
                                style={athleteSelectStyle}
                              >
                                <option value="">Bez sekcji</option>
                                {sections.map((section) => (
                                  <option key={section.id} value={section.id}>
                                    {section.name}
                                  </option>
                                ))}
                              </select>
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
                          Sekcja / Team
                          <select
                            value={athleteForm.sectionId}
                            onChange={(event) =>
                              setAthleteForm((current) => ({
                                ...current,
                                sectionId: event.target.value,
                              }))
                            }
                            style={inputStyle}
                          >
                            <option value="">Bez sekcji</option>
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.name}
                              </option>
                            ))}
                          </select>
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
