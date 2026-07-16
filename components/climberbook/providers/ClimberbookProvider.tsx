"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  createUserProfileDraft,
  createWeightEntryDraft,
  estimateTrainingCalories,
  formatWeightInput,
  getLatestTrainingWeight,
  getLatestWeightEntry,
  normalizeTrainingDraft,
  parseHeightInput,
  parseWeightInput,
  roundToSingleDecimal,
  type UserProfileDraft,
  type WeightEntryDraft,
} from "@/components/climberbook/common/training";
import {
  addMonths,
  formatDateIso,
  getMonthStart,
} from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingDraftValues } from "@/components/training-calendar/TrainingSidebar";
import {
  useSelectedDates,
  SelectedDatesProvider,
} from "@/contexts/SelectedDatesContext";
import {
  addAscent,
  addAthlete,
  addSection,
  addTraining,
  addWeightEntry,
  assignAthleteToSection,
  deleteAthlete,
  deleteClimberbookDatabase,
  deleteSection,
  deleteTraining,
  exportDatabaseBackup,
  exportFullDatabaseBackup,
  getUserProfile,
  inspectDatabaseBackup,
  importDatabaseBackup,
  listAllTrainings,
  listAllWeightEntries,
  listAscents,
  listAthletes,
  listSections,
  listTrainings,
  listWeightEntries,
  saveUserProfile,
  updateAthlete,
  updateTraining,
  type AscentRecord,
  type AthleteRecord,
  type DatabaseImportPreview,
  type SectionRecord,
  type TrainingRecord,
  type TrainingSurface,
  type UserSex,
  type WeightEntryRecord,
} from "@/lib/climbs-db";

export type AscentDraft = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  notes: string;
};
export type AthleteFormDraft = {
  firstName: string;
  lastName: string;
  nick: string;
  sectionId: string;
  birthDate: string;
  sex: UserSex;
  heightCm: string;
  weightKg: string;
};
export type SettingsTab = "profil" | "zespol" | "zaawansowane";

const emptyAthleteForm = (): AthleteFormDraft => ({
  firstName: "",
  lastName: "",
  nick: "",
  sectionId: "",
  birthDate: "",
  sex: "",
  heightCm: "",
  weightKg: "",
});
const emptyAscentDraft = (): AscentDraft => ({
  date: formatDateIso(new Date()),
  source: "panel",
  routeName: "Projekt A",
  suggestedGrade: "7a",
  subjectiveGrade: "7a",
  notes: "",
});
const createTrainingDraft = (
  date: string,
  options: { birthDate?: string; defaultWeightKg?: number | null } = {},
): TrainingDraftValues =>
  normalizeTrainingDraft(
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
    options.birthDate,
  );
