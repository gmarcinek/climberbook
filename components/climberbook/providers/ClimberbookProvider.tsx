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
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  createUserProfileDraft,
  createWeightEntryDraft,
  estimateTrainingCalories,
  formatWeightInput,
  getLatestTrainingWeight,
  getLatestWeightEntry,
  getNearestWeightEntry,
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
  addAscents,
  addAthlete,
  addFacility,
  addSection,
  addTraining,
  addWeightEntry,
  assignAthleteToSection,
  deleteAthlete,
  deleteAscentsByImportSource,
  deleteFacility,
  deleteSection,
  deleteTraining,
  deleteWeightEntry,
  exportDatabaseBackup,
  exportFullDatabaseBackup,
  getUserProfile,
  inspectDatabaseBackup,
  importDatabaseBackup,
  listAllTrainings,
  listAllWeightEntries,
  listAscents,
  listAthletes,
  listFacilities,
  listSections,
  listTrainings,
  listWeightEntries,
  saveUserProfile,
  updateAscent,
  updateAthlete,
  updateTraining,
  updateWeightEntry,
  type AscentRecord,
  type AthleteRecord,
  type DatabaseImportPreview,
  type ClimberbookFullDatabaseBackup,
  type FacilityRecord,
  type SectionRecord,
  type TrainingRecord,
  type TrainingSurface,
  type UserSex,
  type WeightEntryRecord,
} from "@/lib/climbs-db";
import { parse8aNuCsv } from "@/lib/8a-nu-csv";
import type { CsvSkippedAscentRow } from "@/lib/8a-nu-csv";
import { createSampleBackupData } from "@/lib/sample-backup";
import {
  assignExperimentalAthleteToSection,
  createExperimentalAscent,
  createExperimentalAthlete,
  createExperimentalFacility,
  createExperimentalSection,
  createExperimentalTraining,
  createExperimentalWeightEntry,
  deleteExperimentalAccount,
  deleteExperimentalAthlete,
  deleteExperimentalFacility,
  deleteExperimentalSection,
  deleteExperimentalTraining,
  deleteExperimentalWeightEntry,
  getExperimentalPostgresSnapshot,
  importExperimentalPostgresBackup,
  isExperimentalPostgresUiEnabled,
  saveExperimentalProfile,
  updateExperimentalAscent,
  updateExperimentalAthlete,
  updateExperimentalTraining,
  updateExperimentalWeightEntryRecord,
} from "@/lib/experimental-postgres-ui";

