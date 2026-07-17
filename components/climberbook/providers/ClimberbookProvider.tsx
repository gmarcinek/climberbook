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
  getLegacyRopeAttempts,
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
import { TrainingEmptyState } from "@/components/climberbook/modules/training/components/TrainingEmptyState";
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
  updateAscent,
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
import { createSampleBackupData } from "@/lib/sample-backup";

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
const createPullUpProtocolSet = () => ({ sets: "1", loadDeloadKg: "0" });
const createHangboardProtocolSet = () => ({
  sets: "1",
  usesRpm: "nie" as const,
  loadDeloadKg: "0",
  edgeDepthMm: "20",
});
function asProtocolSetList<T>(value: T[] | undefined) {
  if (Array.isArray(value)) return value;

  return value ? [value as unknown as T] : [];
}
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
      difficultyNotes: "",
      difficultyBySurface: {},
      protocol: {
        pullUp: [createPullUpProtocolSet()],
        hangboard: [createHangboardProtocolSet()],
      },
      wellbeing: "",
      surfaces: [],
      customSessionType: "",
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
      difficultyNotes: training.difficultyNotes,
      difficultyBySurface: training.difficultyBySurface ?? {},
      protocol: {
        pullUp: asProtocolSetList(training.protocol?.pullUp).map(
          (protocolSet) => ({
            sets: String(protocolSet.sets),
            loadDeloadKg: String(protocolSet.loadDeloadKg),
          }),
        ),
        hangboard: asProtocolSetList(training.protocol?.hangboard).map(
          (protocolSet) => ({
            sets: String(protocolSet.sets),
            usesRpm: protocolSet.usesRpm ? "tak" : "nie",
            loadDeloadKg: String(protocolSet.loadDeloadKg),
            edgeDepthMm: String(protocolSet.edgeDepthMm),
          }),
        ),
      },
      wellbeing: training.wellbeing,
      surfaces: training.surfaces,
      customSessionType: training.customSessionType ?? "",
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
  editingAscentId: number | null;
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
  editAscent: (ascent: AscentRecord) => void;
  cancelAscentEdit: () => void;
  submitSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  exportDatabase: () => Promise<void>;
  importDatabase: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  loadSampleData: () => Promise<void>;
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
  submitAthlete: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
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
  const [editingAscentId, setEditingAscentId] = useState<number | null>(null);
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
  const [status, setStatus] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importPreview, setImportPreview] =
    useState<DatabaseImportPreview | null>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState(false);
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
    setIsDatabaseEmpty(
      athleteItems.length === 0 &&
        allTrainingItems.length === 0 &&
        allWeightItems.length === 0 &&
        sectionItems.length === 0,
    );
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
      setEditingAscentId(null);
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
        getLatestWeightEntry(weightItems)?.weightKg ?? profileRecord.weightKg,
      ),
    );
    setStatus(trainingItems.length || ascentItems.length ? "" : "");
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
    parseWeightInput(profileDraft.weightKg) ??
    getLatestTrainingWeight(trainings);
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
    const customSessionType = trainingDraft.customSessionType.trim();
    const bodyWeightKg = parseWeightInput(trainingDraft.bodyWeightKg);

    if (
      !activeAthleteId ||
      (!trainingDraft.surfaces.length && !customSessionType)
    ) {
      setStatus(
        !activeAthleteId
          ? "Najpierw dodaj i wybierz zawodnika."
          : "Wybierz co najmniej jeden rodzaj sesji lub wpisz własny typ w polu Inne.",
      );
      return;
    }
    if (bodyWeightKg === null || bodyWeightKg <= 0) {
      setStatus(
        "Ustaw aktualną wagę w profilu lub w module wag przed zapisem treningu.",
      );
      return;
    }
    const payload = {
      date: trainingDraft.date,
      time: trainingDraft.time,
      durationMinutes: Number(trainingDraft.durationMinutes),
      bodyWeightKg,
      ageYears: Number(trainingDraft.ageYears || 0),
      caloriesBurned:
        trainingDraft.caloriesBurned === ""
          ? Number(
              estimateTrainingCalories({
                ...trainingDraft,
                attemptsCount: String(
                  getLegacyRopeAttempts(trainingDraft.difficultyBySurface),
                ),
              }) || 0,
            )
          : Number(trainingDraft.caloriesBurned),
      attemptsCount: getLegacyRopeAttempts(trainingDraft.difficultyBySurface),
      difficultyNotes: Object.values(trainingDraft.difficultyBySurface)
        .map((grades) => grades?.trim())
        .filter(Boolean)
        .join(", "),
      difficultyBySurface: trainingDraft.difficultyBySurface,
      protocol: {
        ...(trainingDraft.surfaces.includes("drazek") && {
          pullUp: trainingDraft.protocol.pullUp.map((protocolSet) => ({
            sets: Number(protocolSet.sets || 0),
            loadDeloadKg: Number(protocolSet.loadDeloadKg),
          })),
        }),
        ...(trainingDraft.surfaces.includes("chwytotablica") && {
          hangboard: trainingDraft.protocol.hangboard.map((protocolSet) => ({
            sets: Number(protocolSet.sets || 0),
            usesRpm: protocolSet.usesRpm === "tak",
            loadDeloadKg: Number(protocolSet.loadDeloadKg),
            edgeDepthMm: Number(protocolSet.edgeDepthMm || 0),
          })),
        }),
      },
      wellbeing: trainingDraft.wellbeing,
      surfaces: trainingDraft.surfaces,
      customSessionType,
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
    if (editingAscentId !== null) {
      await updateAscent({
        id: editingAscentId,
        athleteId: activeAthleteId,
        ...ascentDraft,
      });
    } else {
      await addAscent({ ...ascentDraft, athleteId: activeAthleteId });
    }
    await refreshData();
    setEditingAscentId(null);
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
  async function prepareImportValue(value: unknown) {
    const preview = await inspectDatabaseBackup(value);
    pendingImportFileRef.current = new File(
      [JSON.stringify(value, null, 2)],
      "climberbook-sample-data.json",
      { type: "application/json" },
    );
    setImportPreview(preview);
    setIsImportPreviewOpen(true);
  }
  async function importDatabase(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await prepareImportFile(file);
    event.target.value = "";
  }
  async function loadSampleData() {
    await prepareImportValue(createSampleBackupData());
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
      return false;
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
    return true;
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
    editingAscentId,
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
    editAscent: (ascent) => {
      setEditingAscentId(ascent.id ?? null);
      setAscentDraft({
        date: ascent.date,
        source: ascent.source,
        routeName: ascent.routeName,
        suggestedGrade: ascent.suggestedGrade,
        subjectiveGrade: ascent.subjectiveGrade,
        notes: ascent.notes,
      });
    },
    cancelAscentEdit: () => {
      setEditingAscentId(null);
      setAscentDraft(emptyAscentDraft());
    },
    submitSettings,
    exportDatabase,
    importDatabase,
    loadSampleData,
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
      {isDatabaseEmpty ? (
        <TrainingEmptyState
          athleteFormMode={athleteFormMode}
          athleteForm={athleteForm}
          setAthleteForm={setAthleteForm}
          sections={sections}
          validationMessage={status}
          onAthleteFormSubmit={submitAthlete}
          onResetAthleteForm={resetAthleteForm}
          backupImportInputRef={backupImportInputRef}
          onDatabaseImport={importDatabase}
          onLoadSampleData={loadSampleData}
          importPreview={importPreview}
          isImportPreviewOpen={isImportPreviewOpen}
          isImportingBackup={isImportingBackup}
          onConfirmImportPreview={confirmImportPreview}
          onCloseImportPreview={closeImportPreview}
        />
      ) : (
        children
      )}
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
    editingAscentId,
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
    status,
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
    status,
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
    cancelAscentEdit,
    editAscent,
    editingAscentId,
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
    cancelAscentEdit,
    editAscent,
    editingAscentId,
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
    loadSampleData,
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
    status,
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
    loadSampleData,
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
    status,
    teamTrainings,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
    assignAthleteSection,
    settingsTab,
  };
}