const mapTrainingToDraft = (
  training: TrainingRecord,
  birthDate = "",
): TrainingDraftValues =>
  normalizeTrainingDraft(
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

type ClimberbookContextValue = {
  today: string;
  athletes: AthleteRecord[];
  activeAthleteId: string | null;
  setActiveAthleteId: Dispatch<SetStateAction<string | null>>;
  sections: SectionRecord[];
  trainings: TrainingRecord[];
  teamTrainings: TrainingRecord[];
  ascents: AscentRecord[];
  weightEntries: WeightEntryRecord[];
  teamWeightEntries: WeightEntryRecord[];
  selectedDate: string | null;
  trainingRangeStart: string;
  settingsTab: SettingsTab;
  setSettingsTab: Dispatch<SetStateAction<SettingsTab>>;
  athleteFormMode: "add" | "edit";
  athleteForm: AthleteFormDraft;
  setAthleteForm: Dispatch<SetStateAction<AthleteFormDraft>>;
  newSectionName: string;
  setNewSectionName: Dispatch<SetStateAction<string>>;
  profileDraft: UserProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<UserProfileDraft>>;
  weightEntryDraft: WeightEntryDraft;
  setWeightEntryDraft: Dispatch<SetStateAction<WeightEntryDraft>>;
  trainingDraft: TrainingDraftValues;
  editingTrainingId: number | null;
  ascentDraft: AscentDraft;
  setAscentDraft: Dispatch<SetStateAction<AscentDraft>>;
  status: string;
  importPreview: DatabaseImportPreview | null;
  isImportPreviewOpen: boolean;
  isImportingBackup: boolean;
  isBackupDropActive: boolean;
  setIsBackupDropActive: Dispatch<SetStateAction<boolean>>;
  isDatabaseDeleteModalOpen: boolean;
  setIsDatabaseDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
  databaseDeleteConfirmation: string;
  setDatabaseDeleteConfirmation: Dispatch<SetStateAction<string>>;
  backupImportInputRef: React.RefObject<HTMLInputElement | null>;
  refreshData: () => Promise<void>;
  selectTrainingDate: (date: string) => void;
  resetTrainingSelection: () => void;
  previousTrainingMonth: () => void;
  nextTrainingMonth: () => void;
  setTrainingDraft: (draft: TrainingDraftValues) => void;
  toggleSurface: (surface: TrainingSurface) => void;
  submitTraining: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  editTraining: (training: TrainingRecord) => void;
  deleteTraining: (training: TrainingRecord) => Promise<void>;
  submitWeightEntry: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  submitAscent: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  submitSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  exportDatabase: () => Promise<void>;
  importDatabase: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  dropBackup: (event: DragEvent<HTMLDivElement>) => void;
  confirmImportPreview: () => Promise<void>;
  closeImportPreview: () => void;
  addSection: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteSection: (section: SectionRecord) => Promise<void>;
  assignAthleteSection: (
    athlete: AthleteRecord,
    sectionId: string,
  ) => Promise<void>;
  exportAthlete: (athlete: AthleteRecord) => Promise<void>;
  startAthleteEdit: (athlete: AthleteRecord) => Promise<void>;
  submitAthlete: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetAthleteForm: () => void;
  deleteAthlete: (athlete: AthleteRecord) => Promise<void>;
  deleteDatabase: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  closeDatabaseDeleteModal: () => void;
};
const ClimberbookContext = createContext<ClimberbookContextValue | null>(null);

function ClimberbookDataProvider({ children }: { children: ReactNode }) {
  const today = formatDateIso(new Date());
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("climberbook:activeAthleteId"),
  );
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [teamTrainings, setTeamTrainings] = useState<TrainingRecord[]>([]);
  const [ascents, setAscents] = useState<AscentRecord[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntryRecord[]>([]);
  const [teamWeightEntries, setTeamWeightEntries] = useState<
    WeightEntryRecord[]
  >([]);
  const { selectedDate, setSelectedDate } = useSelectedDates();
  const [trainingRangeStart, setTrainingRangeStart] = useState(
    getMonthStart(today),
  );
  const [trainingDraft, setTrainingDraftState] = useState<TrainingDraftValues>(
    () => createTrainingDraft(today),
  );
  const [editingTrainingId, setEditingTrainingId] = useState<number | null>(
    null,
  );
  const [ascentDraft, setAscentDraft] = useState<AscentDraft>(emptyAscentDraft);
  const [profileDraft, setProfileDraft] = useState<UserProfileDraft>(
    createUserProfileDraft,
  );
  const [weightEntryDraft, setWeightEntryDraft] = useState<WeightEntryDraft>(
    () => createWeightEntryDraft(today),
  );
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profil");
  const [athleteFormMode, setAthleteFormMode] = useState<"add" | "edit">("add");
  const [athleteFormId, setAthleteFormId] = useState<string | null>(null);
  const [athleteForm, setAthleteForm] =
    useState<AthleteFormDraft>(emptyAthleteForm);
  const [newSectionName, setNewSectionName] = useState("");
  const [status, setStatus] = useState("Ładowanie danych z IndexedDB...");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importPreview, setImportPreview] =
    useState<DatabaseImportPreview | null>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [isBackupDropActive, setIsBackupDropActive] = useState(false);
  const [isDatabaseDeleteModalOpen, setIsDatabaseDeleteModalOpen] =
    useState(false);
  const [databaseDeleteConfirmation, setDatabaseDeleteConfirmation] =
    useState("");
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const pendingImportFileRef = useRef<File | null>(null);

  function showSuccessToast(message: string) {
    if (toastTimeoutRef.current !== null)
      window.clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 2800);
  }

  useEffect(
    () => () => {
      if (toastTimeoutRef.current !== null)
        window.clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  async function refreshData() {
    const [athleteItems, allTrainingItems, allWeightItems, sectionItems] =
      await Promise.all([
        listAthletes(),
        listAllTrainings(),
        listAllWeightEntries(),
        listSections(),
      ]);
    const athleteId = athleteItems.some(
      (athlete) => athlete.id === activeAthleteId,
    )
      ? activeAthleteId
      : (athleteItems[0]?.id ?? null);
    setAthletes(athleteItems);
    setSections(sectionItems);
    setTeamTrainings(allTrainingItems);
    setTeamWeightEntries(allWeightItems);
    if (!athleteId) {
      setTrainings([]);
      setAscents([]);
      setProfileDraft(createUserProfileDraft());
      setWeightEntries([]);
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
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
    setProfileDraft(createUserProfileDraft(profileRecord));
    setWeightEntries(
      weightItems
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
    setWeightEntryDraft(
      createWeightEntryDraft(
        today,
        getLatestWeightEntry(weightItems)?.weightKg ??
          getLatestTrainingWeight(trainingItems) ??
          profileRecord.weightKg,
      ),
    );
    setStatus(
      trainingItems.length || ascentItems.length
        ? "Dane zostały załadowane z lokalnej bazy."
        : "Baza działa. Możesz zacząć wpisywać treningi i historię przejść.",
    );
  }
  useEffect(() => {
    void refreshData().catch(() =>
      setStatus("Nie udało się otworzyć IndexedDB w tej przeglądarce."),
    );
  }, [activeAthleteId]);
  useEffect(() => {
    if (activeAthleteId)
      window.localStorage.setItem(
        "climberbook:activeAthleteId",
        activeAthleteId,
      );
    else window.localStorage.removeItem("climberbook:activeAthleteId");
  }, [activeAthleteId]);
  const defaultWeight =
    getLatestWeightEntry(weightEntries)?.weightKg ??
    getLatestTrainingWeight(trainings) ??
    parseWeightInput(profileDraft.weightKg);
  function resetTrainingEditor(date = selectedDate ?? today) {
    setEditingTrainingId(null);
    setTrainingDraftState(
      createTrainingDraft(date, {
        birthDate: profileDraft.birthDate,
        defaultWeightKg: defaultWeight,
      }),
    );
  }
  function setTrainingDraft(draft: TrainingDraftValues) {
    setTrainingDraftState(
      normalizeTrainingDraft(draft, profileDraft.birthDate),
    );
  }
  function selectTrainingDate(date: string) {
    if (selectedDate === date) {
      setSelectedDate(null);
      resetTrainingEditor(today);
    } else {
      setSelectedDate(date);
      resetTrainingEditor(date);
    }
  }
  function resetTrainingSelection() {
    setSelectedDate(null);
    resetTrainingEditor(today);
  }
  async function submitTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAthleteId || !trainingDraft.surfaces.length) {
      setStatus(
        !activeAthleteId
          ? "Najpierw dodaj i wybierz zawodnika."
          : "Wybierz co najmniej jeden rodzaj sesji.",
      );
      return;
    }
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
      const current = trainings.find(
        (training) => training.id === editingTrainingId,
      );
      if (editingTrainingId !== null && !current)
        throw new Error("Nie znaleziono treningu do edycji.");
      if (current) await updateTraining({ ...current, ...payload });
      else await addTraining({ ...payload, athleteId: activeAthleteId });
      if (
        payload.bodyWeightKg > 0 &&
        !weightEntries.some(
          (entry) =>
            entry.date === payload.date &&
            entry.time === payload.time &&
            entry.weightKg === payload.bodyWeightKg,
        )
      )
        await addWeightEntry({
          athleteId: activeAthleteId,
          date: payload.date,
          time: payload.time,
          weightKg: payload.bodyWeightKg,
        });
      await refreshData();
      resetTrainingSelection();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Zapis treningu nie powiódł się.",
      );
    }
  }
  async function deleteTrainingAction(training: TrainingRecord) {
    if (
      training.id === undefined ||
      !window.confirm("Usunąć ten trening? Tej operacji nie można cofnąć.")
    )
      return;
    await deleteTraining(training.id);
    await refreshData();
    if (editingTrainingId === training.id) resetTrainingEditor();
  }
  async function submitWeightEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weightKg = parseWeightInput(weightEntryDraft.weightKg);
    if (
      !activeAthleteId ||
      !weightEntryDraft.date ||
      weightKg === null ||
      weightKg <= 0
    )
      return false;
    await addWeightEntry({
      athleteId: activeAthleteId,
      date: weightEntryDraft.date,
      time: weightEntryDraft.time,
      weightKg,
    });
    await refreshData();
    setWeightEntryDraft(createWeightEntryDraft(today, weightKg));
    return true;
  }
  async function submitAscent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAthleteId) return;
    await addAscent({ ...ascentDraft, athleteId: activeAthleteId });
    await refreshData();
    setAscentDraft(emptyAscentDraft());
  }
  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAthleteId) return;
    const weightKg = parseWeightInput(profileDraft.weightKg);
    await saveUserProfile({
      key: `athlete:${activeAthleteId}`,
      athleteId: activeAthleteId,
      birthDate: profileDraft.birthDate,
      sex: profileDraft.sex,
      heightCm: parseHeightInput(profileDraft.heightCm),
      weightKg,
    });
    if (
      weightKg &&
      (!getLatestWeightEntry(weightEntries) ||
        getLatestWeightEntry(weightEntries)?.weightKg !== weightKg)
    )
      await addWeightEntry({
        athleteId: activeAthleteId,
        date: today,
        time: "09:00",
        weightKg,
      });
    await refreshData();
  }
  async function download(backup: unknown, filename: string) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function exportDatabase() {
    await download(
      await exportFullDatabaseBackup(),
      `climberbook-calosciowy-${today}.json`,
    );
    showSuccessToast("Eksport bazy zakończony sukcesem.");
  }
  async function exportAthlete(athlete: AthleteRecord) {
    await download(
      await exportDatabaseBackup(athlete.id),
      `climberbook-${athlete.name || "zawodnik"}-${today}.json`,
    );
    showSuccessToast(`Eksport zawodnika ${athlete.name} zakończony sukcesem.`);
  }
  async function importFile(file: File) {
    const athlete = await importDatabaseBackup(JSON.parse(await file.text()));
    setActiveAthleteId(athlete?.id ?? null);
    await refreshData();
    showSuccessToast("Import backupu zakończony sukcesem.");
  }
  async function prepareImportFile(file: File) {
    const text = await file.text();
    const preview = await inspectDatabaseBackup(JSON.parse(text));
    pendingImportFileRef.current = file;
    setImportPreview(preview);
    setIsImportPreviewOpen(true);
  }
  async function importDatabase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await prepareImportFile(file);
    event.target.value = "";
  }
  function dropBackup(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsBackupDropActive(false);
    const file = event.dataTransfer.files[0];
    if (file) void prepareImportFile(file);
  }
  async function confirmImportPreview() {
    const file = pendingImportFileRef.current;
    if (!file) return;
    setIsImportingBackup(true);
    try {
      await importFile(file);
      pendingImportFileRef.current = null;
      setImportPreview(null);
      setIsImportPreviewOpen(false);
    } finally {
      setIsImportingBackup(false);
    }
  }
  function closeImportPreview() {
    pendingImportFileRef.current = null;
    setImportPreview(null);
    setIsImportPreviewOpen(false);
  }
  async function addSectionAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newSectionName.trim()) {
      await addSection(newSectionName.trim());
      setNewSectionName("");
      await refreshData();
    }
  }
  async function deleteSectionAction(section: SectionRecord) {
    if (
      window.confirm(
        `Usunąć sekcję ${section.name}? Zawodnicy pozostaną, ale bez przypisania.`,
      )
    ) {
      await deleteSection(section.id);
      await refreshData();
    }
  }
  async function assignAthleteSection(
    athlete: AthleteRecord,
    sectionId: string,
  ) {
    await assignAthleteToSection(athlete.id, sectionId || null);
    await refreshData();
  }
  async function startAthleteEdit(athlete: AthleteRecord) {
    const profile = await getUserProfile(athlete.id);
    setSettingsTab("zespol");
    setAthleteFormMode("edit");
    setAthleteFormId(athlete.id);
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
  function resetAthleteForm() {
    setAthleteFormMode("add");
    setAthleteFormId(null);
    setAthleteForm(emptyAthleteForm());
  }
  async function submitAthlete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!athleteForm.nick.trim()) {
      setStatus("Podaj przynajmniej nick zawodnika.");
      return;
    }
    const identity = {
      firstName: athleteForm.firstName,
      lastName: athleteForm.lastName,
      nick: athleteForm.nick,
      sectionId: athleteForm.sectionId || null,
    };
    const profile = {
      birthDate: athleteForm.birthDate,
      sex: athleteForm.sex,
      heightCm: parseHeightInput(athleteForm.heightCm),
      weightKg: parseWeightInput(athleteForm.weightKg),
    };
    if (athleteFormMode === "edit" && athleteFormId) {
      await updateAthlete(athleteFormId, identity);
      await saveUserProfile({
        key: `athlete:${athleteFormId}`,
        athleteId: athleteFormId,
        ...profile,
      });
      await refreshData();
    } else {
      const athlete = await addAthlete(identity);
      await saveUserProfile({
        key: `athlete:${athlete.id}`,
        athleteId: athlete.id,
        ...profile,
      });
      setActiveAthleteId(athlete.id);
    }
    resetAthleteForm();
  }
  async function deleteAthleteAction(athlete: AthleteRecord) {
    if (
      window.confirm(
        `Usunąć zawodnika ${athlete.name} wraz z jego danymi? Tej operacji nie można cofnąć.`,
      )
    ) {
      await deleteAthlete(athlete.id);
      if (activeAthleteId === athlete.id) setActiveAthleteId(null);
      else await refreshData();
    }
  }
  async function deleteDatabase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (databaseDeleteConfirmation === "usuń") {
      await deleteClimberbookDatabase();
      window.location.reload();
    }
  }
  const value: ClimberbookContextValue = {
    today,
    athletes,
    activeAthleteId,
    setActiveAthleteId,
    sections,
    trainings,
    teamTrainings,
    ascents,
    weightEntries,
    teamWeightEntries,
    selectedDate,
    trainingRangeStart,
    settingsTab,
    setSettingsTab,
    athleteFormMode,
    athleteForm,
    setAthleteForm,
    newSectionName,
    setNewSectionName,
    profileDraft,
    setProfileDraft,
    weightEntryDraft,
    setWeightEntryDraft,
    trainingDraft,
    editingTrainingId,
    ascentDraft,
    setAscentDraft,
    status,
    importPreview,
    isImportPreviewOpen,
    isImportingBackup,
    isBackupDropActive,
    setIsBackupDropActive,
    isDatabaseDeleteModalOpen,
    setIsDatabaseDeleteModalOpen,
    databaseDeleteConfirmation,
    setDatabaseDeleteConfirmation,
    backupImportInputRef,
    refreshData,
    selectTrainingDate,
    resetTrainingSelection,
    previousTrainingMonth: () =>
      setTrainingRangeStart(addMonths(trainingRangeStart, -1)),
    nextTrainingMonth: () =>
      setTrainingRangeStart(addMonths(trainingRangeStart, 1)),
    setTrainingDraft,
    toggleSurface: (surface) =>
      setTrainingDraftState((draft) => ({
        ...draft,
        surfaces: draft.surfaces.includes(surface)
          ? draft.surfaces.filter((item) => item !== surface)
          : [...draft.surfaces, surface],
      })),
    submitTraining,
    editTraining: (training) => {
      setSelectedDate(training.date);
      setEditingTrainingId(training.id ?? null);
      setTrainingDraftState(
        mapTrainingToDraft(training, profileDraft.birthDate),
      );
    },
    deleteTraining: deleteTrainingAction,
    submitWeightEntry,
    submitAscent,
    submitSettings,
    exportDatabase,
    importDatabase,
    dropBackup,
    confirmImportPreview,
    closeImportPreview,
    addSection: addSectionAction,
    deleteSection: deleteSectionAction,
    assignAthleteSection,
    exportAthlete,
    startAthleteEdit,
    submitAthlete,
    resetAthleteForm,
    deleteAthlete: deleteAthleteAction,
    deleteDatabase,
    closeDatabaseDeleteModal: () => {
      setIsDatabaseDeleteModalOpen(false);
      setDatabaseDeleteConfirmation("");
    },
  };
  return (
    <ClimberbookContext.Provider value={value}>
      {children}
      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: "1.5rem",
            bottom: "1.5rem",
            zIndex: 1000,
            maxWidth: "min(26rem, calc(100vw - 2rem))",
            padding: "0.85rem 1rem",
            borderRadius: "14px",
            border: "1px solid rgba(195, 102, 58, 0.28)",
            background: "rgba(18, 18, 18, 0.92)",
            color: "#fff7f2",
            boxShadow: "0 18px 38px rgba(0, 0, 0, 0.24)",
            fontSize: "0.94rem",
            lineHeight: 1.4,
            backdropFilter: "blur(14px)",
          }}
        >
          {toastMessage}
        </div>
      ) : null}
    </ClimberbookContext.Provider>
  );
}
export function ClimberbookProvider({ children }: { children: ReactNode }) {
  return (
    <SelectedDatesProvider>
      <ClimberbookDataProvider>{children}</ClimberbookDataProvider>
    </SelectedDatesProvider>
  );
}
export function useClimberbook() {
  const context = useContext(ClimberbookContext);
  if (!context)
    throw new Error("useClimberbook must be used within ClimberbookProvider");
  return context;
}
export function useTrainingModule() {
  const {
    ascents,
    editingTrainingId,
    editTraining,
    deleteTraining,
    nextTrainingMonth,
    previousTrainingMonth,
    profileDraft,
    resetTrainingSelection,
    selectedDate,
    selectTrainingDate,
    setTrainingDraft,
    setWeightEntryDraft,
    submitTraining,
    submitWeightEntry,
    teamTrainings,
    today,
    toggleSurface,
    trainingDraft,
    trainingRangeStart,
    trainings,
    weightEntries,
    weightEntryDraft,
  } = useClimberbook();
  return {
    ascents,
    editingTrainingId,
    editTraining,
    deleteTraining,
    nextTrainingMonth,
    previousTrainingMonth,
    profileDraft,
    resetTrainingSelection,
    selectedDate,
    selectTrainingDate,
    setTrainingDraft,
    setWeightEntryDraft,
    submitTraining,
    submitWeightEntry,
    teamTrainings,
    today,
    toggleSurface,
    trainingDraft,
    trainingRangeStart,
    trainings,
    weightEntries,
    weightEntryDraft,
  };
}
export function useReportsModule() {
  const {
    ascents,
    ascentDraft,
    profileDraft,
    selectedDate,
    setAscentDraft,
    submitAscent,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
  } = useClimberbook();
  return {
    ascents,
    ascentDraft,
    profileDraft,
    selectedDate,
    setAscentDraft,
    submitAscent,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
  };
}
export function useAnalyticsModule() {
  const {
    ascents,
    profileDraft,
    selectedDate,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
  } = useClimberbook();
  return {
    ascents,
    profileDraft,
    selectedDate,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
  };
}
export function useTeamModule() {
  const {
    activeAthleteId,
    athletes,
    sections,
    setActiveAthleteId,
    teamTrainings,
    teamWeightEntries,
  } = useClimberbook();
  return {
    activeAthleteId,
    athletes,
    sections,
    setActiveAthleteId,
    teamTrainings,
    teamWeightEntries,
  };
}
export function useSettingsModule() {
  const {
    activeAthleteId,
    addSection,
    ascents,
    athleteForm,
    athleteFormMode,
    athletes,
    backupImportInputRef,
    closeDatabaseDeleteModal,
    databaseDeleteConfirmation,
    deleteAthlete,
    deleteDatabase,
    deleteSection,
    dropBackup,
    exportAthlete,
    exportDatabase,
    importDatabase,
    confirmImportPreview,
    closeImportPreview,
    isBackupDropActive,
    importPreview,
    isImportPreviewOpen,
    isImportingBackup,
    isDatabaseDeleteModalOpen,
    newSectionName,
    profileDraft,
    resetAthleteForm,
    sections,
    selectedDate,
    setAthleteForm,
    setDatabaseDeleteConfirmation,
    setIsBackupDropActive,
    setIsDatabaseDeleteModalOpen,
    setNewSectionName,
    setProfileDraft,
    setSettingsTab,
    startAthleteEdit,
    submitAthlete,
    submitSettings,
    teamTrainings,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
    assignAthleteSection,
    settingsTab,
  } = useClimberbook();
  return {
    activeAthleteId,
    addSection,
    ascents,
    athleteForm,
    athleteFormMode,
    athletes,
    backupImportInputRef,
    closeDatabaseDeleteModal,
    databaseDeleteConfirmation,
    deleteAthlete,
    deleteDatabase,
    deleteSection,
    dropBackup,
    exportAthlete,
    exportDatabase,
    importDatabase,
    confirmImportPreview,
    closeImportPreview,
    importPreview,
    isImportPreviewOpen,
    isImportingBackup,
    isBackupDropActive,
    isDatabaseDeleteModalOpen,
    newSectionName,
    profileDraft,
    resetAthleteForm,
    sections,
    selectedDate,
    setAthleteForm,
    setDatabaseDeleteConfirmation,
    setIsBackupDropActive,
    setIsDatabaseDeleteModalOpen,
    setNewSectionName,
    setProfileDraft,
    setSettingsTab,
    startAthleteEdit,
    submitAthlete,
    submitSettings,
    teamTrainings,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
    assignAthleteSection,
    settingsTab,
  };
}