export type AscentDraft = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  style: string;
  notes: string;
};
export type AscentCsvImportPreview = {
  fileName: string;
  source: "8a.nu";
  ascents: Array<Omit<AscentRecord, "id" | "createdAt" | "athleteId">>;
  optionalAscents: Array<Omit<AscentRecord, "id" | "createdAt" | "athleteId">>;
  skippedRows: number;
  skippedAscentRows: CsvSkippedAscentRow[];
  skippedGoProjects: number;
  skippedTopropes: number;
  skippedOtherStyles: number;
  duplicateCount: number;
  firstDate: string;
  lastDate: string;
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
export type SettingsTab = "profil" | "zespol" | "obiekty" | "zaawansowane";

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
  style: "",
  notes: "",
});
function getAscentImportFingerprint(
  ascent: Pick<
    AscentRecord,
    "date" | "source" | "routeName" | "suggestedGrade"
  >,
) {
  return [
    ascent.date,
    ascent.source,
    ascent.routeName.trim().toLocaleLowerCase("pl-PL"),
    ascent.suggestedGrade.trim().toLocaleLowerCase("pl-PL"),
  ].join("\u0001");
}
function countDuplicateAscents(
  existingAscents: AscentRecord[],
  incomingAscents: Array<Omit<AscentRecord, "id" | "createdAt" | "athleteId">>,
) {
  const knownFingerprints = new Set(
    existingAscents.map(getAscentImportFingerprint),
  );

  return incomingAscents.reduce((duplicateCount, ascent) => {
    const fingerprint = getAscentImportFingerprint(ascent);

    if (knownFingerprints.has(fingerprint)) {
      return duplicateCount + 1;
    }

    knownFingerprints.add(fingerprint);
    return duplicateCount;
  }, 0);
}
const createPullUpProtocolSet = () => ({
  sets: "1",
  repetitions: "1",
  isOneRepMax: "nie" as const,
  loadDeloadKg: "0",
});
const createHangboardProtocolSet = () => ({
  sets: "1",
  mode: "hangs" as const,
  usesRpm: "nie" as const,
  hangSeconds: "7",
  restSeconds: "3",
  repetitions: "6",
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
        spraywallIntensity: "medium",
      },
      wellbeing: "",
      surfaces: [],
      facilityName: "",
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
      bodyWeightKg: "",
      ageYears: "",
      caloriesBurned: String(training.caloriesBurned),
      caloriesMode: "manual",
      difficultyNotes: training.difficultyNotes,
      difficultyBySurface: training.difficultyBySurface ?? {},
      protocol: {
        pullUp: asProtocolSetList(training.protocol?.pullUp).map(
          (protocolSet) => ({
            sets: String(protocolSet.sets),
            repetitions: String(protocolSet.repetitions ?? 1),
            isOneRepMax: protocolSet.isOneRepMax ? "tak" : "nie",
            loadDeloadKg: String(protocolSet.loadDeloadKg),
          }),
        ),
        hangboard: asProtocolSetList(training.protocol?.hangboard).map(
          (protocolSet) => ({
            sets: String(protocolSet.sets),
            mode: protocolSet.mode ?? "hangs",
            usesRpm: protocolSet.usesRpm ? "tak" : "nie",
            hangSeconds: String(protocolSet.hangSeconds ?? 7),
            restSeconds: String(protocolSet.restSeconds ?? 3),
            repetitions: String(protocolSet.repetitions ?? 6),
            loadDeloadKg: String(protocolSet.loadDeloadKg),
            edgeDepthMm: String(protocolSet.edgeDepthMm),
          }),
        ),
        spraywallIntensity: training.protocol?.spraywallIntensity ?? "medium",
      },
      wellbeing: training.wellbeing,
      surfaces: training.surfaces,
      facilityName: training.facilityName ?? "",
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
  facilities: FacilityRecord[];
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
  newFacilityName: string;
  setNewFacilityName: Dispatch<SetStateAction<string>>;
  profileDraft: UserProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<UserProfileDraft>>;
  weightEntryDraft: WeightEntryDraft;
  setWeightEntryDraft: Dispatch<SetStateAction<WeightEntryDraft>>;
  trainingDraft: TrainingDraftValues;
  editingTrainingId: string | null;
  editingAscentId: number | null;
  ascentDraft: AscentDraft;
  setAscentDraft: Dispatch<SetStateAction<AscentDraft>>;
  ascentCsvImportPreview: AscentCsvImportPreview | null;
  isImportingAscentsCsv: boolean;
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
  submitTraining: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  editTraining: (training: TrainingRecord) => void;
  deleteTraining: (training: TrainingRecord) => Promise<void>;
  submitWeightEntry: (
    event: FormEvent<HTMLFormElement>,
    entryToUpdate?: WeightEntryRecord | null,
  ) => Promise<boolean>;
  deleteWeightEntry: (entry: WeightEntryRecord) => Promise<void>;
  submitAscent: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  previewAscentsCsv: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  confirmAscentsCsvImport: (
    includeOtherStyles: boolean,
    overwriteDuplicates: boolean,
  ) => Promise<void>;
  closeAscentsCsvImportPreview: () => void;
  delete8aNuAscents: () => Promise<void>;
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
  addFacility: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteFacility: (facility: FacilityRecord) => Promise<void>;
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
  const router = useRouter();
  const pathname = usePathname();
  const today = formatDateIso(new Date());
  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("climberbook:activeAthleteId"),
  );
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
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
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(
    null,
  );
  const [editingAscentId, setEditingAscentId] = useState<number | null>(null);
  const [ascentDraft, setAscentDraft] = useState<AscentDraft>(emptyAscentDraft);
  const [ascentCsvImportPreview, setAscentCsvImportPreview] =
    useState<AscentCsvImportPreview | null>(null);
  const [isImportingAscentsCsv, setIsImportingAscentsCsv] = useState(false);
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
  const [newFacilityName, setNewFacilityName] = useState("");
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
    if (isExperimentalPostgresUiEnabled()) {
      const snapshot = await getExperimentalPostgresSnapshot();
      const athleteId = snapshot.athletes.some(
        (athlete) => athlete.id === activeAthleteId,
      )
        ? activeAthleteId
        : (snapshot.athletes[0]?.id ?? null);

      setIsDatabaseEmpty(snapshot.athletes.length === 0);
      setAthletes(snapshot.athletes);
      setSections(snapshot.sections);
      setFacilities(snapshot.facilities);
      setTeamTrainings(snapshot.trainings);
      setTeamWeightEntries(snapshot.weightEntries);

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

      const trainingItems = snapshot.trainings.filter(
        (training) => training.athleteId === athleteId,
      );
      const ascentItems = snapshot.ascents.filter(
        (ascent) => ascent.athleteId === athleteId,
      );
      const weightItems = snapshot.weightEntries.filter(
        (entry) => entry.athleteId === athleteId,
      );
      const profileRecord = snapshot.profiles.find(
        (profile) => profile.athleteId === athleteId,
      );

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
            profileRecord?.weightKg ??
            null,
        ),
      );
      return;
    }

    const [athleteItems, allTrainingItems, allWeightItems, sectionItems, facilityItems] =
      await Promise.all([
        listAthletes(),
        listAllTrainings(),
        listAllWeightEntries(),
        listSections(),
        listFacilities(),
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
    setFacilities(facilityItems);
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
    if (isExperimentalPostgresUiEnabled() && pathname === "/login") return;

    void refreshData().catch((error) => {
      console.error("Nie udało się odświeżyć danych Climberbook.", error);
      setStatus(
        isExperimentalPostgresUiEnabled()
          ? "Nie udało się odświeżyć danych konta."
          : "Nie udało się otworzyć IndexedDB w tej przeglądarce.",
      );
    });
  }, [activeAthleteId, pathname]);
  useEffect(() => {
    if (activeAthleteId)
      window.localStorage.setItem(
        "climberbook:activeAthleteId",
        activeAthleteId,
      );
    else window.localStorage.removeItem("climberbook:activeAthleteId");
  }, [activeAthleteId]);
  function getTrainingWeight(date: string) {
    return (
      getNearestWeightEntry(weightEntries, date)?.weightKg ??
      parseWeightInput(profileDraft.weightKg) ??
      getLatestTrainingWeight(trainings)
    );
  }
  function resetTrainingEditor(date = selectedDate ?? today) {
    setEditingTrainingId(null);
    setTrainingDraftState(
      createTrainingDraft(date, {
        birthDate: profileDraft.birthDate,
        defaultWeightKg: getTrainingWeight(date),
      }),
    );
  }
  function setTrainingDraft(draft: TrainingDraftValues) {
    setTrainingDraftState(
      normalizeTrainingDraft(
        draft,
        profileDraft.birthDate,
        formatWeightInput(getTrainingWeight(draft.date)),
      ),
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
    const bodyWeightKg = getTrainingWeight(trainingDraft.date);

    if (
      !activeAthleteId ||
      (!trainingDraft.surfaces.length && !customSessionType)
    ) {
      setStatus(
        !activeAthleteId
          ? "Najpierw dodaj i wybierz zawodnika."
          : "Wybierz co najmniej jeden rodzaj sesji lub wpisz własny typ w polu Inne.",
      );
      return false;
    }
    const payload = {
      date: trainingDraft.date,
      time: trainingDraft.time,
      durationMinutes: Number(trainingDraft.durationMinutes),
      ageYears: Number(trainingDraft.ageYears || 0),
      caloriesBurned:
        trainingDraft.caloriesBurned === ""
          ? Number(
              estimateTrainingCalories({
                ...trainingDraft,
                bodyWeightKg: bodyWeightKg?.toString() ?? "",
                attemptsCount: "0",
              }) || 0,
            )
          : Number(trainingDraft.caloriesBurned),
      attemptsCount: 0,
      difficultyNotes: Object.values(trainingDraft.difficultyBySurface)
        .map((grades) => grades?.trim())
        .filter(Boolean)
        .join(", "),
      difficultyBySurface: trainingDraft.difficultyBySurface,
      protocol: {
        ...(trainingDraft.surfaces.includes("drazek") && {
          pullUp: trainingDraft.protocol.pullUp.map((protocolSet) => ({
            sets: Number(protocolSet.sets || 0),
            repetitions: Number(protocolSet.repetitions || 0),
            isOneRepMax: protocolSet.isOneRepMax === "tak",
            loadDeloadKg: Number(protocolSet.loadDeloadKg),
          })),
        }),
        ...(trainingDraft.surfaces.includes("chwytotablica") && {
          hangboard: trainingDraft.protocol.hangboard.map((protocolSet) => ({
            sets: Number(protocolSet.sets || 0),
            mode: protocolSet.mode,
            usesRpm: protocolSet.usesRpm === "tak",
            ...(protocolSet.mode === "intervals" && {
              hangSeconds: Number(protocolSet.hangSeconds || 0),
              restSeconds: Number(protocolSet.restSeconds || 0),
              repetitions: Number(protocolSet.repetitions || 0),
            }),
            loadDeloadKg: Number(protocolSet.loadDeloadKg),
            edgeDepthMm: Number(protocolSet.edgeDepthMm || 0),
          })),
        }),
        ...(trainingDraft.surfaces.includes("spraywall") && {
          spraywallIntensity: trainingDraft.protocol.spraywallIntensity,
        }),
      },
      wellbeing: trainingDraft.wellbeing,
      surfaces: trainingDraft.surfaces,
      facilityName: trainingDraft.facilityName.trim() || undefined,
      customSessionType,
      notes: trainingDraft.notes,
    };
    try {
      const current = trainings.find(
        (training) => training.id === editingTrainingId,
      );
      if (editingTrainingId !== null && !current)
        throw new Error("Nie znaleziono treningu do edycji.");
      if (current) {
        if (isExperimentalPostgresUiEnabled())
          await updateExperimentalTraining({ ...current, ...payload });
        else await updateTraining({ ...current, ...payload });
      } else if (isExperimentalPostgresUiEnabled()) {
        await createExperimentalTraining({ ...payload, athleteId: activeAthleteId });
      } else {
        await addTraining({ ...payload, athleteId: activeAthleteId });
      }
      await refreshData();
      resetTrainingSelection();
      return true;
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Zapis treningu nie powiódł się.",
      );
      return false;
    }
  }
  async function deleteTrainingAction(training: TrainingRecord) {
    if (
      !training.id ||
      !window.confirm("Usunąć ten trening? Tej operacji nie można cofnąć.")
    )
      return;
    if (isExperimentalPostgresUiEnabled())
      await deleteExperimentalTraining(training.id);
    else await deleteTraining(training.id);
    await refreshData();
    if (editingTrainingId === training.id) resetTrainingEditor();
  }
  async function submitWeightEntry(
    event: FormEvent<HTMLFormElement>,
    entryToUpdate?: WeightEntryRecord | null,
  ) {
    event.preventDefault();
    const weightKg = parseWeightInput(weightEntryDraft.weightKg);
    if (
      !activeAthleteId ||
      !weightEntryDraft.date ||
      weightKg === null ||
      weightKg <= 0
    )
      return false;
    if (entryToUpdate?.id !== undefined) {
      const input: WeightEntryRecord = {
        ...entryToUpdate,
        id: entryToUpdate.id,
        date: weightEntryDraft.date,
        time: weightEntryDraft.time,
        weightKg,
      };
      if (isExperimentalPostgresUiEnabled())
        await updateExperimentalWeightEntryRecord(input);
      else await updateWeightEntry(input);
    } else {
      const input = {
        athleteId: activeAthleteId,
        date: weightEntryDraft.date,
        time: weightEntryDraft.time,
        weightKg,
      };
      if (isExperimentalPostgresUiEnabled())
        await createExperimentalWeightEntry(input);
      else await addWeightEntry(input);
    }
    await refreshData();
    setWeightEntryDraft(createWeightEntryDraft(today, weightKg));
    return true;
  }
  async function deleteWeightEntryAction(entry: WeightEntryRecord) {
    if (entry.id === undefined) return;

    if (isExperimentalPostgresUiEnabled())
      await deleteExperimentalWeightEntry(entry.id);
    else await deleteWeightEntry(entry.id);
    await refreshData();
  }
  async function submitAscent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAthleteId) return;
    if (editingAscentId !== null) {
      const input = {
        id: editingAscentId,
        athleteId: activeAthleteId,
        ...ascentDraft,
      };
      if (isExperimentalPostgresUiEnabled()) await updateExperimentalAscent(input);
      else await updateAscent(input);
    } else {
      const input = { ...ascentDraft, athleteId: activeAthleteId };
      if (isExperimentalPostgresUiEnabled()) await createExperimentalAscent(input);
      else await addAscent(input);
    }
    await refreshData();
    setEditingAscentId(null);
    setAscentDraft(emptyAscentDraft());
  }
  async function previewAscentsCsv(event: ChangeEvent<HTMLInputElement>) {
    if (isExperimentalPostgresUiEnabled()) {
      setStatus("Import CSV nie jest jeszcze dostępny w eksperymentalnym trybie PostgreSQL.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !activeAthleteId) return;

    try {
      const {
        ascents: importedAscents,
        optionalAscents,
        skippedRows,
        skippedAscentRows,
        skippedGoProjects,
        skippedTopropes,
        skippedOtherStyles,
      } = parse8aNuCsv(await file.text());

      const availableAscents = [...importedAscents, ...optionalAscents];

      if (!availableAscents.length) {
        showSuccessToast("Nie znaleziono poprawnych przejść do importu.");
        return;
      }

      const existingAscents = await listAscents(activeAthleteId);
      const dates = availableAscents.map((ascent) => ascent.date).sort();
      setAscentCsvImportPreview({
        fileName: file.name,
        source: "8a.nu",
        ascents: importedAscents,
        optionalAscents,
        skippedRows,
        skippedAscentRows,
        skippedGoProjects,
        skippedTopropes,
        skippedOtherStyles,
        duplicateCount: countDuplicateAscents(
          existingAscents,
          availableAscents,
        ),
        firstDate: dates[0],
        lastDate: dates.at(-1) ?? dates[0],
      });
    } catch (error) {
      showSuccessToast(
        error instanceof Error ? error.message : "Import CSV nie powiódł się.",
      );
    }
  }
  async function confirmAscentsCsvImport(
    includeOtherStyles: boolean,
    overwriteDuplicates: boolean,
  ) {
    if (isExperimentalPostgresUiEnabled()) {
      setStatus("Import CSV nie jest jeszcze dostępny w eksperymentalnym trybie PostgreSQL.");
      return;
    }
    if (!activeAthleteId || !ascentCsvImportPreview) return;

    const ascentsToImport = [
      ...ascentCsvImportPreview.ascents,
      ...(includeOtherStyles ? ascentCsvImportPreview.optionalAscents : []),
    ];
    setIsImportingAscentsCsv(true);
    try {
      const importedAscents = await listAscents(activeAthleteId);
      const existingAscentsByFingerprint = new Map(
        importedAscents.map((ascent) => [
          getAscentImportFingerprint(ascent),
          ascent,
        ]),
      );
      const importedFingerprints = new Set<string>();
      const uniqueAscents: typeof ascentsToImport = [];
      const ascentsToOverwrite: Array<{
        existing: AscentRecord;
        incoming: (typeof ascentsToImport)[number];
      }> = [];
      let duplicateCount = 0;

      ascentsToImport.forEach((ascent) => {
        const fingerprint = getAscentImportFingerprint(ascent);
        const existingAscent = existingAscentsByFingerprint.get(fingerprint);

        if (existingAscent) {
          duplicateCount += 1;

          if (overwriteDuplicates && existingAscent.id !== undefined) {
            ascentsToOverwrite.push({
              existing: existingAscent,
              incoming: ascent,
            });
          }

          return;
        }

        if (importedFingerprints.has(fingerprint)) {
          duplicateCount += 1;
          return;
        }

        importedFingerprints.add(fingerprint);
        uniqueAscents.push(ascent);
      });

      await addAscents(
        uniqueAscents.map((ascent) => ({
          ...ascent,
          athleteId: activeAthleteId,
        })),
      );
      await Promise.all(
        ascentsToOverwrite.map(({ existing, incoming }) =>
          updateAscent({
            ...incoming,
            id: existing.id!,
            athleteId: activeAthleteId,
          }),
        ),
      );
      await refreshData();
      const skippedCount =
        ascentCsvImportPreview.skippedRows -
        (includeOtherStyles
          ? ascentCsvImportPreview.optionalAscents.length
          : 0);
      showSuccessToast(
        `Zaimportowano ${uniqueAscents.length} przejść z 8a.nu${skippedCount ? `, pominięto ${skippedCount} rekordów` : ""}.`,
      );
      setAscentCsvImportPreview(null);
    } catch (error) {
      showSuccessToast(
        error instanceof Error ? error.message : "Import CSV nie powiódł się.",
      );
    } finally {
      setIsImportingAscentsCsv(false);
    }
  }
  function closeAscentsCsvImportPreview() {
    setAscentCsvImportPreview(null);
  }
  async function delete8aNuAscents() {
    if (!activeAthleteId) return;

    if (isExperimentalPostgresUiEnabled()) {
      setStatus("Usuwanie importu 8a.nu nie jest jeszcze dostępne w eksperymentalnym trybie PostgreSQL.");
      return;
    }
    await deleteAscentsByImportSource(activeAthleteId, "8a.nu");
    await refreshData();
    showSuccessToast("Usunięto przejścia zaimportowane z 8a.nu.");
  }
  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAthleteId) return;
    const weightKg = parseWeightInput(profileDraft.weightKg);
    const profileInput = {
      key: `athlete:${activeAthleteId}`,
      athleteId: activeAthleteId,
      birthDate: profileDraft.birthDate,
      sex: profileDraft.sex,
      heightCm: parseHeightInput(profileDraft.heightCm),
      weightKg,
    };
    if (isExperimentalPostgresUiEnabled())
      await saveExperimentalProfile(profileInput);
    else await saveUserProfile(profileInput);
    if (
      weightKg &&
      (!getLatestWeightEntry(weightEntries) ||
        getLatestWeightEntry(weightEntries)?.weightKg !== weightKg)
    ) {
      const weightEntryInput = {
        athleteId: activeAthleteId,
        date: today,
        time: "09:00",
        weightKg,
      };
      if (isExperimentalPostgresUiEnabled())
        await createExperimentalWeightEntry(weightEntryInput);
      else await addWeightEntry(weightEntryInput);
    }
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
    if (isExperimentalPostgresUiEnabled()) {
      setStatus("Eksport backupu nie jest jeszcze dostępny w eksperymentalnym trybie PostgreSQL.");
      return;
    }
    const exportTime = new Date()
      .toTimeString()
      .slice(0, 8)
      .replaceAll(":", "-");

    await download(
      await exportFullDatabaseBackup(),
      `climberbook-calosciowy-${today}-${exportTime}.json`,
    );
    showSuccessToast("Eksport bazy zakończony sukcesem.");
  }
  async function exportAthlete(athlete: AthleteRecord) {
    if (isExperimentalPostgresUiEnabled()) {
      setStatus("Eksport backupu nie jest jeszcze dostępny w eksperymentalnym trybie PostgreSQL.");
      return;
    }
    await download(
      await exportDatabaseBackup(athlete.id),
      `climberbook-${athlete.name || "zawodnik"}-${today}.json`,
    );
    showSuccessToast(`Eksport zawodnika ${athlete.name} zakończony sukcesem.`);
  }
  async function importFile(file: File) {
    if (isExperimentalPostgresUiEnabled()) {
      const backup: unknown = JSON.parse(await file.text());
      if (
        !backup ||
        typeof backup !== "object" ||
        (backup as { formatVersion?: unknown }).formatVersion !== 3
      ) {
        setStatus("Import do PostgreSQL wymaga pełnego backupu bazy w formacie 3.");
        return;
      }
      await importExperimentalPostgresBackup(
        backup as ClimberbookFullDatabaseBackup,
      );
      await refreshData();
      showSuccessToast("Import backupu do PostgreSQL zakończony sukcesem.");
      return;
    }
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
      router.push("/trening");
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
      if (isExperimentalPostgresUiEnabled())
        await createExperimentalSection(newSectionName.trim());
      else await addSection(newSectionName.trim());
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
      if (isExperimentalPostgresUiEnabled())
        await deleteExperimentalSection(section.id);
      else await deleteSection(section.id);
      await refreshData();
    }
  }
  async function addFacilityAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newFacilityName.trim()) {
      if (isExperimentalPostgresUiEnabled())
        await createExperimentalFacility(newFacilityName.trim());
      else await addFacility(newFacilityName.trim());
      setNewFacilityName("");
      await refreshData();
    }
  }
  async function deleteFacilityAction(facility: FacilityRecord) {
    if (window.confirm(`Usunąć obiekt ${facility.name}?`)) {
      if (isExperimentalPostgresUiEnabled())
        await deleteExperimentalFacility(facility.id);
      else await deleteFacility(facility.id);
      await refreshData();
    }
  }
  async function assignAthleteSection(
    athlete: AthleteRecord,
    sectionId: string,
  ) {
    if (isExperimentalPostgresUiEnabled())
      await assignExperimentalAthleteToSection(athlete.id, sectionId || null);
    else await assignAthleteToSection(athlete.id, sectionId || null);
    await refreshData();
  }
  async function startAthleteEdit(athlete: AthleteRecord) {
    const profile = isExperimentalPostgresUiEnabled()
      ? (await getExperimentalPostgresSnapshot()).profiles.find(
          (candidate) => candidate.athleteId === athlete.id,
        )
      : await getUserProfile(athlete.id);
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
      if (isExperimentalPostgresUiEnabled())
        await updateExperimentalAthlete(athleteFormId, identity);
      else await updateAthlete(athleteFormId, identity);
      const profileInput = {
        key: `athlete:${athleteFormId}`,
        athleteId: athleteFormId,
        ...profile,
      };
      if (isExperimentalPostgresUiEnabled())
        await saveExperimentalProfile(profileInput);
      else await saveUserProfile(profileInput);
      await refreshData();
    } else {
      const athlete = isExperimentalPostgresUiEnabled()
        ? await createExperimentalAthlete(identity)
        : await addAthlete(identity);
      const profileInput = {
        key: `athlete:${athlete.id}`,
        athleteId: athlete.id,
        ...profile,
      };
      if (isExperimentalPostgresUiEnabled())
        await saveExperimentalProfile(profileInput);
      else await saveUserProfile(profileInput);
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
      if (isExperimentalPostgresUiEnabled())
        await deleteExperimentalAthlete(athlete.id);
      else await deleteAthlete(athlete.id);
      if (activeAthleteId === athlete.id) setActiveAthleteId(null);
      else await refreshData();
    }
  }
  async function deleteDatabase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (databaseDeleteConfirmation !== "usuń konto") return;
    if (!isExperimentalPostgresUiEnabled()) {
      setStatus("Usuwanie konta wymaga włączonego trybu PostgreSQL.");
      return;
    }

    try {
      await deleteExperimentalAccount();
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Nie udało się usunąć konta.",
      );
    }
  }
  const value: ClimberbookContextValue = {
    today,
    athletes,
    activeAthleteId,
    setActiveAthleteId,
    sections,
    facilities,
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
    newFacilityName,
    setNewFacilityName,
    profileDraft,
    setProfileDraft,
    weightEntryDraft,
    setWeightEntryDraft,
    trainingDraft,
    editingTrainingId,
    editingAscentId,
    ascentDraft,
    setAscentDraft,
    ascentCsvImportPreview,
    isImportingAscentsCsv,
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
      setEditingTrainingId(training.id);
      setTrainingDraftState(
        mapTrainingToDraft(training, profileDraft.birthDate),
      );
    },
    deleteTraining: deleteTrainingAction,
    submitWeightEntry,
    deleteWeightEntry: deleteWeightEntryAction,
    submitAscent,
    previewAscentsCsv,
    confirmAscentsCsvImport,
    closeAscentsCsvImportPreview,
    delete8aNuAscents,
    editAscent: (ascent) => {
      setEditingAscentId(ascent.id ?? null);
      setAscentDraft({
        date: ascent.date,
        source: ascent.source,
        routeName: ascent.routeName,
        suggestedGrade: ascent.suggestedGrade,
        subjectiveGrade: ascent.subjectiveGrade,
        style: ascent.style ?? "",
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
    addFacility: addFacilityAction,
    deleteFacility: deleteFacilityAction,
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
    deleteWeightEntry,
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
    deleteWeightEntry,
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
    ascentCsvImportPreview,
    isImportingAscentsCsv,
    cancelAscentEdit,
    editAscent,
    editingAscentId,
    profileDraft,
    selectedDate,
    setAscentDraft,
    submitAscent,
    previewAscentsCsv,
    confirmAscentsCsvImport,
    closeAscentsCsvImportPreview,
    delete8aNuAscents,
    today,
    trainingRangeStart,
    trainings,
    weightEntries,
  } = useClimberbook();
  return {
    ascents,
    ascentDraft,
    ascentCsvImportPreview,
    isImportingAscentsCsv,
    cancelAscentEdit,
    editAscent,
    editingAscentId,
    profileDraft,
    selectedDate,
    setAscentDraft,
    submitAscent,
    previewAscentsCsv,
    confirmAscentsCsvImport,
    closeAscentsCsvImportPreview,
    delete8aNuAscents,
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
    addFacility,
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
    deleteFacility,
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
    facilities,
    newFacilityName,
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
    setNewFacilityName,
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
    addFacility,
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
    deleteFacility,
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
    facilities,
    newFacilityName,
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
    setNewFacilityName,
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
